import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon, MailIcon, CheckIcon, XIcon, DoveIcon, GoogleIcon } from './Icons';
import { auth, isFirebaseConfigValid } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onGuestLogin?: () => void;
  initialView?: 'login' | 'signup';
  isDemoMode?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onGuestLogin, initialView = 'login', isDemoMode = false }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>(initialView);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  const checkConfig = (): boolean => {
    if (!isFirebaseConfigValid()) {
      setError("App configuration missing. Please ensure environment variables are set.");
      return false;
    }
    return true;
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkConfig()) return;
    
    if (!auth) {
      setError("Firebase service not initialized.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        // onLoginSuccess handled by App.tsx auth listener
      } else if (view === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        // onLoginSuccess handled by App.tsx auth listener
      } else if (view === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccess("Password reset email sent! Check your inbox.");
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "An error occurred.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') msg = "Invalid email or password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      if (err.code === 'auth/too-many-requests') msg = "Too many failed attempts. Try again later.";
      if (err.code === 'auth/invalid-api-key') {
         msg = "Invalid API Key in configuration.";
      }
      setError(msg);
    } finally {
      if (view !== 'forgot') setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!checkConfig()) return;

    if (!auth) {
      setError("Firebase auth service is not initialized.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onLoginSuccess handled by App.tsx listener
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
         setError("Google Sign-In is not enabled in the Firebase Console.");
      } else if (err.code === 'auth/popup-closed-by-user') {
         setError("Sign-in cancelled.");
      } else if (err.code === 'auth/invalid-api-key' || (err.message && err.message.includes('api-key-not-valid'))) {
         setError("Configuration Required.");
      } else if (err.code === 'auth/configuration-not-found') {
         setError("Firebase configuration not found.");
      } else {
         setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-50 flex items-center justify-center p-4">
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-100/50 to-white/50"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl"></div>
       </div>

       <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/50 flex flex-col">
          <div className="bg-brand-600 p-8 text-center relative shrink-0 overflow-hidden">
             <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
                <DoveIcon className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-2xl font-display font-bold text-white mb-1">Bible Chat AI</h1>
             <p className="text-brand-100 text-sm">Your Spiritual Companion</p>
          </div>

          <div className="p-8">
              <form onSubmit={handleAuthAction} className="space-y-5">
                  <h2 className="text-xl font-semibold text-slate-800 text-center">
                    {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Create Account' : 'Reset Password'}
                  </h2>
                  
                  {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center"><XIcon className="w-4 h-4 mr-2 shrink-0"/>{error}</div>}
                  {success && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg flex items-center"><CheckIcon className="w-4 h-4 mr-2 shrink-0"/>{success}</div>}
                  
                  <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                      <div className="relative">
                          <MailIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                          <input 
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                              placeholder="name@example.com"
                              required
                          />
                      </div>
                  </div>

                  {view !== 'forgot' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                        <div className="relative">
                            <LockIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <input 
                                type={isVisible ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                            <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-3 top-3 text-slate-400 hover:text-brand-600">
                                {isVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                  )}

                  {view === 'login' && (
                      <div className="flex justify-end">
                          <button type="button" onClick={() => setView('forgot')} className="text-xs font-bold text-brand-600 uppercase tracking-wider hover:text-brand-800">
                              Forgot Password?
                          </button>
                      </div>
                  )}

                  <button 
                      type="submit" 
                      disabled={isLoading}
                      className={`w-full py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 ${
                          !isLoading
                          ? 'bg-brand-600 text-white shadow-brand-200 hover:bg-brand-700 hover:shadow-xl hover:-translate-y-0.5' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                  >
                      {isLoading ? 'Processing...' : (view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Send Reset Link')}
                  </button>
              </form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-bold tracking-wider">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3 rounded-xl border border-slate-200 flex items-center justify-center space-x-2 hover:bg-slate-50 transition-colors bg-white text-slate-700 font-semibold"
              >
                <GoogleIcon className="w-5 h-5" />
                <span>Sign in with Google</span>
              </button>
              
              <div className="pt-4 border-t border-slate-100 flex flex-col items-center space-y-4 mt-6">
                  <div className="text-center">
                      {view === 'login' ? (
                        <>
                          <p className="text-slate-500 text-xs">Don't have an account?</p>
                          <button type="button" onClick={() => setView('signup')} className="text-brand-600 font-bold hover:text-brand-800 transition-colors text-sm">
                              Create Profile
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setView('login')} className="text-brand-600 font-bold hover:text-brand-800 transition-colors text-sm">
                            Back to Sign In
                        </button>
                      )}
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};