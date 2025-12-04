import React, { useState, useEffect } from 'react';
import { LogOutIcon, UserIcon, CheckIcon, XIcon, SunIcon, TrashIcon, ShieldIcon } from './Icons';
import { UserProfile } from '../types';
import { db, deleteUserData } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface ProfileSettingsProps {
  userId: string;
  userEmail: string | null;
  onLogout: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ userId, userEmail, onLogout }) => {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: userEmail || '',
    dateOfBirth: '',
    jobTitle: '',
    onlineStatus: 'Online',
    bio: '',
    passwordHistory: []
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Guest Mode: Load from Local Storage
    if (userId === 'guest-dev-user') {
        const saved = localStorage.getItem('lumen_user_profile');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setProfile(prev => ({ ...prev, ...parsed, email: userEmail || '' }));
            } catch (e) { console.error("Error parsing profile", e); }
        }
        return;
    }

    if (!db) return;

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(prev => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.error("Error fetching profile", e);
      }
    };
    fetchProfile();
  }, [userId, userEmail]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      if (userId === 'guest-dev-user') {
          const current = localStorage.getItem('lumen_user_profile');
          const currentObj = current ? JSON.parse(current) : {};
          localStorage.setItem('lumen_user_profile', JSON.stringify({ ...currentObj, ...profile }));
          setMessage({ type: 'success', text: 'Profile updated locally (Guest Mode).' });
      } else {
          if (!db) throw new Error("Database connection unavailable.");
          await setDoc(doc(db, 'users', userId), profile, { merge: true });
          setMessage({ type: 'success', text: 'Profile updated successfully.' });
      }
    } catch (e) {
      console.error("Error saving profile", e);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Guest User: Immediate local cleanup
    if (userId === 'guest-dev-user') {
        if (!window.confirm("Are you sure you want to delete your guest session? This will immediately remove all local data.")) {
            return;
        }

        setIsDeleting(true);
        try {
            localStorage.removeItem('lumen_user_profile');
            localStorage.removeItem('lumen_chat_history');
            localStorage.removeItem('lumen_favorites');
            localStorage.removeItem('lumen_prayers');
            localStorage.removeItem('lumen_logs');
            localStorage.removeItem('lumen_guest_mode');
            window.location.reload();
        } catch (e) {
            console.error("Error resetting guest", e);
            setIsDeleting(false);
        }
        return;
    }

    // Authenticated User: Direct Deletion
    if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data.")) {
        setIsDeleting(true);
        try {
            await deleteUserData(userId);
            // Reload to clear state/auth context
            window.location.reload();
        } catch (e: any) {
            console.error("Error deleting account", e);
            setIsDeleting(false);
            if (e.code === 'auth/requires-recent-login') {
                setMessage({ type: 'error', text: 'Security Check: Please log out and log back in, then try deleting your account again.' });
            } else {
                setMessage({ type: 'error', text: 'Failed to delete account. Please try again later.' });
            }
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
       <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex items-center justify-between z-10 sticky top-0">
          <span className="text-brand-800 font-display font-semibold tracking-wide text-lg">Settings</span>
          <button 
            onClick={onLogout} 
            className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            aria-label="Log Out"
          >
              <LogOutIcon className="w-4 h-4" />
              <span>Log Out</span>
          </button>
       </div>

       <div className="max-w-2xl mx-auto w-full px-6 py-8 pb-20">
          {message && (
            <div role="alert" className={`mb-6 p-4 rounded-xl border text-sm font-medium flex items-center ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                {message.type === 'success' ? <CheckIcon className="w-5 h-5 mr-2" /> : <XIcon className="w-5 h-5 mr-2" />}
                {message.text}
            </div>
          )}

           <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-100 space-y-6">
              <div className="flex items-center text-slate-800 font-display font-semibold border-b border-slate-50 pb-2 mb-4">
                <UserIcon className="w-5 h-5 mr-2 text-brand-500" />
                Personal Information
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">First Name</label>
                  <input id="firstName" type="text" value={profile.firstName} onChange={(e) => setProfile(p => ({...p, firstName: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none bg-slate-50/50" />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Last Name</label>
                  <input id="lastName" type="text" value={profile.lastName} onChange={(e) => setProfile(p => ({...p, lastName: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none bg-slate-50/50" />
                </div>
              </div>

              <div>
                 <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                 <input id="email" type="email" value={profile.email} disabled className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed" />
              </div>

              <div>
                <label htmlFor="bio" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bio</label>
                <textarea id="bio" value={profile.bio} onChange={(e) => setProfile(p => ({...p, bio: e.target.value}))} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none bg-slate-50/50 resize-none" placeholder="Tell us a little about yourself..." />
              </div>

              <button 
                  onClick={handleSave}
                  disabled={isSaving || isDeleting}
                  className="w-full py-3.5 rounded-xl font-semibold shadow-md transition-all bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-70 mt-6"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
               </button>
           </div>

           {/* Danger Zone */}
           <div className="bg-red-50/50 rounded-2xl p-6 shadow-sm border border-red-100 mt-6">
              <div className="flex items-center text-red-700 font-display font-semibold border-b border-red-100 pb-2 mb-4">
                <ShieldIcon className="w-5 h-5 mr-2" />
                Danger Zone
              </div>
              <p className="text-sm text-red-600/80 mb-4">
                Permanently delete your account and all associated data.
              </p>
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting || isSaving}
                className="w-full py-3 rounded-xl font-semibold transition-all bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                 {isDeleting ? (
                    <span>Processing...</span>
                 ) : (
                    <>
                        <TrashIcon className="w-4 h-4" />
                        <span>Delete My Account</span>
                    </>
                 )}
              </button>
           </div>
       </div>
    </div>
  );
};