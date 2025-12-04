import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from './components/Chat';
import { PrayerWall } from './components/PrayerWall';
import { Journey } from './components/Journey';
import { ProfileSettings } from './components/ProfileSettings';
import { Favorites } from './components/Favorites';
import { About } from './components/About';
import { ZodiacDaily } from './components/ZodiacDaily';
import { AccessibilitySettings } from './components/AccessibilitySettings';
import { LoginScreen } from './components/LoginScreen';
import { ReminderListener } from './components/ReminderListener';
import { 
  MenuIcon, BookIcon, MessageCircleIcon, HandsIcon, MapIcon, SettingsIcon, DoveIcon, BookmarkIcon,
  SparklesIcon, HeartIcon, FeatherIcon, SunIcon, AnchorIcon, ShieldIcon, UsersIcon, BriefcaseIcon, LeafIcon, FireIcon,
  MoonIcon, CloudIcon, LightbulbIcon, SmileIcon, TrendingUpIcon, ArrowDownIcon, InfoIcon, StarIcon, AccessibilityIcon
} from './components/Icons';
import { ViewState, Topic } from './types';
import { auth, isFirebaseConfigValid, db } from './services/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const TOPICS: Topic[] = [
  { id: 'anxiety', label: 'Anxiety & Fear', icon: <DoveIcon className="w-5 h-5" />, prompt: "I am feeling anxious. Can you share some bible verses to help me find peace?" },
  { id: 'faith', label: 'Growing Faith', icon: <BookIcon className="w-5 h-5" />, prompt: "How can I strengthen my faith in difficult times?" },
  { id: 'guidance', label: 'Seeking Guidance', icon: <MapIcon className="w-5 h-5" />, prompt: "I need guidance for a big decision. What does the Bible say about wisdom?" },
  { id: 'relationships', label: 'Relationships', icon: <HandsIcon className="w-5 h-5" />, prompt: "How can I build Godly relationships and handle conflict?" },
  { id: 'purpose', label: 'Finding Purpose', icon: <SparklesIcon className="w-5 h-5" />, prompt: "What does the Bible say about finding my purpose in life?" },
  { id: 'healing', label: 'Healing & Comfort', icon: <HeartIcon className="w-5 h-5" />, prompt: "I need comfort and healing. Please share some scriptures for physical and emotional restoration." },
  { id: 'forgiveness', label: 'Forgiveness', icon: <FeatherIcon className="w-5 h-5" />, prompt: "I'm struggling to forgive. What does Jesus teach us about forgiveness?" },
  { id: 'gratitude', label: 'Gratitude', icon: <SunIcon className="w-5 h-5" />, prompt: "Help me cultivate a heart of gratitude with some inspiring verses." },
  { id: 'patience', label: 'Patience', icon: <AnchorIcon className="w-5 h-5" />, prompt: "I'm feeling impatient. Show me scripture about waiting on the Lord." },
  { id: 'sin', label: 'Overcoming Sin', icon: <ShieldIcon className="w-5 h-5" />, prompt: "How can I resist temptation and overcome sin in my life?" },
  { id: 'family', label: 'Marriage & Family', icon: <UsersIcon className="w-5 h-5" />, prompt: "What is biblical advice for a strong marriage and raising a family?" },
  { id: 'work', label: 'Work & Career', icon: <BriefcaseIcon className="w-5 h-5" />, prompt: "How should a Christian approach work, career, and business?" },
  { id: 'sadness', label: 'Depression & Hope', icon: <LeafIcon className="w-5 h-5" />, prompt: "I feel down and depressed. Please share verses of hope and light to lift my spirit." },
  { id: 'strength', label: 'Strength & Courage', icon: <FireIcon className="w-5 h-5" />, prompt: "I need strength and courage. Show me verses about God's power in my weakness." },
  
  // New Topics
  { id: 'sleep', label: 'Peaceful Sleep', icon: <MoonIcon className="w-5 h-5" />, prompt: "I am struggling to sleep. Please share verses to help me rest in God's peace." },
  { id: 'grief', label: 'Handling Grief', icon: <CloudIcon className="w-5 h-5" />, prompt: "I am grieving a loss. Please comfort me with scripture about God's nearness to the brokenhearted." },
  { id: 'finance', label: 'Financial Wisdom', icon: <TrendingUpIcon className="w-5 h-5" />, prompt: "What does the Bible teach about money, stewardship, and generosity?" },
  { id: 'joy', label: 'True Joy', icon: <SmileIcon className="w-5 h-5" />, prompt: "How can I find true joy in the Lord, even when life is hard?" },
  { id: 'wisdom', label: 'Seeking Wisdom', icon: <LightbulbIcon className="w-5 h-5" />, prompt: "I need wisdom for my life. What does Proverbs say about seeking understanding?" },
  { id: 'enemies', label: 'Loving Enemies', icon: <HeartIcon className="w-5 h-5" />, prompt: "How can I love those who are difficult or who have hurt me?" },
  { id: 'humility', label: 'Humility', icon: <ArrowDownIcon className="w-5 h-5" />, prompt: "Teach me about the virtue of humility and how to walk humbly with God." },
  { id: 'hope', label: 'Hope in Hardship', icon: <AnchorIcon className="w-5 h-5" />, prompt: "I am going through a hard time. Give me verses of hope to hold onto." },
  { id: 'armor', label: 'Spiritual Armor', icon: <ShieldIcon className="w-5 h-5" />, prompt: "Explain the Full Armor of God and how I can wear it daily." },
  { id: 'friendship', label: 'Friendship', icon: <UsersIcon className="w-5 h-5" />, prompt: "What does the Bible say about being a good friend and choosing godly company?" },
];

