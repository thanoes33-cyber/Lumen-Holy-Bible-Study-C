import React, { useEffect, useState } from 'react';
import { generateDailyVerse } from '../services/geminiService';
import { DailyVerse } from '../types';
import { HeartIcon, SpeakerIcon, StopIcon, ShareIcon } from './Icons';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { ShareModal } from './ShareModal';

interface DailyVerseCardProps {
  userId: string;
}

export const DailyVerseCard: React.FC<DailyVerseCardProps> = ({ userId }) => {
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Check if current user (or guest) has this verse saved
  const checkSavedStatus = async (verseRef: string) => {
    if (!userId) return;

    if (userId === 'guest-dev-user') {
       const local = localStorage.getItem('lumen_favorites');
       if (local) {
           const favs = JSON.parse(local);
           const exists = favs.some((f: any) => f.reference === verseRef);
           setIsSaved(exists);
       }
    } else {
        if (!db) return;
        try {
          const q = query(collection(db, 'users', userId, 'favorites'), where('reference', '==', verseRef));
          const snapshot = await getDocs(q);
          setIsSaved(!snapshot.empty);
        } catch (e) {
          console.error("Error checking saved status", e);
        }
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchVerse = async () => {
      const v = await generateDailyVerse();
      if (mounted) {
        setVerse(v);
        setLoading(false);
        checkSavedStatus(v.reference);
      }
    };
    fetchVerse();
    
    // Cleanup speech on unmount
    return () => { 
        mounted = false; 
        window.speechSynthesis.cancel();
    };
  }, [userId]);

  const handleToggleSave = async () => {
    if (!verse || saving || !userId) return;
    setSaving(true);
    
    try {
        if (isSaved) {
            // Remove
            if (userId === 'guest-dev-user') {
                const local = localStorage.getItem('lumen_favorites');
                if (local) {
                    const favs = JSON.parse(local);
                    const updated = favs.filter((f: any) => f.reference !== verse.reference);
                    localStorage.setItem('lumen_favorites', JSON.stringify(updated));
                }
            } else if (db) {
                const q = query(collection(db, 'users', userId, 'favorites'), where('reference', '==', verse.reference));
                const snapshot = await getDocs(q);
                snapshot.forEach(async (d) => {
                    await deleteDoc(d.ref);
                });
            }
            setIsSaved(false);
        } else {
            // Save
            const newFav = {
                reference: verse.reference,
                text: verse.text,
                date: Date.now(),
                source: 'daily'
            };

            if (userId === 'guest-dev-user') {
                 const local = localStorage.getItem('lumen_favorites');
                 const favs = local ? JSON.parse(local) : [];
                 favs.unshift({ ...newFav, id: Date.now().toString() });
                 localStorage.setItem('lumen_favorites', JSON.stringify(favs));
            } else if (db) {
                await addDoc(collection(db, 'users', userId, 'favorites'), newFav);
            }
            setIsSaved(true);
        }
    } catch (e) {
        console.error("Error toggling favorite", e);
    } finally {
        setSaving(false);
    }
  };

  const handleSpeak = () => {
    if (!verse) return;
    
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    } else {
        window.speechSynthesis.cancel(); // Cancel any existing speech
        const utterance = new SpeechSynthesisUtterance(`${verse.text}. ${verse.reference}`);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-100 animate-pulse h-48 flex items-center justify-center" aria-label="Loading daily verse">
        <div className="text-brand-300 text-sm">Seeking wisdom...</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white to-brand-50 rounded-2xl p-8 shadow-md border border-brand-100 group hover:shadow-lg transition-shadow duration-300">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-gold-400/10 rounded-full blur-2xl"></div>
      
      {/* Actions Top Right */}
      <div className="absolute top-4 right-4 flex space-x-1 z-20">
        <button 
            onClick={handleSpeak}
            className={`p-2 rounded-full transition-colors ${isSpeaking ? 'text-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'text-slate-300 hover:text-brand-500 hover:bg-white/50'}`}
            aria-label={isSpeaking ? "Stop reading verse" : "Read verse aloud"}
            title={isSpeaking ? "Stop" : "Listen"}
        >
            {isSpeaking ? <StopIcon className="w-6 h-6 animate-pulse" /> : <SpeakerIcon className="w-6 h-6" />}
        </button>
        <button 
            onClick={() => setShowShare(true)}
            className="p-2 rounded-full text-slate-300 hover:text-brand-500 hover:bg-white/50 transition-colors"
            aria-label="Share verse"
            title="Share"
        >
            <ShareIcon className="w-6 h-6" />
        </button>
        <button 
            onClick={handleToggleSave}
            className="p-2 rounded-full hover:bg-white/50 transition-colors"
            aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
            title={isSaved ? "Remove from favorites" : "Save to favorites"}
        >
            <HeartIcon className={`w-6 h-6 transition-colors ${isSaved ? 'text-red-500' : 'text-slate-300 hover:text-red-400'}`} filled={isSaved} />
        </button>
      </div>

      <div className="relative z-10 text-center">
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-4">Verse of the Day</h3>
        <p className="font-serif text-xl md:text-2xl text-slate-800 italic leading-relaxed mb-4">
          "{verse?.text}"
        </p>
        <div className="flex justify-center items-center space-x-2">
          <div className="h-px w-8 bg-gold-400"></div>
          <p className="text-sm font-semibold text-brand-700">{verse?.reference}</p>
          <div className="h-px w-8 bg-gold-400"></div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal 
        isOpen={showShare} 
        onClose={() => setShowShare(false)} 
        text={`"${verse?.text}" - ${verse?.reference}`} 
      />
    </div>
  );
};