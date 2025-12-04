import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { 
  CalendarIcon, FireIcon, FeatherIcon, BookIcon, LeafIcon, ChevronDownIcon, CheckIcon, TrashIcon, EditIcon, SparklesIcon
} from './Icons';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Task {
  id: string;
  title: string;
  duration: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  placeholder: string;
  actionLabel?: string;
  actionPrompt?: string;
}

const TASKS: Task[] = [
  { 
    id: 'journal', 
    title: 'Spiritual Journal', 
    duration: '1 MIN', 
    icon: <FeatherIcon className="w-5 h-5" />, 
    color: 'bg-green-100 text-green-600',
    description: "Reflect on today's blessings. Write down three things you are grateful for and how you've seen God's hand in your life today.",
    placeholder: "Today I am grateful for..."
  },
  { 
    id: 'verse', 
    title: 'Your Verse', 
    duration: '3 MIN', 
    icon: <BookIcon className="w-5 h-5" />, 
    color: 'bg-blue-100 text-blue-600',
    description: "Read Psalm 23 today. Focus on the comfort of the Shepherd's presence in the valley. Meditate on His guidance.",
    placeholder: "This verse speaks to me because...",
    actionLabel: "Read Psalm 23",
    actionPrompt: "Please show me Psalm 23 and guide me through a short meditation on it."
  },
  { 
    id: 'devotional', 
    title: 'Personalized Devotional', 
    duration: '3 MIN', 
    icon: <LeafIcon className="w-5 h-5" />, 
    color: 'bg-purple-100 text-purple-600',
    description: "Today's devotional focuses on Trust. Learn how letting go of control can bring a deeper sense of peace and purpose.",
    placeholder: "My takeaway from today's devotional is...",
    actionLabel: "Start Devotional",
    actionPrompt: "Please share a short devotional about Trust and letting go of control, including a relevant scripture."
  },
];

interface JourneyProps {
  userId: string;
  onNavigateToChat: (prompt: string) => void;
}