// Mock user for Dev/Guest mode
const MOCK_USER = {
  uid: 'guest-dev-user',
  email: 'guest@lumen.app',
  displayName: 'Guest User',
  emailVerified: true,
  isAnonymous: true,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  photoURL: null,
  providerId: 'guest',
} as User;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lumen_guest_mode');
    return saved === 'true' ? MOCK_USER : null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('journey');
  const [startPrompt, setStartPrompt] = useState<string | undefined>(undefined);

  const isDemoMode = !isFirebaseConfigValid();

  // Listen for Firebase Auth Changes
  useEffect(() => {
    if (isDemoMode || !auth) {
      setIsAuthLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setGuestUser(null);
        localStorage.setItem('lumen_guest_mode', 'false');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isDemoMode]);

  // Global Settings Application
  const activeUserId = user?.uid || guestUser?.uid;
  useEffect(() => {
    const applySettings = async () => {
      if (!activeUserId) return;
      
      let settings: { textSize?: number; highContrast?: boolean; reducedMotion?: boolean } = {};
      
      if (activeUserId === 'guest-dev-user') {
        const saved = localStorage.getItem('lumen_user_profile');
        if (saved) settings = JSON.parse(saved);
      } else if (db) {
        try {
          const docRef = doc(db, 'users', activeUserId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) settings = docSnap.data();
        } catch (e) {
          console.error("Error fetching settings for application", e);
        }
      }

      // Apply
      if (settings.textSize) document.documentElement.style.fontSize = `${settings.textSize}px`;
      if (settings.highContrast) document.body.classList.add('high-contrast');
      else document.body.classList.remove('high-contrast');
      if (settings.reducedMotion) document.body.classList.add('reduced-motion');
      else document.body.classList.remove('reduced-motion');
    };

    applySettings();
  }, [activeUserId]);

  const handleGuestLogin = () => {
    localStorage.setItem('lumen_guest_mode', 'true');
    setGuestUser(MOCK_USER);
  };

  const handleLogout = useCallback(async () => {
    try {
      if (user && auth) {
        await signOut(auth);
      }
      setGuestUser(null);
      localStorage.setItem('lumen_guest_mode', 'false');
      setCurrentView('journey');
      // Reset accessibility styles on logout
      document.documentElement.style.fontSize = '';
      document.body.classList.remove('high-contrast', 'reduced-motion');
    } catch (error) {
      console.error("Error signing out", error);
    }
  }, [user]);

  const handleTopicClick = (prompt: string) => {
    setStartPrompt(prompt);
    setCurrentView('chat');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Determine active user (Real or Guest)
  const activeUser = user || guestUser;

  if (isAuthLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-brand-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-brand-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!activeUser) {
    return (
      <LoginScreen 
        onLoginSuccess={() => {}} 
        onGuestLogin={handleGuestLogin}
        isDemoMode={isDemoMode}
      />
    );
  }

  return (
    <div className="flex h-screen bg-brand-50 text-slate-800 overflow-hidden font-sans relative">
      {/* Background Reminder Listener */}
      {activeUser && <ReminderListener userId={activeUser.uid} />}

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-brand-100 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-6 flex items-center justify-center border-b border-brand-50/50">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30 mr-3">
            <DoveIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-800 leading-none">Bible Chat</h1>
            <span className="text-[10px] font-medium text-brand-400 uppercase tracking-widest">Holy Bible Study</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="pb-4 space-y-1">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
            <button 
              onClick={() => { setCurrentView('journey'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'journey' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <MapIcon className="w-5 h-5" />
              <span className="font-medium">Daily Journey</span>
            </button>
            <button 
              onClick={() => { setCurrentView('chat'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'chat' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <MessageCircleIcon className="w-5 h-5" />
              <span className="font-medium">Bible Study</span>
            </button>
            <button 
              onClick={() => { setCurrentView('prayer'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'prayer' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <HandsIcon className="w-5 h-5" />
              <span className="font-medium">Prayer Wall</span>
            </button>
            <button 
              onClick={() => { setCurrentView('favorites'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'favorites' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <BookmarkIcon className="w-5 h-5" />
              <span className="font-medium">Favorites</span>
            </button>
            <button 
              onClick={() => { setCurrentView('zodiac'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'zodiac' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <StarIcon className="w-5 h-5" />
              <span className="font-medium">Daily Horoscope</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Suggested Topics</p>
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicClick(topic.prompt)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-all group"
              >
                <div className="text-slate-400 group-hover:text-brand-500 transition-colors">
                  {topic.icon}
                </div>
                <span className="font-medium">{topic.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
           <button 
              onClick={() => { setCurrentView('accessibility'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'accessibility' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
           >
              <AccessibilityIcon className="w-5 h-5" />
              <span className="font-medium">Accessibility</span>
           </button>
           <button 
              onClick={() => { setCurrentView('about'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'about' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
           >
              <InfoIcon className="w-5 h-5" />
              <span className="font-medium">About</span>
           </button>
           <button 
              onClick={() => { setCurrentView('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'settings' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
           >
              <SettingsIcon className="w-5 h-5" />
              <span className="font-medium">Settings</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative w-full">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-brand-100">
          <button onClick={toggleSidebar} className="p-2 text-slate-600 rounded-lg hover:bg-slate-50">
            <MenuIcon className="w-6 h-6" />
          </button>
          <span className="font-display font-semibold text-lg text-slate-800">Bible Chat</span>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-hidden relative bg-slate-50">
          {/* Background Decoration */}
          {currentView !== 'journey' && currentView !== 'about' && currentView !== 'accessibility' && (
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-100/50 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 -left-20 w-72 h-72 bg-gold-100/50 rounded-full blur-3xl"></div>
            </div>
          )}

          <div className="relative z-10 h-full flex flex-col max-w-5xl mx-auto w-full bg-white/50 md:bg-transparent shadow-xl md:shadow-none">
             <div className="flex-1 h-full overflow-hidden">
               {currentView === 'journey' && (
                 <Journey 
                   userId={activeUser.uid} 
                   onNavigateToChat={handleTopicClick} 
                 />
               )}
               {currentView === 'chat' && (
                 <Chat 
                  userId={activeUser.uid}
                  initialPrompt={startPrompt} 
                  onClearInitialPrompt={() => setStartPrompt(undefined)}
                 />
               )}
               {currentView === 'prayer' && (
                 <PrayerWall 
                   userId={activeUser.uid}
                   onPrayWithAI={(prompt) => handleTopicClick(prompt)}
                 />
               )}
               {currentView === 'favorites' && (
                 <Favorites userId={activeUser.uid} />
               )}
               {currentView === 'zodiac' && (
                 <ZodiacDaily userId={activeUser.uid} />
               )}
               {currentView === 'about' && (
                 <About />
               )}
               {currentView === 'accessibility' && (
                 <AccessibilitySettings userId={activeUser.uid} />
               )}
               {currentView === 'settings' && (
                 <ProfileSettings 
                   userId={activeUser.uid} 
                   userEmail={activeUser.email} 
                   onLogout={handleLogout} 
                 />
               )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;