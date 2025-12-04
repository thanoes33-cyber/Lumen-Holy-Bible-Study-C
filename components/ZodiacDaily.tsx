import React, { useState, useEffect } from 'react';
import { StarIcon, CalendarIcon, EditIcon } from './Icons';
import { generateHoroscope } from '../services/geminiService';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ZodiacDailyProps {
  userId: string;
}

const getZodiacSign = (day: number, month: number): string => {
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  return "Capricorn";
};

export const ZodiacDaily: React.FC<ZodiacDailyProps> = ({ userId }) => {
  const [dob, setDob] = useState<string>('');
  const [sign, setSign] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [savingDob, setSavingDob] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      if (!userId) {
        setLoading(false);
        return;
      }

      let dateOfBirth = '';

      if (userId === 'guest-dev-user') {
        const local = localStorage.getItem('lumen_user_profile');
        if (local) {
          const parsed = JSON.parse(local);
          dateOfBirth = parsed.dateOfBirth || '';
        }
      } else if (db) {
        try {
          const docRef = doc(db, 'users', userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            dateOfBirth = docSnap.data().dateOfBirth || '';
          }
        } catch (e) {
          console.error("Error fetching user DOB", e);
        }
      }

      setDob(dateOfBirth);
      
      if (dateOfBirth) {
        processSignAndMessage(dateOfBirth);
      } else {
        setLoading(false);
        setEditing(true);
      }
    };

    fetchUserData();
  }, [userId]);

  const processSignAndMessage = async (dateOfBirth: string) => {
    const date = new Date(dateOfBirth);
    if (isNaN(date.getTime())) {
        setLoading(false);
        return;
    }
    
    // Adjust for timezone issues by treating input as UTC YYYY-MM-DD
    const day = parseInt(dateOfBirth.split('-')[2]);
    const month = parseInt(dateOfBirth.split('-')[1]);
    
    const calculatedSign = getZodiacSign(day, month);
    setSign(calculatedSign);
    setEditing(false);

    // Fetch message
    try {
        const msg = await generateHoroscope(calculatedSign);
        setMessage(msg);
    } catch (e) {
        console.error("Error fetching horoscope", e);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveDob = async () => {
    if (!dob) return;
    setSavingDob(true);

    try {
      if (userId === 'guest-dev-user') {
        const local = localStorage.getItem('lumen_user_profile');
        const profile = local ? JSON.parse(local) : {};
        profile.dateOfBirth = dob;
        localStorage.setItem('lumen_user_profile', JSON.stringify(profile));
      } else if (db) {
        await setDoc(doc(db, 'users', userId), { dateOfBirth: dob }, { merge: true });
      }
      
      setLoading(true);
      await processSignAndMessage(dob);
    } catch (e) {
      console.error("Error saving DOB", e);
      setLoading(false);
    } finally {
      setSavingDob(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (editing && !loading) {
     return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
             <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex justify-between items-center z-10 sticky top-0">
                <span className="text-brand-800 font-display font-semibold tracking-wide text-lg">Daily Horoscope</span>
             </div>
             
             <div className="max-w-md mx-auto w-full px-6 py-12">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-brand-50 text-center">
                    <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500">
                        <CalendarIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">When is your birthday?</h2>
                    <p className="text-slate-500 mb-6">Enter your date of birth so we can determine your sign and provide your daily reading.</p>
                    
                    <input 
                        type="date" 
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none mb-6 bg-slate-50 text-slate-800"
                    />
                    
                    <button 
                        onClick={handleSaveDob}
                        disabled={!dob || savingDob}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                        {savingDob ? 'Saving...' : 'Reveal My Sign'}
                    </button>
                </div>
             </div>
        </div>
     );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
       <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex justify-between items-center z-10 sticky top-0">
          <span className="text-brand-800 font-display font-semibold tracking-wide text-lg">Daily Horoscope</span>
          <button 
             onClick={() => setEditing(true)}
             className="text-slate-400 hover:text-brand-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
             title="Change Birthday"
          >
             <EditIcon className="w-5 h-5" />
          </button>
       </div>

       <div className="max-w-3xl mx-auto w-full px-6 py-8 pb-20">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-brand-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="mt-4 text-brand-600 font-medium animate-pulse">Consulting the stars...</p>
             </div>
          ) : (
             <div className="space-y-6">
                 {/* Sign Card */}
                 <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
                        <div className="mb-4 md:mb-0 md:mr-6">
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                                <StarIcon className="w-10 h-10 text-yellow-300" />
                            </div>
                        </div>
                        <div>
                            <h1 className="font-display text-4xl font-bold mb-1 tracking-tight">{sign}</h1>
                            <p className="text-indigo-200 font-medium mb-4">{todayStr}</p>
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold tracking-wider uppercase">
                                Daily Reading
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Message Content */}
                 <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-50">
                    <h3 className="font-display font-bold text-xl text-slate-800 mb-4 flex items-center">
                        <span className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center mr-3 text-brand-600">
                           <StarIcon className="w-4 h-4" />
                        </span>
                        Message for {sign}
                    </h3>
                    <div className="prose prose-slate max-w-none">
                        <div className="text-slate-600 leading-relaxed space-y-4 whitespace-pre-wrap font-sans">
                            {message}
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 italic">
                        Powered by AI & Internet Sources • Providing insights for entertainment and guidance.
                    </div>
                 </div>
             </div>
          )}
       </div>
    </div>
  );
};