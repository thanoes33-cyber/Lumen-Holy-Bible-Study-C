import React, { useState, useRef, useEffect } from 'react';
import { PrayerRequest } from '../types';
import { PlusIcon, CheckIcon, TrashIcon, XIcon, HeartIcon, SearchIcon, SparklesIcon, ArrowUpIcon, ArrowDownIcon, ShareIcon, MicrophoneIcon, MessageCircleIcon, BellIcon, ClockIcon } from './Icons';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface PrayerWallProps {
  userId: string;
  onPrayWithAI: (prompt: string) => void;
}

export const PrayerWall: React.FC<PrayerWallProps> = ({ 
  userId,
  onPrayWithAI
}) => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [recordingField, setRecordingField] = useState<'title' | 'content' | 'description' | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load Data
  useEffect(() => {
    if (!userId) return;

    // Guest Fallback
    if (userId === 'guest-dev-user') {
        const local = localStorage.getItem('lumen_prayers');
        if (local) setPrayers(JSON.parse(local));
        setLoading(false);
        return;
    }

    if (!db) {
        setLoading(false);
        return;
    }

    // Firebase Realtime
    const q = query(collection(db, 'users', userId, 'prayers'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPrayers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PrayerRequest[];
      setPrayers(loadedPrayers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  // Helper to update local storage for guest
  const updateLocalPrayers = (newPrayers: PrayerRequest[]) => {
    setPrayers(newPrayers);
    localStorage.setItem('lumen_prayers', JSON.stringify(newPrayers));
  };

  const submitPrayer = async (withAI: boolean) => {
    if (!newTitle.trim() || !newContent.trim()) return;

    let reminderTime = undefined;
    if (enableReminder && reminderDate) {
        reminderTime = new Date(reminderDate).getTime();
    }

    const newPrayerData = {
      title: newTitle,
      content: newContent,
      description: newDescription,
      date: Date.now(),
      isAnswered: false,
      reminderTime: reminderTime
    };

    try {
      if (userId === 'guest-dev-user') {
          const newPrayer = { ...newPrayerData, id: Date.now().toString() };
          updateLocalPrayers([newPrayer, ...prayers]);
      } else if (db) {
          await addDoc(collection(db, 'users', userId, 'prayers'), newPrayerData);
      }
      
      if (withAI) {
        const prompt = `I have a prayer request. Title: "${newTitle}". Details: "${newContent}". ${newDescription ? `Additional Context: "${newDescription}".` : ''} Please lead me in a personalized prayer for this specific situation, mentioning the names and details I provided.`;
        onPrayWithAI(prompt);
      }

      setNewTitle('');
      setNewContent('');
      setNewDescription('');
      setEnableReminder(false);
      setReminderDate('');
      setShowForm(false);
    } catch (e) {
      console.error("Error adding prayer", e);
    }
  };

  const handleToggleAnswered = async (id: string, currentStatus: boolean) => {
    if (userId === 'guest-dev-user') {
        const updated = prayers.map(p => p.id === id ? { ...p, isAnswered: !currentStatus } : p);
        updateLocalPrayers(updated);
    } else if (db) {
        const prayerRef = doc(db, 'users', userId, 'prayers', id);
        await updateDoc(prayerRef, { isAnswered: !currentStatus });
    }
  };

  const handleDeletePrayer = async (id: string) => {
    if (window.confirm("Delete this prayer request?")) {
      if (userId === 'guest-dev-user') {
          const updated = prayers.filter(p => p.id !== id);
          updateLocalPrayers(updated);
      } else if (db) {
          await deleteDoc(doc(db, 'users', userId, 'prayers', id));
      }
    }
  };

  const toggleRecording = (field: 'title' | 'content' | 'description') => {
    if (recordingField === field) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setRecordingField(null);
      return;
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setRecordingField(field);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (field === 'title') setNewTitle(prev => (prev ? prev + ' ' : '') + transcript);
      else if (field === 'content') setNewContent(prev => (prev ? prev + ' ' : '') + transcript);
      else if (field === 'description') setNewDescription(prev => (prev ? prev + ' ' : '') + transcript);
    };
    recognition.onend = () => setRecordingField(null);
    recognition.start();
  };

  const filteredPrayers = prayers
    .filter(prayer => 
      prayer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prayer.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => sortOrder === 'desc' ? b.date - a.date : a.date - b.date);

  return (
    <div className="flex flex-col h-full relative bg-slate-50">
       {/* Header */}
       <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
           <span className="text-brand-800 font-display font-semibold tracking-wide text-lg">Prayer Wall</span>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-full shadow-md hover:bg-brand-700 transition-all text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Prayer</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : (
          <>
            <div className="max-w-4xl mx-auto mb-6 flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-brand-100 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Search prayers..."
                />
              </div>
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-100 rounded-xl text-slate-600 font-medium hover:bg-brand-50"
              >
                {sortOrder === 'desc' ? <ArrowDownIcon className="w-4 h-4" /> : <ArrowUpIcon className="w-4 h-4" />}
              </button>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrayers.map(prayer => (
                  <div 
                    key={prayer.id}
                    className={`group relative flex flex-col p-5 rounded-2xl border transition-all duration-200 ${
                        prayer.isAnswered 
                        ? 'bg-slate-50 border-slate-200 opacity-75' 
                        : 'bg-white border-brand-100 shadow-sm hover:shadow-md'
                    }`}
                  >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-serif font-semibold text-lg ${prayer.isAnswered ? 'text-slate-400 line-through' : 'text-brand-900'}`}>
                            {prayer.title}
                        </h3>
                        <div className="flex space-x-1">
                            <button 
                              onClick={() => handleToggleAnswered(prayer.id, prayer.isAnswered)}
                              className={`p-1.5 rounded-full transition-colors ${prayer.isAnswered ? 'bg-green-100 text-green-600' : 'hover:bg-slate-100 text-slate-400'}`}
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeletePrayer(prayer.id)}
                              className="p-1.5 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed mb-3 text-slate-600">{prayer.content}</p>
                      
                      {prayer.reminderTime && prayer.reminderTime > Date.now() && (
                          <div className="mb-3 flex items-center text-xs font-semibold text-blue-500 bg-blue-50 w-fit px-2 py-1 rounded-md">
                              <BellIcon className="w-3 h-3 mr-1" />
                              <span>Reminder: {new Date(prayer.reminderTime).toLocaleString()}</span>
                          </div>
                      )}
                      
                      {prayer.description && (
                        <div className="mb-4 p-3 rounded-lg text-sm bg-brand-50/50 text-slate-600">
                          {prayer.description}
                        </div>
                      )}
                      <div className="mt-auto pt-4 border-t border-slate-50 flex flex-wrap gap-y-2 justify-between items-center">
                        <span className="text-xs text-brand-300 flex items-center"><HeartIcon className="w-3 h-3 mr-1"/>{new Date(prayer.date).toLocaleDateString()}</span>
                        {!prayer.isAnswered && (
                          <button 
                            onClick={() => onPrayWithAI(`I have a prayer request regarding "${prayer.title}". Details: "${prayer.content}". Please lead me in a personalized prayer specifically for this situation, referencing these details.`)}
                            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider hover:bg-brand-100 transition-colors border border-brand-200 shadow-sm"
                          >
                            <SparklesIcon className="w-4 h-4 text-gold-500" />
                            <span>Pray with AI</span>
                          </button>
                        )}
                      </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Add Prayer Modal */}
      {showForm && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-brand-50/50">
                  <h3 className="font-display font-semibold text-brand-800">New Prayer Request</h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
               </div>
               <form className="p-6 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Title</label>
                     <div className="relative">
                       <input 
                          type="text" 
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full px-4 py-2 pr-10 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                       />
                       <button type="button" onClick={() => toggleRecording('title')} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${recordingField === 'title' ? 'text-red-500' : 'text-slate-400'}`}><MicrophoneIcon className="w-4 h-4" /></button>
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Request</label>
                     <div className="relative">
                       <textarea 
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 pr-10 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none resize-none"
                       />
                       <button type="button" onClick={() => toggleRecording('content')} className={`absolute right-2 top-2 p-1.5 rounded-full ${recordingField === 'content' ? 'text-red-500' : 'text-slate-400'}`}><MicrophoneIcon className="w-4 h-4" /></button>
                     </div>
                  </div>
                  
                  {/* Reminder Section */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 text-slate-700 font-semibold text-sm">
                            <ClockIcon className="w-4 h-4 text-brand-500" />
                            <span>Set Reminder</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={enableReminder} onChange={(e) => setEnableReminder(e.target.checked)} />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                     </div>
                     
                     {enableReminder && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                            <input 
                                type="datetime-local" 
                                value={reminderDate}
                                onChange={(e) => setReminderDate(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-100 outline-none text-slate-600"
                            />
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">We'll notify you if the app is open.</p>
                        </div>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => submitPrayer(false)} 
                      className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Save to Wall
                    </button>
                    <button 
                      type="button"
                      onClick={() => submitPrayer(true)} 
                      className="px-4 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 shadow-lg flex items-center justify-center gap-2"
                    >
                      <SparklesIcon className="w-4 h-4 text-gold-400" />
                      <span>Save & Pray</span>
                    </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}