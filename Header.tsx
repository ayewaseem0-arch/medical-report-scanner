import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Globe, 
  ChevronDown, 
  Check, 
  LogIn, 
  User, 
  LogOut, 
  FlaskConical, 
  Search,
  Bell,
  Menu,
  Monitor,
  WifiOff,
  CloudOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../contexts/LanguageContext';
import { languages, Language } from '../i18n';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';

interface HeaderProps {
  isDarkMode: boolean;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleDarkMode: () => void;
  userCountry?: string;
  activeAnalysisMode: 'lab' | 'medicine' | 'symptoms';
  notifications?: Array<{
    id: string;
    title: string;
    desc: string;
    time: string;
    unread: boolean;
    type: 'info' | 'success' | 'alert';
  }>;
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  onToggleMobileSidebar?: () => void;
  onOpenEmergencySOS?: () => void;
}

export default function Header({ 
  isDarkMode, 
  theme,
  setTheme,
  toggleDarkMode, 
  userCountry, 
  activeAnalysisMode,
  notifications = [],
  setNotifications,
  isNotificationOpen,
  setIsNotificationOpen,
  onToggleMobileSidebar,
  onOpenEmergencySOS
}: HeaderProps) {
  const { language, setLanguage, t } = useTranslation();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [serverReachable, setServerReachable] = useState(true);

  useEffect(() => {
    let intervalId: any;
    const checkServer = async () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }
      setIsOffline(false);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeoutId);
        setServerReachable(res.ok);
      } catch (e) {
        setServerReachable(false);
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      checkServer();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkServer();
    intervalId = setInterval(checkServer, 15000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Successfully signed in!");
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
        toast.error("Failed to sign in. Please try again.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-surface/80 backdrop-blur-md px-2.5 sm:px-6 py-1.5 flex items-center justify-between transition-colors h-12 sm:h-14 lg:h-16 max-h-[10vh]">
      <div id="logo-container" className="flex items-center gap-1.5 sm:gap-2.5">
        {onToggleMobileSidebar && (
          <button 
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-lg border border-border bg-bg-warm lg:hidden text-text-secondary hover:text-accent hover:border-accent/30 transition-all shrink-0 cursor-pointer"
            title="Toggle Sidebar Control Panel"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        
        {/* On mobile, show brand briefly */}
        <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
          <div className="w-6.5 h-6.5 bg-gradient-to-br from-accent to-accent-bright rounded-lg flex items-center justify-center shadow-md shadow-accent/15 shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
          </div>
          <h1 className="text-sm font-black tracking-tight text-text-primary leading-none hidden min-[380px]:inline">
            Med<span className="text-accent font-display">Scan</span>
          </h1>
        </div>

        {/* Dynamic engine status mode (desktop & responsive) */}
        <div className="flex items-center gap-2">
          {(!serverReachable || isOffline) && (
            <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded bg-coral/10 border border-coral/20 text-[9px] sm:text-[10px] font-black uppercase text-coral tracking-widest select-none shadow-sm shrink-0 animate-pulse" title={isOffline ? "No Internet Connection" : "API Unreachable"}>
              {isOffline ? <WifiOff className="w-3.5 h-3.5 text-coral shrink-0" /> : <CloudOff className="w-3.5 h-3.5 text-coral shrink-0" />}
              <span className="hidden min-[400px]:inline">
                {isOffline ? "Offline Mode" : "API Unreachable"}
              </span>
            </div>
          )}

          {/* Active Mode Badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded bg-accent/10 border border-accent/15 text-[9px] sm:text-[10px] font-black uppercase text-accent tracking-widest select-none shadow-sm shrink-0">
            {activeAnalysisMode === 'lab' && <FlaskConical className="w-3.5 h-3.5 text-accent shrink-0" />}
            {activeAnalysisMode === 'medicine' && <Activity className="w-3.5 h-3.5 text-accent shrink-0 animate-pulse" />}
            {activeAnalysisMode === 'symptoms' && <Search className="w-3.5 h-3.5 text-accent shrink-0" />}
            <span className="ml-1 hidden min-[400px]:inline">
              {activeAnalysisMode === 'lab' ? t('mode_lab') : activeAnalysisMode === 'medicine' ? t('mode_medicine') : t('mode_symptoms')}
              <span className="hidden sm:inline"> Engine</span>
            </span>
          </div>

          {userCountry && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded bg-accent/5 border border-accent/10 text-[8px] font-black text-accent uppercase tracking-wider shrink-0 select-none">
              <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
              {userCountry} Ref
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center justify-center gap-1 px-1.5 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md border border-border hover:bg-bg-warm transition-colors text-[10px] font-bold text-text-secondary uppercase tracking-wider cursor-pointer h-7"
            >
              <Globe className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="hidden min-[380px]:inline sm:hidden">{currentLang.code.toUpperCase()}</span>
              <span className="hidden sm:inline">{currentLang.native}</span>
              <ChevronDown className={cn("w-2.5 h-2.5 transition-transform hidden sm:inline", isLangOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute right-[-50px] sm:right-0 mt-1.5 w-40 sm:w-44 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1.5"
                  >
                    <div className="grid grid-cols-1 max-h-[250px] overflow-y-auto">
                       {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLangOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-bg-warm",
                            language === lang.code ? "bg-accent/5 text-accent font-bold" : "text-text-secondary"
                          )}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold">{lang.name}</span>
                            <span>{lang.native}</span>
                          </div>
                          {language === lang.code && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Clinical Alerts and Notification options - Migrated under item 9 */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={cn(
                "p-1.5 sm:p-2 rounded-md border border-border text-text-secondary hover:bg-bg-warm transition-all select-none cursor-pointer relative flex items-center justify-center h-7 w-7 sm:h-auto sm:w-auto",
                isNotificationOpen ? "bg-accent/10 border-accent/25 text-accent" : "bg-bg-warm md:bg-transparent"
              )}
              title="Alerts & Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-coral rounded-full ring-1 ring-surface animate-pulse" />
              )}
            </button>
            
            <AnimatePresence>
              {isNotificationOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute right-[-32px] sm:right-0 mt-1.5 w-[calc(100vw-24px)] min-[380px]:w-80 sm:w-96 bg-surface border border-border rounded-[1.5rem] shadow-2xl z-50 overflow-hidden p-4 sm:p-5 text-left"
                  >
                     <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3.5">
                       <div className="flex items-center gap-2">
                         <span className="p-1 bg-accent/10 text-accent rounded-lg font-bold">
                           <Bell className="w-3.5 h-3.5" />
                         </span>
                         <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Clinical Alerts</h4>
                       </div>
                       {notifications.length > 0 && (
                         <button 
                           onClick={() => {
                             const hadUnread = notifications.some(n => n.unread);
                             if (hadUnread) {
                               setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                               toast.success("All clinical alerts marked as read", {
                                 position: 'bottom-right'
                               });
                             } else {
                               toast.info("All notifications are already read", {
                                 position: 'bottom-right'
                               });
                             }
                           }}
                           className={cn(
                             "text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 px-2.5 py-1 rounded-xl border select-none cursor-pointer",
                             notifications.some(n => n.unread)
                               ? "text-accent border-accent/20 bg-accent/5 hover:bg-accent/10 active:scale-95"
                                : "text-text-muted border-border/40 bg-bg-warm opacity-60 cursor-not-allowed"
                           )}
                           disabled={!notifications.some(n => n.unread)}
                         >
                           <Check className="w-3 h-3" />
                           Mark all read
                         </button>
                       )}
                     </div>

                     <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                       {notifications.map(n => (
                         <div 
                           key={n.id} 
                           className={cn(
                             "p-2.5 rounded-xl border transition-all text-[11px] flex gap-2.5 relative cursor-pointer",
                             n.unread ? "bg-accent/5 border-accent/15 font-bold" : "bg-bg-warm/30 border-border/40"
                           )}
                           onClick={() => {
                             setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item));
                           }}
                         >
                           <div className={cn(
                             "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                             n.type === 'success' ? "bg-emerald" : n.type === 'alert' ? "bg-coral" : "bg-accent"
                           )} />
                           <div className="space-y-1 flex-1">
                             <p className="text-text-primary font-bold leading-tight">{n.title}</p>
                             <p className="text-text-secondary leading-relaxed font-semibold">{n.desc}</p>
                             <span className="text-[9px] text-text-muted font-mono block">{n.time}</span>
                           </div>
                           {n.unread && (
                             <span className="w-1 h-1 bg-accent-bright rounded-full shrink-0" />
                           )}
                         </div>
                       ))}
                       {notifications.length === 0 && (
                         <p className="text-center text-text-muted text-[11px] py-4 font-semibold">No recent alerts or notifications.</p>
                       )}
                     </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Selector Dropdown */}
          <div className="relative">
            <button
              id="theme-dropdown-toggle"
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="flex items-center justify-center gap-1 px-1.5 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md border border-border bg-bg-warm md:bg-transparent hover:bg-bg-warm transition-colors text-[10px] font-bold text-text-secondary uppercase tracking-wider relative cursor-pointer h-7"
              title="Change Theme Mode"
            >
              {theme === 'system' ? (
                <Monitor className="w-3.5 h-3.5 text-accent shrink-0" />
              ) : theme === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-amber animate-spin-slow shrink-0" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-accent shrink-0" />
              )}
              <span className="hidden sm:inline">
                {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
              </span>
              <ChevronDown className={cn("w-2.5 h-2.5 transition-transform hidden sm:inline", isThemeOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isThemeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsThemeOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute right-0 mt-1.5 w-32 sm:w-36 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1"
                  >
                    {[
                      { value: 'system', label: 'System Default', icon: Monitor, color: 'text-accent' },
                      { value: 'light', label: 'Light Mode', icon: Sun, color: 'text-amber' },
                      { value: 'dark', label: 'Dark Mode', icon: Moon, color: 'text-teal-400 dark:text-accent-bright' }
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = theme === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => {
                            setTheme(item.value as 'light' | 'dark' | 'system');
                            localStorage.setItem('theme', item.value);
                            setIsThemeOpen(false);
                            toast(`Theme changed to ${item.label}`, { duration: 1500, icon: '🎨' });
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-bg-warm cursor-pointer font-semibold",
                            isActive ? "bg-accent/5 font-bold text-accent" : "text-text-secondary"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={cn("w-3.5 h-3.5", item.color)} />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-accent" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {onOpenEmergencySOS && (
            <button
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate([100, 50, 100]);
                }
                onOpenEmergencySOS();
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-coral/10 hover:bg-coral/20 border border-coral/30 text-coral hover:text-coral-bright font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all select-none cursor-pointer h-6 shrink-0 shadow-sm relative overflow-visible ring-2 ring-offset-1 ring-rose-600/50"
              title="Trigger Emergency Ambulance SOS"
            >
              <span className="absolute inset-0 rounded-full bg-coral/15 animate-sos-pulse-fast pointer-events-none" />
              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse shrink-0" />
              <span className="relative">SOS</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