export const Journey: React.FC<JourneyProps> = ({ userId, onNavigateToChat }) => {
  const [expandedId, setExpandedId] = useState<string | null>('journal');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Load Logs
  useEffect(() => {
    if (!userId) return;

    if (userId === 'guest-dev-user') {
        const local = localStorage.getItem('lumen_logs');
        if (local) setLogs(JSON.parse(local));
        return;
    }

    if (!db) return;

    const q = query(collection(db, 'users', userId, 'logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      setLogs(loadedLogs);
    });
    return () => unsubscribe();
  }, [userId]);

  const updateLocalLogs = (newLogs: ActivityLog[]) => {
    setLogs(newLogs);
    localStorage.setItem('lumen_logs', JSON.stringify(newLogs));
  };

  const toggleExpand = (id: string) => {
    if (activeTaskId && activeTaskId !== id) {
        setActiveTaskId(null);
        setInputContent('');
        setEditingLogId(null);
    }
    setExpandedId(expandedId === id ? null : id);
  };

  const handleStartTask = (task: Task) => {
    setActiveTaskId(task.id);
    setExpandedId(task.id);
    setInputContent('');
    setEditingLogId(null);
  };

  const handleSaveLog = async () => {
    if (!activeTaskId && !editingLogId) return;
    if (!inputContent.trim()) return;

    try {
        if (editingLogId) {
            if (userId === 'guest-dev-user') {
                const updated = logs.map(l => l.id === editingLogId ? { ...l, content: inputContent } : l);
                updateLocalLogs(updated);
            } else if (db) {
                const logRef = doc(db, 'users', userId, 'logs', editingLogId);
                await updateDoc(logRef, { content: inputContent });
            }
            setEditingLogId(null);
        } else if (activeTaskId) {
            const task = TASKS.find(t => t.id === activeTaskId);
            if (!task) return;
            const newLogData = {
                taskId: task.id,
                taskTitle: task.title,
                content: inputContent,
                timestamp: Date.now(),
            };
            
            if (userId === 'guest-dev-user') {
                const newLog = { ...newLogData, id: Date.now().toString() };
                updateLocalLogs([newLog, ...logs]);
            } else if (db) {
                await addDoc(collection(db, 'users', userId, 'logs'), newLogData);
            }
        }
        setActiveTaskId(null);
        setInputContent('');
    } catch (e) {
        console.error("Error saving log", e);
    }
  };

  const handleEditLog = (log: ActivityLog) => {
    setEditingLogId(log.id);
    setActiveTaskId(log.taskId);
    setInputContent(log.content);
    setExpandedId(log.taskId);
  };

  const handleDeleteLog = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
        if (userId === 'guest-dev-user') {
            const updated = logs.filter(l => l.id !== id);
            updateLocalLogs(updated);
        } else if (db) {
            await deleteDoc(doc(db, 'users', userId, 'logs', id));
        }
    }
  };

  // Progress Calculation
  const today = new Date().setHours(0,0,0,0);
  const todaysLogs = logs.filter(log => log.timestamp >= today);
  const uniqueTasksDone = new Set(todaysLogs.map(l => l.taskId)).size;
  const progress = Math.min(100, Math.round((uniqueTasksDone / TASKS.length) * 100));
  const currentDateDisplay = new Date().getDate();

  return (
    <div className="h-full overflow-y-auto bg-slate-50 relative">
        {/* Background Decoration */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-orange-50/50 to-transparent"></div>
       </div>

      <div className="relative z-10 max-w-md mx-auto p-6 space-y-8 pb-32">
        
        <div className="text-center pt-4 space-y-2">
          <h1 className="font-display text-4xl font-bold text-slate-800 leading-tight">Grow Spiritually</h1>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-orange-100/50 overflow-hidden border border-orange-50/50">
          <div className="p-6 pb-8 bg-gradient-to-b from-white to-orange-50/30">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-white font-display font-bold text-xl shadow-lg shadow-gold-200">S</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Today's Journey</h2>
                  <div className="text-xs text-gold-600 font-medium mt-0.5">God's Love and Grace</div>
                </div>
              </div>
              <div className="flex items-center bg-slate-800 text-white px-3 py-1.5 rounded-lg space-x-2 shadow-lg">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span className="text-gold-400 font-bold">{currentDateDisplay}</span>
              </div>
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-end px-1">
                  <span className="text-lg font-medium text-slate-800">Progress today</span>
                  <span className="text-lg font-bold text-gold-500">{progress}%</span>
               </div>
               <div className="h-2 w-full bg-orange-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gold-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {TASKS.map((task) => {
            const isCompletedToday = todaysLogs.some(l => l.taskId === task.id);
            const isWriting = activeTaskId === task.id;

            return (
                <div key={task.id} className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-md ${isCompletedToday ? 'border-green-100' : 'border-white'}`}>
                <div className={`p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r ${isCompletedToday ? 'from-green-50/50 to-white' : 'from-slate-100 to-slate-50'}`} onClick={() => toggleExpand(task.id)}>
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${task.color} bg-opacity-20 relative`}>
                            {task.icon}
                            {isCompletedToday && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"><CheckIcon className="w-2.5 h-2.5 text-white" /></div>}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-700 text-sm tracking-wide uppercase">{task.title}</span>
                            <span className="text-[10px] font-semibold text-slate-400 tracking-wider">{task.duration}</span>
                        </div>
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expandedId === task.id ? 'rotate-180' : ''}`} />
                </div>
                
                {expandedId === task.id && (
                    <div className="p-5 text-sm text-slate-600 bg-white border-t border-slate-50">
                        <p className="mb-4 leading-relaxed text-slate-500">{task.description}</p>
                        
                        {!isWriting && task.actionLabel && task.actionPrompt && (
                          <button onClick={(e) => { e.stopPropagation(); onNavigateToChat(task.actionPrompt!); }} className="w-full mb-4 py-2.5 rounded-xl border border-brand-200 text-brand-600 font-semibold text-xs uppercase tracking-wider hover:bg-brand-50 transition-colors flex items-center justify-center space-x-2">
                            <SparklesIcon className="w-4 h-4 text-gold-400" />
                            <span>{task.actionLabel}</span>
                          </button>
                        )}

                        {isWriting ? (
                            <div className="space-y-3 animate-in fade-in duration-300">
                                <textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} placeholder={task.placeholder} rows={4} className="w-full p-3 rounded-xl border border-brand-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none bg-brand-50/30 resize-none" autoFocus />
                                <div className="flex space-x-2">
                                    <button onClick={() => { setActiveTaskId(null); setEditingLogId(null); setInputContent(''); }} className="flex-1 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-medium text-xs uppercase tracking-wider hover:bg-slate-50">Cancel</button>
                                    <button onClick={handleSaveLog} disabled={!inputContent.trim()} className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl font-medium text-xs uppercase tracking-wider hover:bg-brand-700 disabled:opacity-50">Save Entry</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleStartTask(task); }} className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${isCompletedToday ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
                                {isCompletedToday ? 'Add Another Entry' : 'Write Reflection'}
                            </button>
                        )}
                    </div>
                )}
                </div>
            );
          })}
        </div>

        {logs.length > 0 && (
            <div className="pt-6 border-t border-slate-200/60">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pl-1">Recent Activity</h3>
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 group relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-brand-500 uppercase tracking-wide px-2 py-0.5 bg-brand-50 rounded-full border border-brand-100">{log.taskTitle}</span>
                                    <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                                </div>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditLog(log)} className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg"><EditIcon className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><TrashIcon className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-serif italic">"{log.content}"</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};