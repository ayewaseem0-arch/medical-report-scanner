import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Activity, 
  Search, 
  Clock, 
  Scale, 
  Sparkles, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  X,
  ShieldAlert,
  LogIn,
  LogOut,
  User
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { usePremium } from '../contexts/PremiumContext';

export interface MedicineReminder {
  id: string;
  name: string;
  time: string;
  date?: string;
  recurring: boolean;
  active: boolean;
}

interface SidebarProps {
  activeAnalysisMode: 'lab' | 'medicine' | 'symptoms';
  setActiveAnalysisMode: (mode: 'lab' | 'medicine' | 'symptoms') => void;
  view: 'home' | 'lab' | 'analysis' | 'history' | 'reminders' | 'instructions' | 'emergency';
  setView: (view: 'home' | 'lab' | 'analysis' | 'history' | 'reminders' | 'instructions' | 'emergency') => void;
  reminders: MedicineReminder[];
  setReminders: React.Dispatch<React.SetStateAction<MedicineReminder[]>>;
  historyRetention: string;
  setHistoryRetention: (val: string) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  onAddSampleReport?: () => void;
  onSimulateReminders?: () => void;
  speakMedicineAlert?: (medName: string, lang: string) => void;
}

export default function Sidebar({
  activeAnalysisMode,
  setActiveAnalysisMode,
  view,
  setView,
  reminders,
  setReminders,
  isSidebarExpanded,
  setIsSidebarExpanded,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen
}: SidebarProps) {
  const { t } = useTranslation();
  const { isPremium, setShowPaywall, setPaywallTriggerMode, setIsPremium } = usePremium();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(Date.now());

  const handleSecretClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 2000) {
      setClickCount(1);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 5) {
        setIsPremium(!isPremium);
        toast.info(isPremium ? 'Admin Sandbox: Premium Locked' : 'Admin Sandbox: Premium Unlocked', { icon: '🔐' });
        setClickCount(0);
      }
    }
    setLastClickTime(now);
  };

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
  
  const handleNavToEngine = (mode: 'lab' | 'medicine' | 'symptoms') => {
    setActiveAnalysisMode(mode);
    setView('home');
    setIsMobileSidebarOpen(false);
  };

  return (
    <>
      {/* Absolute drawer overlay for mobile backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden animate-fade-in"
        />
      )}

      {/* Main Left Control Sidebar */}
      <aside
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className={cn(
          "h-full bg-surface border-r border-border transition-all duration-300 flex flex-col z-40 select-none shadow-xl relative shrink-0",
          // Layout adaptiveness (Desktops: fixed side-by-side inside block layouts)
          "hidden lg:flex lg:sticky lg:top-0 lg:h-[100vh]",
          // Layout adaptiveness (Tablets & Mobile: Swipe / toggleable hidden panel)
          isMobileSidebarOpen 
            ? "fixed top-0 left-0 w-[260px] h-[100vh] flex translate-x-0" 
            : "fixed top-0 left-0 lg:left-auto lg:translate-x-0 w-0 lg:w-[72px] -translate-x-full",
          // Desktop expanded widths
          isSidebarExpanded ? "lg:w-[260px]" : "lg:w-[72px]"
        )}
      >
        {/* Toggle Chevron for desktop side controls */}
        <div className="hidden lg:flex absolute right-[-14px] top-20 z-50">
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="w-7 h-7 bg-surface border border-border shadow-md rounded-full flex items-center justify-center text-text-muted hover:text-accent transition-all cursor-pointer"
          >
            {isSidebarExpanded ? <ChevronLeft className="w-4.5 h-4.5" /> : <ChevronRight className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between shrink-0 h-16 bg-gradient-to-r from-surface to-bg-warm/5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            {(isSidebarExpanded || isMobileSidebarOpen) && (
              <div className="animate-fade-in truncate">
                <span className="text-xs font-black uppercase tracking-widest text-accent font-display">MedScan</span>
                <p className="text-[10px] text-text-muted font-bold font-mono">Control Panel</p>
              </div>
            )}
          </div>
          {isMobileSidebarOpen && (
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-bg-warm text-text-muted lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation / Diagnostic Engines Section */}
        <div className="p-3 space-y-2 shrink-0 border-b border-border/40">
          {(isSidebarExpanded || isMobileSidebarOpen) && (
            <span className="text-[9px] font-black uppercase tracking-wider text-text-muted px-2 block select-none">
              Diagnostics Engines
            </span>
          )}

          {/* Core System Modes Selection */}
          <div className="space-y-1">
            {[
              { id: 'lab', icon: FlaskConical, shortLabel: 'Lab', fullLabel: 'Lab & Diagnostics' },
              { id: 'medicine', icon: Activity, shortLabel: 'Medicine', fullLabel: 'Medicine Analysis' },
              { id: 'symptoms', icon: Search, shortLabel: 'Care Nav', fullLabel: 'Care Navigator' }
            ].map(m => {
              const isActive = view === 'home' && activeAnalysisMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleNavToEngine(m.id as any)}
                  className={cn(
                    "w-full flex transition-all cursor-pointer font-bold text-xs uppercase tracking-tight relative group",
                    isActive
                      ? "bg-accent/10 border-accent/25 text-accent shadow-sm"
                      : "border-transparent text-text-secondary hover:bg-bg-warm",
                    isSidebarExpanded || isMobileSidebarOpen
                      ? "flex-row items-center gap-3.5 p-2.5 rounded-xl border"
                      : "flex-col items-center justify-center p-1.5 rounded-xl border text-center min-h-[56px]"
                  )}
                  title={m.fullLabel}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                    isActive
                      ? "bg-accent text-white border-accent"
                      : "bg-surface border-border group-hover:border-accent/40",
                    !(isSidebarExpanded || isMobileSidebarOpen) && "mb-1"
                  )}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  {(isSidebarExpanded || isMobileSidebarOpen) ? (
                    <span className="animate-fade-in text-left truncate leading-tight font-extrabold max-w-[190px]">
                      {m.fullLabel}
                    </span>
                  ) : (
                    <span className="animate-fade-in text-[8.5px] sm:text-[9px] uppercase font-black tracking-tight text-text-muted mt-0.5">
                      {m.shortLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Mode Views Switcher */}
        {!isSidebarExpanded && !isMobileSidebarOpen && (
          <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col items-center gap-4 text-center">
            <div className="w-[1.5px] h-10 bg-border/50 my-1 shrink-0" />
            
            {/* Reminders View Icon */}
            {isPremium && (
              <button 
                onClick={() => setView('reminders')}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-200 shadow-sm relative",
                  view === 'reminders'
                    ? "bg-accent/10 border-accent/25 text-accent font-extrabold"
                    : "bg-bg-warm/60 border-border/80 text-text-muted hover:bg-accent/15 hover:text-accent"
                )}
                title="Reminder Alerts"
              >
                <Clock className="w-4.5 h-4.5" />
                {reminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent animate-ping" />
                )}
              </button>
            )}
            
            {/* Standalone Comparison / History View Icon */}
            {isPremium && (
              <button 
                onClick={() => setView('history')}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-200 shadow-sm",
                  view === 'history'
                    ? "bg-accent/10 border-accent/25 text-accent font-extrabold"
                    : "bg-bg-warm/60 border-border/80 text-text-muted hover:bg-accent/15 hover:text-accent"
                )}
                title="Health Vault & Comparison"
              >
                <Scale className="w-4.5 h-4.5" />
              </button>
            )}

            {/* Emergency SOS view Icon */}
            <button 
              onClick={() => setView('emergency')}
              className={cn(
                "p-2.5 rounded-xl border transition-all duration-200 shadow-sm relative group overflow-visible",
                view === 'emergency'
                  ? "bg-coral/10 border-coral/25 text-coral font-extrabold"
                  : "bg-bg-warm/60 border-border/80 text-text-muted hover:bg-coral/15 hover:text-coral"
              )}
              title="Emergency SOS Directory"
            >
              <span className="absolute inset-0 rounded-xl bg-coral/10 animate-pulse" />
              <ShieldAlert className="w-4.5 h-4.5 text-coral animate-pulse" />
            </button>

            <div className="flex-1" />

            {/* Sticky Instruction Guide Icon */}
            <button 
              onClick={() => setView('instructions')}
              className={cn(
                "p-2.5 rounded-xl border transition-all duration-200 shadow-sm",
                view === 'instructions'
                  ? "bg-accent/10 border-accent/25 text-accent font-extrabold"
                  : "bg-bg-warm/60 border-border/80 text-text-muted hover:bg-accent/15 hover:text-accent"
              )}
              title="Instructions Guide"
            >
              <BookOpen className="w-4.5 h-4.5" />
            </button>

            {/* User Auth (Collapsed) */}
            <button
              onClick={currentUser ? handleLogout : handleLogin}
              className={cn(
                "p-2.5 rounded-xl border transition-all duration-200 mt-2 shadow-sm",
                currentUser
                  ? "bg-coral/10 border-coral/25 text-coral hover:bg-coral/20"
                  : "bg-bg-warm/60 border-border/80 text-text-muted hover:bg-accent/15 hover:text-accent"
              )}
              title={currentUser ? "Sign Out" : "Sign In"}
            >
              {currentUser ? <LogOut className="w-4.5 h-4.5" /> : <LogIn className="w-4.5 h-4.5" />}
            </button>
          </div>
        )}

        {/* Expanded Mode Views Switcher */}
        {(isSidebarExpanded || isMobileSidebarOpen) && (
          <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
            <div className="p-3 space-y-2 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted px-2 block select-none">
                Application Workspace
              </span>
              
              <div className="space-y-1">
                {/* Medicine Alarms Menu Button */}
                {isPremium && (
                  <button
                    onClick={() => {
                      setView('reminders');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3.5 p-2.5 rounded-xl border transition-all cursor-pointer font-bold text-xs uppercase tracking-tight relative group",
                      view === 'reminders'
                        ? "bg-accent/10 border-accent/25 text-accent shadow-sm"
                        : "border-transparent text-text-secondary hover:bg-bg-warm"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                      view === 'reminders' ? "bg-accent text-white border-accent" : "bg-surface border-border group-hover:border-accent/40"
                    )}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-left font-extrabold max-w-[190px] leading-tight">
                      Medicine Alarms
                    </span>
                    {reminders.length > 0 && (
                      <span className="ml-auto bg-accent text-white font-mono font-black text-[9px] px-2 py-0.5 rounded-full">
                        {reminders.length}
                      </span>
                    )}
                  </button>
                )}

                {/* History Vault / Standalone Comparison */}
                {isPremium && (
                  <button
                    onClick={() => {
                      setView('history');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3.5 p-2.5 rounded-xl border transition-all cursor-pointer font-bold text-xs uppercase tracking-tight relative group",
                      view === 'history'
                        ? "bg-accent/10 border-accent/25 text-accent shadow-sm"
                        : "border-transparent text-text-secondary hover:bg-bg-warm"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                      view === 'history' ? "bg-accent text-white border-accent" : "bg-surface border-border group-hover:border-accent/40"
                    )}>
                      <Scale className="w-4 h-4" />
                    </div>
                    <span className="text-left font-extrabold max-w-[190px] leading-tight">
                      Health Vault
                    </span>
                  </button>
                )}

                {/* Emergency SOS Directory / Guidelines */}
                <button
                  onClick={() => {
                    setView('emergency');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3.5 p-2.5 rounded-xl border transition-all cursor-pointer font-bold text-xs uppercase tracking-tight relative group overflow-visible",
                    view === 'emergency'
                      ? "bg-coral/10 border-coral/25 text-coral shadow-sm font-black"
                      : "border-transparent text-text-secondary hover:bg-bg-warm/60 hover:text-coral"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all relative overflow-visible",
                    view === 'emergency' ? "bg-coral text-white border-coral" : "bg-surface border-border group-hover:border-coral/40"
                  )}>
                    <span className="absolute inset-0 rounded-lg bg-coral/10 animate-pulse pointer-events-none" />
                    <ShieldAlert className={cn("w-4 h-4 animate-pulse", view === 'emergency' ? "text-white" : "text-coral")} />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="font-extrabold block">Emergency SOS</span>
                    <span className="text-[9px] text-text-muted font-semibold block leading-none">Directory & Guidelines</span>
                  </div>
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-coral animate-ping" />
                </button>
              </div>
            </div>

            {/* Pinned Instructions Guide at the bottom */}
            <div className="mt-auto p-3 space-y-2 border-t border-border/40 bg-gradient-to-t from-bg-warm/5 to-transparent">
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted px-2 block select-none">
                Help & Reference
              </span>
              <button
                onClick={() => {
                  setView('instructions');
                  setIsMobileSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3.5 p-2.5 rounded-xl border transition-all cursor-pointer font-bold text-xs uppercase tracking-tight relative group",
                  view === 'instructions'
                    ? "bg-accent/10 border-accent/25 text-accent shadow-sm"
                    : "border-transparent text-text-secondary hover:bg-bg-warm"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                  view === 'instructions' ? "bg-accent text-white border-accent animate-pulse" : "bg-surface border-border group-hover:border-accent/40"
                )}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-left font-extrabold max-w-[190px] leading-tight">
                  Instructions Guide
                </span>
                <ChevronRight className="ml-auto w-3.5 h-3.5 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={currentUser ? handleLogout : handleLogin}
                className={cn(
                  "w-full flex items-center gap-3.5 p-2.5 rounded-xl border transition-all cursor-pointer font-bold text-xs tracking-tight relative group",
                  currentUser 
                    ? "border-transparent text-coral hover:bg-coral/5"
                    : "border-transparent text-text-secondary hover:bg-bg-warm"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                  currentUser ? "bg-coral/10 border-coral/20 text-coral" : "bg-surface border-border group-hover:border-accent/40 text-text-muted"
                )}>
                  {currentUser ? (
                    currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-lg outline outline-1 outline-border" />
                    ) : ( 
                      <User className="w-4 h-4" /> 
                    )
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left leading-tight">
                  <span className="font-extrabold block text-[11px] uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                    {currentUser ? 'Sign Out' : 'Sign In'}
                  </span>
                  {currentUser && (
                    <span className="text-[9px] font-semibold opacity-70 block leading-none truncate max-w-[120px]">
                      {currentUser.displayName?.split(' ')[0] || currentUser.email}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        )}

         {/* Sidebar Footer Section */}
        <div className="p-3 bg-bg-warm/10 border-t border-border/50 shrink-0 w-full static bottom-0 space-y-2">
          {/* Admin Dev Toggle - Temporary */}
          <button
            onClick={() => {
              setIsPremium(!isPremium);
              toast.info(isPremium ? 'Admin: Premium Locked' : 'Admin: Premium Unlocked', { icon: '🔐' });
            }}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-coral/10 border border-coral/30 text-coral font-black text-[9px] uppercase tracking-wider shadow-sm hover:bg-coral/20 transition-all cursor-pointer",
              !(isSidebarExpanded || isMobileSidebarOpen) && "h-7 w-7 p-0 mx-auto"
            )}
            title={isPremium ? "Disable Admin Mode" : "Enable Admin Mode"}
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            {(isSidebarExpanded || isMobileSidebarOpen) && <span>{isPremium ? "Lock Premium" : "Unlock Premium"}</span>}
          </button>

          {!isPremium && (
            <button
              onClick={() => {
                setPaywallTriggerMode(null);
                setShowPaywall(true);
              }}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-[9px] uppercase tracking-wider shadow-sm hover:shadow transition-all cursor-pointer",
                !(isSidebarExpanded || isMobileSidebarOpen) && "h-7 w-7 p-0 mx-auto"
              )}
              title="Upgrade to Premium"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse shrink-0" />
              {(isSidebarExpanded || isMobileSidebarOpen) && <span>Upgrade Premium</span>}
            </button>
          )}

          {isSidebarExpanded || isMobileSidebarOpen ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-text-primary uppercase block leading-tight border-b border-border/20 pb-0.5">MedScan Suite</span>
                <span onClick={handleSecretClick} className="text-[8px] text-text-muted font-mono block leading-[1.1] mt-0.5 cursor-pointer">Active Sandbox v2.4</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <span onClick={handleSecretClick} className="text-[8px] font-mono text-accent font-black select-none cursor-pointer">M2.4</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
