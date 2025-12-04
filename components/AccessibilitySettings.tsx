import React, { useState, useEffect } from 'react';
import { AccessibilityIcon, SunIcon, CheckIcon, XIcon, EyeIcon, PlayIcon } from './Icons';
import { db } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AccessibilitySettingsProps {
  userId: string;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ userId }) => {
  const [settings, setSettings] = useState({
    textSize: 16,
    highContrast: false,
    reducedMotion: false,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    // Apply settings in real-time for preview
    document.documentElement.style.fontSize = `${settings.textSize}px`;
    
    if (settings.highContrast) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');

    if (settings.reducedMotion) document.body.classList.add('reduced-motion');
    else document.body.classList.remove('reduced-motion');

  }, [settings]);

  useEffect(() => {
    if (!userId) return;

    if (userId === 'guest-dev-user') {
        const saved = localStorage.getItem('lumen_user_profile');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSettings(prev => ({
                    textSize: parsed.textSize || 16,
                    highContrast: parsed.highContrast || false,
                    reducedMotion: parsed.reducedMotion || false,
                }));
            } catch (e) { console.error("Error parsing profile", e); }
        }
        return;
    }

    if (!db) return;

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setSettings(prev => ({
                textSize: data.textSize || 16,
                highContrast: data.highContrast || false,
                reducedMotion: data.reducedMotion || false,
            }));
        }
      } catch (e) {
        console.error("Error fetching accessibility settings", e);
      }
    };
    fetchSettings();
  }, [userId]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      if (userId === 'guest-dev-user') {
          const local = localStorage.getItem('lumen_user_profile');
          const profile = local ? JSON.parse(local) : {};
          const updatedProfile = { ...profile, ...settings };
          localStorage.setItem('lumen_user_profile', JSON.stringify(updatedProfile));
          setMessage({ type: 'success', text: 'Settings updated locally.' });
      } else {
          if (!db) throw new Error("Database connection unavailable.");
          await setDoc(doc(db, 'users', userId), settings, { merge: true });
          setMessage({ type: 'success', text: 'Accessibility settings saved.' });
      }
    } catch (e) {
      console.error("Error saving settings", e);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
       <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex items-center justify-between z-10 sticky top-0">
          <span className="text-brand-800 font-display font-semibold tracking-wide text-lg">Accessibility</span>
       </div>

       <div className="max-w-2xl mx-auto w-full px-6 py-8 pb-20">
          {message && (
            <div role="alert" className={`mb-6 p-4 rounded-xl border text-sm font-medium flex items-center ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                {message.type === 'success' ? <CheckIcon className="w-5 h-5 mr-2" /> : <XIcon className="w-5 h-5 mr-2" />}
                {message.text}
            </div>
          )}

           <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-100 space-y-8">
              <div className="flex items-center text-slate-800 font-display font-semibold border-b border-slate-50 pb-2 mb-4">
                <AccessibilityIcon className="w-5 h-5 mr-2 text-brand-500" />
                Display Settings
              </div>
              
              {/* Text Size */}
              <div>
                  <label htmlFor="textSize" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Text Size</label>
                  <input 
                    id="textSize"
                    type="range" 
                    min="14" max="24" step="1"
                    value={settings.textSize}
                    onChange={(e) => setSettings(s => ({...s, textSize: parseInt(e.target.value)}))}
                    className="w-full accent-brand-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                      <span>Small (14px)</span>
                      <span>Default (16px)</span>
                      <span>Large (24px)</span>
                  </div>
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl text-center">
                    <p className="text-slate-700">The quick brown fox jumps over the lazy dog.</p>
                  </div>
              </div>

              {/* High Contrast */}
              <div className="flex items-center justify-between py-2">
                 <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <EyeIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800">High Contrast Mode</h4>
                        <p className="text-xs text-slate-500">Increase contrast for better legibility.</p>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.highContrast} onChange={(e) => setSettings(s => ({...s, highContrast: e.target.checked}))} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                 </label>
              </div>

              {/* Reduced Motion */}
              <div className="flex items-center justify-between py-2">
                 <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <PlayIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800">Reduced Motion</h4>
                        <p className="text-xs text-slate-500">Disable animations and transitions.</p>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.reducedMotion} onChange={(e) => setSettings(s => ({...s, reducedMotion: e.target.checked}))} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                 </label>
              </div>

              <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-3.5 rounded-xl font-semibold shadow-md transition-all bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-70 mt-6"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
               </button>
           </div>
       </div>
    </div>
  );
};