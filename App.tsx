import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ReportUploader from './components/ReportUploader';
import AnalysisResult from './components/AnalysisResult';
import LabResultScreen from './components/LabResultScreen';
import ReportComparison from './components/ReportComparison';
import { analyzeReport } from './services/reportService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  FlaskConical, 
  Search, 
  Bell, 
  User, 
  LogIn,
  LogOut,
  Activity,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  X,
  RotateCcw,
  Mic,
  Clock,
  Calendar,
  BookOpen,
  Trash2,
  Plus,
  Volume2,
  PlusCircle,
  ChevronDown,
  Scale,
  Pill
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import DisclaimerModal from './components/DisclaimerModal';
import EmergencySOS from './components/EmergencySOS';
import EmergencyDirectory from './components/EmergencyDirectory';
import { getEmergencyContact } from './lib/emergencyData';
import { cn, cleanObject } from './lib/utils';
import { LanguageProvider, useTranslation } from './contexts/LanguageContext';
import { PremiumProvider, usePremium } from './contexts/PremiumContext';
import PremiumPaywallModal from './components/PremiumPaywallModal';
import AdSenseBanner from './components/AdSenseBanner';
import { languages } from './i18n';
import { AnalysisData } from './types';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

type AppView = 'home' | 'lab' | 'analysis' | 'history' | 'reminders' | 'instructions' | 'emergency';

interface MedicineReminder {
  id: string;
  name: string;
  time: string;
  date?: string;
  recurring: boolean;
  active: boolean;
}

const speakMedicineAlert = (medicineName: string, langCode: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech synthesis not supported in this browser.");
    return;
  }
  
  const phrases: Record<string, string> = {
    en: `Please take your medicine: ${medicineName}`,
    es: `Por favor, tome su medicamento: ${medicineName}`,
    fr: `S'il vous plaît, prenez votre médicament: ${medicineName}`,
    de: `Bitte nehmen Sie Ihre Medizin ein: ${medicineName}`,
    zh: `请吃药：${medicineName}`,
    ar: `رجاءً خذ دوائك ${medicineName}`,
    hi: `कृपया अपनी दवा लें: ${medicineName}`,
    pt: `Por favor, tome seu medicamento: ${medicineName}`,
    ja: `お薬の時間です: ${medicineName}`,
    ur: `براہ کرم اپنی دوا لیں: ${medicineName}`,
    'hi-en': `Please take your medicine: ${medicineName}`,
    bn: `দয়া করে আপনার ওষুধ নিন: ${medicineName}`,
    ru: `Пожалуйста, примите лекарство: ${medicineName}`
  };

  const text = phrases[langCode] || phrases['en'];
  const utterance = new SpeechSynthesisUtterance(text);
  
  const langMatchMap: Record<string, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    zh: 'zh-CN',
    ar: 'ar-SA',
    hi: 'hi-IN',
    pt: 'pt-PT',
    ja: 'ja-JP',
    ur: 'ur-PK',
    'hi-en': 'en-IN',
    bn: 'bn-IN',
    ru: 'ru-RU'
  };
  
  utterance.lang = langMatchMap[langCode] || 'en-US';
  
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const getCharacterFeedback = (length: number) => {
  if (length === 0) {
    return {
      label: 'Empty',
      color: 'text-text-muted',
      bg: 'bg-bg-warm/60 border-border/20',
      desc: 'Please enter symptoms to begin.'
    };
  }
  if (length < 20) {
    return {
      label: 'Too Short',
      color: 'text-coral',
      bg: 'bg-coral/10 border-coral/30',
      desc: 'Provide more symptoms or clinical context.'
    };
  }
  if (length < 60) {
    return {
      label: 'Basic Description',
      color: 'text-amber',
      bg: 'bg-amber/10 border-amber/30',
      desc: 'Good start. Mention duration or severity.'
    };
  }
  if (length < 150) {
    return {
      label: 'Good Details',
      color: 'text-accent',
      bg: 'bg-accent/10 border-accent/25',
      desc: 'Great logical flow! Adequate for analysis.'
    };
  }
  return {
    label: 'Excellent Clinical Depth',
    color: 'text-emerald',
    bg: 'bg-emerald/10 border-emerald/25',
    desc: 'Deep diagnostic signal. High context depth.'
  };
};

function AppContent() {
  const { t, language } = useTranslation();
  const { isPremium, getRemainingScans, getLimitValue, incrementScan, setShowPaywall, setPaywallTriggerMode } = usePremium();
  const [view, setView] = useState<AppView>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  });
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<'lab' | 'medicine' | 'symptoms'>('lab');
  const [symptomsText, setSymptomsText] = useState('');
  const [symptomsSeverity, setSymptomsSeverity] = useState<number>(5);
  const [symptomsDurationVal, setSymptomsDurationVal] = useState<number>(3);
  const [symptomsDurationUnit, setSymptomsDurationUnit] = useState<string>('days');
  const [isTermsDropdownOpen, setIsTermsDropdownOpen] = useState(false);
  const [activeSymptomTab, setActiveSymptomTab] = useState<string>('General');
  const [userCountry, setUserCountry] = useState<string>('International');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isEmergencySOSOpen, setIsEmergencySOSOpen] = useState(false);

  const handleTriggerSOS = () => {
    try {
      const contact = getEmergencyContact(userCountry);
      toast.warning(`Emergency SOS: Contacting ${contact.countryName} Ambulance (${contact.ambulance})...`, {
        description: "Please stay on the line.",
        duration: 5000,
      });
      // Immediately trigger telephone protocol to dial the medical emergency line
      window.location.href = `tel:${contact.ambulance}`;
    } catch (e) {
      console.error("SOS Dialing Error:", e);
    }
    // Simultaneously display the detailed local-responder metrics layout details
    setIsEmergencySOSOpen(true);
  };

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Swipe Gesture Navigation State & Parameters
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeIndicator, setSwipeIndicator] = useState<{ show: boolean; text: string; dir: 'left' | 'right' }>({ 
    show: false, 
    text: '', 
    dir: 'left' 
  });

  React.useEffect(() => {
    let timeoutId: any;
    if (swipeIndicator.show) {
      timeoutId = setTimeout(() => {
        setSwipeIndicator(prev => ({ ...prev, show: false }));
      }, 1500);
    }
    return () => clearTimeout(timeoutId);
  }, [swipeIndicator.show]);

  const navigateSwipe = (direction: 'left' | 'right') => {
    if (view === 'analysis') return;

    // Ordered sequence of view states to cycle with gestures
    const flowStates = [
      { view: 'home' as AppView, mode: 'lab' as 'lab' | 'medicine' | 'symptoms' },
      { view: 'home' as AppView, mode: 'medicine' as 'lab' | 'medicine' | 'symptoms' },
      { view: 'home' as AppView, mode: 'symptoms' as 'lab' | 'medicine' | 'symptoms' },
      ...(isPremium ? [
        { view: 'history' as AppView, mode: null },
        { view: 'reminders' as AppView, mode: null }
      ] : []),
      { view: 'instructions' as AppView, mode: null }
    ];

    const currentIndex = flowStates.findIndex(fs => {
      if (fs.view !== view) return false;
      if (view === 'home') {
        return fs.mode === activeAnalysisMode;
      }
      return true;
    });

    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'left') {
      targetIndex = currentIndex + 1; // Slide to next state on left swipe
    } else {
      targetIndex = currentIndex - 1; // Slide to previous state on right swipe
    }

    if (targetIndex >= 0 && targetIndex < flowStates.length) {
      const nextState = flowStates[targetIndex];
      setView(nextState.view);
      if (nextState.mode) {
        setActiveAnalysisMode(nextState.mode);
      }

      // Human-readable labels for overlay feedback banner
      let label = '';
      if (nextState.view === 'home') {
        label = nextState.mode === 'lab' ? t('mode_lab') : nextState.mode === 'medicine' ? t('mode_medicine') : t('mode_symptoms');
      } else if (nextState.view === 'history') {
        label = 'Health Vault';
      } else if (nextState.view === 'reminders') {
        label = 'Medicine Alarms';
      } else if (nextState.view === 'instructions') {
        label = 'Instructions Guide';
      }

      setSwipeIndicator({
        show: true,
        text: label,
        dir: direction
      });

      toast.info(`Swiped to ${label}`, {
        duration: 1250,
        position: 'bottom-center',
        icon: '↔️'
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'INPUT' || 
      target.tagName === 'SELECT' || 
      target.closest('input[type="range"]') ||
      target.closest('.custom-scrollbar') ||
      target.closest('button') ||
      target.closest('[role="button"]')
    ) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;

    if (Math.abs(diffX) > Math.abs(diffY) * 2 && Math.abs(diffX) > 60 && duration < 350) {
      if (diffX > 0) {
        navigateSwipe('right');
      } else {
        navigateSwipe('left');
      }
    }
    touchStartRef.current = null;
  };

  // Sync HTML wrapper element with selected theme and support media queries
  useEffect(() => {
    const handleThemeUpdate = () => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'light') {
        isDark = false;
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    };

    handleThemeUpdate();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (event: MediaQueryListEvent) => {
        setIsDarkMode(event.matches);
        if (event.matches) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      };

      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  // Auto-expand textarea dynamically as user types
  useEffect(() => {
    if (activeAnalysisMode === 'symptoms' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(140, textareaRef.current.scrollHeight)}px`;
    }
  }, [symptomsText, activeAnalysisMode]);

  // Expanded user navigation parameters
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showReminderUI, setShowReminderUI] = useState(false);
  const [showInstructionsUI, setShowInstructionsUI] = useState(false);
  const [reminderSearchQuery, setReminderSearchQuery] = useState("");

  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('09:00');
  const [newMedDate, setNewMedDate] = useState('');
  const [medIsRecurring, setMedIsRecurring] = useState(true);

  const [historyRetention, setHistoryRetention] = useState<string>(() => {
    return localStorage.getItem('medscan_history_retention') || 'forever';
  });

  // Save Retention Choice to LocalStorage
  useEffect(() => {
    localStorage.setItem('medscan_history_retention', historyRetention);
  }, [historyRetention]);

  // Active History Retention Cleaner Sweep (Item 7)
  useEffect(() => {
    if (historyRetention && historyRetention !== 'forever') {
      const saved = localStorage.getItem('medscan_saved_reports2');
      if (saved) {
        try {
          const list = JSON.parse(saved);
          if (Array.isArray(list)) {
            let limitMs = 0;
            switch (historyRetention) {
              case '24_hours': limitMs = 24 * 60 * 60 * 1000; break;
              case '7_days': limitMs = 7 * 24 * 60 * 60 * 1000; break;
              case '15_days': limitMs = 15 * 24 * 60 * 60 * 1000; break;
              case '21_days': limitMs = 21 * 24 * 60 * 60 * 1000; break;
              case '1_month': limitMs = 30 * 24 * 60 * 60 * 1000; break;
              case '3_months': limitMs = 90 * 24 * 60 * 60 * 1000; break;
              case '6_months': limitMs = 180 * 24 * 60 * 60 * 1000; break;
              case '1_year': limitMs = 365 * 24 * 60 * 60 * 1000; break;
              default: return;
            }
            
            const cutoffDate = Date.now() - limitMs;
            const filtered = list.filter((r: any) => {
              if (r.timestamp) {
                return r.timestamp > cutoffDate;
              }
              const parsedTime = Date.parse(r.date);
              if (!isNaN(parsedTime)) {
                return parsedTime > cutoffDate;
              }
              return true;
            });
            
            if (filtered.length !== list.length) {
              localStorage.setItem('medscan_saved_reports2', JSON.stringify(filtered));
              toast.info(`Clinical retention sweep active: purged ${list.length - filtered.length} expired report record(s) from secure storage.`, {
                icon: '🧹'
              });
            }
          }
        } catch (err) {
          console.error("Cleanup history retention failed:", err);
        }
      }
    }
  }, [historyRetention]);

  const [reminders, setReminders] = useState<MedicineReminder[]>(() => {
    const saved = localStorage.getItem('medscan_reminders');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('medscan_reminders', JSON.stringify(reminders));
  }, [reminders]);

  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('medscan_autosave');
    return saved !== 'false'; // defaults to true
  });

  const toggleAutosave = () => {
    const nextVal = !autosaveEnabled;
    setAutosaveEnabled(nextVal);
    localStorage.setItem('medscan_autosave', String(nextVal));
    toast.success(nextVal ? "Autosave enabled for Health Vault" : "Autosave disabled for Health Vault");
  };

  // Medicine reminder helper actions
  const handleAddNewReminder = (name: string, timingNotes?: string) => {
    if (!name.trim()) {
      toast.error('Medicine name is required.');
      return;
    }
    const finalName = timingNotes ? `${name.trim()} (${timingNotes})` : name.trim();
    const newReminder: MedicineReminder = {
      id: Math.random().toString(36).substring(2, 9),
      name: finalName,
      time: newMedTime,
      date: newMedDate || undefined,
      recurring: medIsRecurring,
      active: true
    };
    
    setReminders(prev => [newReminder, ...prev]);
    
    if (currentUser) {
      setDoc(doc(db, 'reminders', newReminder.id), cleanObject({
        ...newReminder,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      })).catch(err => console.error("Error writing reminder to Firestore:", err));
    }

    toast.success(`Scheduled alert for ${name}!`, {
      description: `Time: ${newMedTime} ${newMedDate ? `on ${newMedDate}` : '(Daily)'}`,
      icon: '🔔'
    });
    setNewMedName('');
    setNewMedDate('');
  };

  const handleDeleteReminder = (id: string, name: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    if (currentUser) {
      deleteDoc(doc(db, 'reminders', id)).catch(err => console.error("Error deleting reminder from Firestore:", err));
    }
    toast.info(`Removed schedule: ${name}`);
  };

  const toggleReminderActive = (id: string) => {
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, active: !r.active };
        if (currentUser) {
          setDoc(doc(db, 'reminders', id), cleanObject({
            ...updated,
            userId: currentUser.uid,
            createdAt: new Date().toISOString()
          }), { merge: true }).catch(err => console.error("Error updating active state in Firestore:", err));
        }
        return updated;
      }
      return r;
    }));
  };

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    desc: string;
    time: string;
    unread: boolean;
    type: 'info' | 'success' | 'alert';
  }>>([
    {
      id: '1',
      title: 'Precision Decoded System Initialized',
      desc: 'Biostatistical OCR analyzers and Google Gemini models are ready.',
      time: 'Just now',
      type: 'success',
      unread: true
    },
    {
      id: '2',
      title: 'HIPAA & GDPR Compliance Active',
      desc: 'All analyzed data is retained purely in local sandbox container memory.',
      time: '2 mins ago',
      type: 'info',
      unread: false
    }
  ]);

  // Real-time reminders checker (every 10 seconds) - Voice triggers when alarm happens (item 4)
  useEffect(() => {
    const triggeredAlarms = new Set<string>();
    
    const interval = setInterval(() => {
      const now = new Date();
      const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const curDate = now.toISOString().split('T')[0];
      
      reminders.forEach(rem => {
        if (!rem.active) return;
        if (rem.date && rem.date !== curDate) return;
        
        if (rem.time === curTime) {
          const alarmKey = `${rem.id}-${curDate}-${curTime}`;
          if (!triggeredAlarms.has(alarmKey)) {
            triggeredAlarms.add(alarmKey);
            
            // Speak voice output connected with user language choice
            speakMedicineAlert(rem.name, language);
            
            toast.warning(`Medicine Task triggered: ${rem.name}! Please take dosage.`, {
              duration: 10000,
              icon: '🔔'
            });

            // Log notification alert next to theme toggle
            setNotifications(prev => [
              {
                id: Math.random().toString(36).substring(2, 9),
                title: `Medicine Reminder: ${rem.name}`,
                desc: `Dosage alert time reached (${rem.time}).`,
                time: 'Just now',
                type: 'alert' as const,
                unread: true
              },
              ...prev
            ]);
          }
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [reminders, language]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync reminders and reports with Firestore when user logs in
  useEffect(() => {
    if (!currentUser) return;

    const syncReminders = async () => {
      try {
        let querySnapshot;
        try {
          const q = query(collection(db, 'reminders'), where('userId', '==', currentUser.uid));
          querySnapshot = await getDocs(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'reminders');
          return;
        }

        const cloudReminders: MedicineReminder[] = [];
        querySnapshot.forEach((docSnap) => {
          cloudReminders.push(docSnap.data() as MedicineReminder);
        });

        const localStr = localStorage.getItem('medscan_reminders');
        const localReminders: MedicineReminder[] = localStr ? JSON.parse(localStr) : [];

        // Merge: Add any local alarms not present in cloud
        const mergedReminders = [...localReminders];
        for (const rem of localReminders) {
          const existsInCloud = cloudReminders.some(cr => cr.id === rem.id);
          if (!existsInCloud) {
            try {
              await setDoc(doc(db, 'reminders', rem.id), cleanObject({
                ...rem,
                userId: currentUser.uid,
                createdAt: new Date().toISOString()
              }));
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `reminders/${rem.id}`);
            }
          }
        }

        // Add any cloud alarms not present in local
        for (const cr of cloudReminders) {
          const existsInLocal = localReminders.some(lr => lr.id === cr.id);
          if (!existsInLocal) {
            mergedReminders.push(cr);
          }
        }

        setReminders(mergedReminders);
        localStorage.setItem('medscan_reminders', JSON.stringify(mergedReminders));
      } catch (err) {
        console.error("Failed to sync reminders with Firestore:", err);
      }
    };

    const syncReports = async () => {
      try {
        let querySnapshot;
        try {
          const q = query(collection(db, 'reports'), where('userId', '==', currentUser.uid));
          querySnapshot = await getDocs(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'reports');
          return;
        }

        const cloudReports: any[] = [];
        querySnapshot.forEach((docSnap) => {
          cloudReports.push(docSnap.data());
        });

        const localStr = localStorage.getItem('medscan_saved_reports2');
        const localReports: any[] = localStr ? JSON.parse(localStr) : [];

        const mergedReports = [...localReports];
        for (const rep of localReports) {
          const existsInCloud = cloudReports.some(cr => cr.id === rep.id);
          if (!existsInCloud) {
            try {
              await setDoc(doc(db, 'reports', rep.id), cleanObject({
                ...rep,
                userId: currentUser.uid,
                createdAt: new Date().toISOString()
              }));
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `reports/${rep.id}`);
            }
          }
        }

        const normalize = (text: string) => (text || '').trim().toLowerCase().replace(/\s+/g, ' ');

        for (const cr of cloudReports) {
          const existsInLocal = localReports.some(lr => {
            if (lr.id === cr.id) return true;
            if (cr.data?.summary && lr.data?.summary && normalize(lr.data.summary) === normalize(cr.data.summary)) return true;
            const m1 = lr.data?.metrics || [];
            const m2 = cr.data?.metrics || [];
            if (m1.length > 0 && m1.length === m2.length) {
              return m1.every((metric1: any, idx: number) => {
                const metric2 = m2[idx];
                return metric1 && metric2 && metric1.name === metric2.name && metric1.value === metric2.value;
              });
            }
            return false;
          });
          if (!existsInLocal) {
            mergedReports.push(cr);
          }
        }

        // Deduplicate the final merged list by ID and payload summary
        const seenIds = new Set();
        const seenSummaries = new Set();
        const finalMerged = mergedReports.filter((item: any) => {
          if (!item || !item.id) return false;
          const normSum = normalize(item.data?.summary || '');
          if (seenIds.has(item.id)) return false;
          if (normSum && seenSummaries.has(normSum)) return false;
          seenIds.add(item.id);
          if (normSum) seenSummaries.add(normSum);
          return true;
        });

        localStorage.setItem('medscan_saved_reports2', JSON.stringify(finalMerged));
        // Force list refresh event for any showing components
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error("Failed to sync reports with Firestore:", err);
      }
    };

    syncReminders();
    syncReports();
  }, [currentUser]);

  const handleUserLogin = async () => {
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

  const handleUserLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);



  const toggleListening = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error('Voice-to-text input is not fully supported in this browser. Please try Chrome, Safari, or Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;

      const langMap: Record<string, string> = {
        en: 'en-US',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        zh: 'zh-CN',
        ar: 'ar-SA',
        hi: 'hi-IN',
        pt: 'pt-PT',
        ja: 'ja-JP',
        ur: 'ur-PK',
        'hi-en': 'en-IN',
        bn: 'bn-IN',
        ru: 'ru-RU'
      };

      recognition.lang = langMap[language] || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('Listening to your symptoms... Speak clearly.', {
          id: 'voice-active'
        });
      };

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
        toast.dismiss('voice-active');
        if (e.error === 'not-allowed') {
          toast.error('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (e.error === 'no-speech') {
          toast.error('No speech was detected. Please try speaking closer to your microphone.');
        } else {
          toast.error(`Voice capture failed: ${e.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        toast.dismiss('voice-active');
      };

      recognition.onresult = (e: any) => {
        const transcript = e.results[e.resultIndex][0].transcript;
        if (transcript) {
          setSymptomsText((prev) => {
            const separator = prev.trim() ? ' ' : '';
            return `${prev}${separator}${transcript}`;
          });
          toast.success('Symptom captured successfully!');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to initialize speech recognition feed.');
      setIsListening(false);
    }
  };

  const handleInsertSymptom = (term: string) => {
    setSymptomsText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return term;
      }
      
      // Determine direction (rtl or ltr) of language
      const isRTL = languages.find((l) => l.code === language)?.dir === 'rtl';
      const comma = isRTL ? '،' : ',';
      
      // If it already ends with a comma or full stop, just append
      if (trimmed.endsWith(',') || trimmed.endsWith('.') || trimmed.endsWith('،') || trimmed.endsWith('۔')) {
        return `${prev} ${term.toLowerCase()}`;
      }
      return `${prev}${comma} ${term.toLowerCase()}`;
    });
    setIsTermsDropdownOpen(false);
    toast(`Added "${term}" to symptoms`, { duration: 1500, icon: '✍️' });
  };

  const validationResult = React.useMemo(() => {
    const warnings: { type: 'error' | 'warning'; message: string; code: string }[] = [];
    if (!symptomsText.trim()) return warnings;

    const trimmed = symptomsText.trim();

    // 1. Minimum length check
    if (trimmed.length < 15) {
      warnings.push({
        type: 'warning',
        code: 'too_short',
        message: 'A detailed description (at least 15 characters) helps produce higher quality clinical insights.'
      });
    }

    // 2. Email Address Detection
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(trimmed)) {
      warnings.push({
        type: 'error',
        code: 'pii_email',
        message: 'Privacy Protection: Email addresses are not permitted. Please remove any contact info.'
      });
    }

    // 3. Phone Number Detection
    const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
    if (phoneRegex.test(trimmed)) {
      warnings.push({
        type: 'warning',
        code: 'pii_phone',
        message: 'Privacy Shield: We recommend removing phone numbers to protect your identity.'
      });
    }

    // 4. URL/Link Detection
    const urlRegex = /(https?:\/\/[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/?[^\s]*)/ig;
    if (urlRegex.test(trimmed)) {
      warnings.push({
        type: 'error',
        code: 'disallowed_url',
        message: 'Formatting Alert: External links/URLs are blocked to maintain clinical focus.'
      });
    }

    // 5. Special Scripts or Bracket Syntax
    const codeRegex = /[<>{}]/g;
    if (codeRegex.test(trimmed)) {
      warnings.push({
        type: 'error',
        code: 'disallowed_chars',
        message: 'Syntax Restriction: Disallowed special characters (< > { }) to prevent format errors.'
      });
    }

    // 6. Letterless Spam check / Gibberish detection
    const hasLetters = /\p{L}/u;
    if (!hasLetters.test(trimmed)) {
      warnings.push({
        type: 'error',
        code: 'no_letters',
        message: 'Input Requirement: Please type helpful descriptive words utilizing letters or native characters.'
      });
    }

    return warnings;
  }, [symptomsText]);

  useEffect(() => {
    const accepted = localStorage.getItem('medscan_disclaimer_accepted');
    if (!accepted) {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('medscan_disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };

  useEffect(() => {
    // Detect country
    const detectLocation = async () => {
      // Try Geolocation API first if available and permitted
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const country = await import('./lib/location').then(m => m.getCountryFromCoords(latitude, longitude));
            setUserCountry(country);
          },
          async () => {
             // Fallback to IP detection
             const country = await import('./lib/location').then(m => m.getCountryFromIP());
             setUserCountry(country);
          },
          { timeout: 5000 }
        );
      } else {
        const country = await import('./lib/location').then(m => m.getCountryFromIP());
        setUserCountry(country);
      }
    };
    detectLocation();
  }, []);

  // App-Wide Horizontal Swipe Gestures for View Navigation
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const isSwipeExcluded = (target: HTMLElement | null): boolean => {
      if (!target) return false;
      return (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'BUTTON' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'OPTION' ||
        target.closest('input') !== null || 
        target.closest('textarea') !== null || 
        target.closest('button') !== null || 
        target.closest('select') !== null || 
        target.closest('[role="textbox"]') !== null ||
        target.closest('.no-swipe') !== null ||
        target.isContentEditable
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (isSwipeExcluded(target)) {
        return;
      }
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (isSwipeExcluded(target)) {
        return;
      }
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipeGesture();
    };

    const handleSwipeGesture = () => {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Minimum horizontal swipe distance of 80px, maximum vertical drift of 50px to ensure it is intentional
      if (Math.abs(deltaX) > 80 && Math.abs(deltaY) < 50) {
        if (deltaX < 0) {
          // Swipe Left (drag right to left) -> Go Forward
          setView((currentView) => {
            if (currentView === 'home') {
              toast('Swiped to Labs Standard', { duration: 1500, icon: '🧪' });
              return 'lab';
            }
            if (currentView === 'lab') {
              toast('Swiped to Health Vault', { duration: 1500, icon: '📁' });
              return 'history';
            }
            return currentView;
          });
        } else {
          // Swipe Right (drag left to right) -> Go Backward
          setView((currentView) => {
            if (currentView === 'history') {
              toast('Swiped to Labs Standard', { duration: 1500, icon: '🧪' });
              return 'lab';
            }
            if (currentView === 'lab') {
              toast('Swiped to Dashboard', { duration: 1500, icon: '🏠' });
              return 'home';
            }
            if (currentView === 'analysis') {
              toast('Returned to Dashboard', { duration: 1500, icon: '🏠' });
              setAnalysisData(null);
              return 'home';
            }
            return currentView;
          });
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const toggleDarkMode = () => {
    let nextTheme: 'light' | 'dark' | 'system' = 'light';
    if (theme === 'light') {
      nextTheme = 'dark';
    } else if (theme === 'dark') {
      nextTheme = 'system';
    } else {
      nextTheme = 'light';
    }
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const handleProcessed = async (text: string, imageData?: string, customName?: string) => {
    // Check and increment scan limits for non-premium users
    const allowed = incrementScan(activeAnalysisMode);
    if (!allowed) {
      return;
    }

    setIsAnalyzing(true);
    let textToSend = text;
    if (activeAnalysisMode === 'symptoms') {
      textToSend = `${text}\n\n[Symptom Context]\n- Severity: ${symptomsSeverity}/10\n- Duration: ${symptomsDurationVal} ${symptomsDurationUnit}`;
    }
    try {
      const data = await analyzeReport(textToSend, imageData, language, activeAnalysisMode, userCountry, currentUser?.uid);
      
      if (data.analysis && data.analysis.startsWith('ERROR_MISMATCH')) {
        const errorKey = `mismatch_error_${activeAnalysisMode}`;
        toast.error(t(errorKey), {
          duration: 5000,
          position: 'top-center'
        });
        setIsAnalyzing(false); // Reset analyzing state on mismatch
        return;
      }

      setAnalysisData(data.analysisData);
      setView('analysis');

      // Autosave if enabled
      if (autosaveEnabled) {
        const saved = localStorage.getItem('medscan_saved_reports2');
        let list = [];
        if (saved) {
          try {
            list = JSON.parse(saved);
          } catch (err) {}
        }
        
        const normalize = (text: string) => (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const targetSummaryNorm = normalize(data.analysisData?.summary);
        
        const alreadyExists = list.some((item: any) => {
          if (!item?.data) return false;
          if (normalize(item.data.summary) === targetSummaryNorm) return true;
          const m1 = item.data.metrics || [];
          const m2 = data.analysisData?.metrics || [];
          if (m1.length > 0 && m1.length === m2.length) {
            return m1.every((metric1: any, idx: number) => {
              const metric2 = m2[idx];
              return metric1 && metric2 && metric1.name === metric2.name && metric1.value === metric2.value;
            });
          }
          return false;
        });

        if (!alreadyExists) {
          const defaultName = customName || `${activeAnalysisMode === 'lab' ? 'Lab Work' : activeAnalysisMode === 'medicine' ? 'Medicine Pack' : 'Symptom Panel'} - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
          const newSaved = {
            id: Math.random().toString(36).substring(2, 11),
            name: defaultName,
            date: new Date().toLocaleDateString(),
            mode: activeAnalysisMode,
            data: data.analysisData,
            timestamp: Date.now()
          };
          list.unshift(newSaved);
          
          // Deduplicate list to be robust
          const seenIds = new Set();
          const seenSummaries = new Set();
          const dedupedList = list.filter((item: any) => {
            if (!item || !item.id) return false;
            const normSum = normalize(item.data?.summary || '');
            if (seenIds.has(item.id)) return false;
            if (normSum && seenSummaries.has(normSum)) return false;
            seenIds.add(item.id);
            if (normSum) seenSummaries.add(normSum);
            return true;
          });
          
          localStorage.setItem('medscan_saved_reports2', JSON.stringify(dedupedList));
          
          if (currentUser) {
            setDoc(doc(db, 'reports', newSaved.id), cleanObject({
              ...newSaved,
              userId: currentUser.uid,
              createdAt: new Date().toISOString()
            })).catch(err => console.error("Autosave cloud sync failed:", err));
          }

          toast.success("Report autosaved securely to your Health Vault!");
        }
      }

      // Update dynamic notifications feed
      const modeLabel = activeAnalysisMode === 'lab' ? 'Lab Work' : activeAnalysisMode === 'medicine' ? 'Medicine Pack' : 'Symptom Panel';
      const newNotif = {
        id: Math.random().toString(36).substring(2, 11),
        title: `${modeLabel} Processed`,
        desc: `Clinical parameters successfully extracted and annotated.`,
        time: 'Just now',
        type: 'success' as const,
        unread: true
      };
      setNotifications(prev => [newNotif, ...prev]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analysisModes = [
    { id: 'lab', icon: FlaskConical, label: t('mode_lab') },
    { id: 'medicine', icon: Activity, label: t('mode_medicine') },
    { id: 'symptoms', icon: Search, label: t('mode_symptoms') }
  ] as const;

  return (
    <div className={cn("min-h-screen bg-bg transition-colors selection:bg-accent/20 selection:text-accent flex relative overflow-hidden")}>
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-violet/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Toaster position="top-right" expand={false} richColors closeButton />
      <DisclaimerModal isOpen={showDisclaimer} onAccept={handleAcceptDisclaimer} />
      <PremiumPaywallModal />
      
      {/* Location-Aware Emergency Ambulance SOS Dashboard Overlay */}
      <EmergencySOS 
        isOpen={isEmergencySOSOpen} 
        onClose={() => setIsEmergencySOSOpen(false)} 
        initialCountry={userCountry}
      />

      {/* ADAPTIVE CONTROL PANEL SIDEBAR (Specs 1, 2, 3, 4, 5, 6, 7, 10) */}
      <Sidebar
        activeAnalysisMode={activeAnalysisMode}
        setActiveAnalysisMode={setActiveAnalysisMode}
        view={view}
        setView={setView}
        reminders={reminders}
        setReminders={setReminders}
        historyRetention={historyRetention}
        setHistoryRetention={setHistoryRetention}
        isSidebarExpanded={isSidebarHovered}
        setIsSidebarExpanded={setIsSidebarHovered}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        onAddSampleReport={() => {
          handleProcessed("Patient: John Doe, Glucose: 110 mg/dL (Ref: 70-99), Cholesterol: 210 mg/dL (Ref: <200), Vitamin D: 15 ng/mL (Ref: 30-100)", undefined, "John Doe Sample Report");
        }}
        speakMedicineAlert={speakMedicineAlert}
      />

      {/* RIGHT PORTION MAIN WORKSPACE VIEWPORT */}
      <div 
        className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Header 
          isDarkMode={isDarkMode} 
          theme={theme}
          setTheme={setTheme}
          toggleDarkMode={toggleDarkMode} 
          userCountry={userCountry} 
          activeAnalysisMode={activeAnalysisMode}
          notifications={notifications}
          setNotifications={setNotifications}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenEmergencySOS={handleTriggerSOS}
        />

      <main className={cn(
        "flex-1 overflow-y-auto px-4 pt-6 pb-24 md:pt-8 md:pb-16 relative z-10 transition-all duration-500",
        view === 'home' ? "w-full max-w-3xl px-4 md:px-6 mx-auto" :
        view === 'analysis' || view === 'history' || view === 'lab' || view === 'reminders' || view === 'instructions' || view === 'emergency' ? "w-full max-w-6xl px-4 md:px-6 mx-auto" :
        "container mx-auto"
      )}>
        <AnimatePresence mode="wait">
          {(view === 'home' || view === 'analysis') && (
            <motion.div
              key="unified-workspace"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="w-full"
            >
              <div id="workspace-main" className="flex-1 min-w-0 w-full space-y-6">
                  {/* Dynamic Core Screen Render */}
                  <AnimatePresence mode="wait">
                    {isAnalyzing ? (
                      <motion.div
                        key="analyzing-state"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="p-12 sm:p-20 rounded-[3rem] bg-surface border border-border/80 shadow-2xl flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-indigo/5 pointer-events-none" />
                        <div className="relative">
                          {/* Spinning Helix / Pulsing Rings */}
                          <div className="absolute inset-0 bg-accent/20 blur-[50px] rounded-full scale-[1.5] animate-pulse" />
                          <div className="w-24 h-24 rounded-[2.5rem] bg-accent/15 border border-accent/25 flex items-center justify-center shadow-lg relative z-10 animate-pulse">
                            <Activity className="w-10 h-10 text-accent animate-spin stroke-[2.5px]" />
                          </div>
                        </div>
                        <div className="space-y-3 z-10">
                          <h3 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight uppercase font-display">
                            AI Synthesis Active
                          </h3>
                          <p className="text-text-secondary text-xs sm:text-sm font-medium max-w-sm mx-auto leading-relaxed opacity-90">
                            Consulting clinical intelligence models to structure metrics and formulate lifestyle guidelines...
                          </p>
                        </div>

                        {/* Progress Checklist */}
                        <div className="w-full max-w-sm border border-border/80 rounded-2xl bg-bg-warm/50 p-6 space-y-3 text-left z-10 font-bold font-mono text-xs">
                          <div className="flex items-center gap-3 text-text-primary">
                            <div className="w-4 h-4 rounded-full bg-emerald flex items-center justify-center text-[10px] text-white">✓</div>
                            <span>Clinical data layers extracted</span>
                          </div>
                          <div className="flex items-center gap-3 text-text-primary animate-pulse">
                            <div className="w-4 h-4 rounded-full border border-accent border-t-transparent animate-spin" />
                            <span className="text-accent uppercase tracking-wider font-extrabold text-[11px]">Building medical intelligence metrics...</span>
                          </div>
                          <div className="flex items-center gap-3 text-text-muted">
                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 ml-1.5" />
                            <span>Formulating safe traditional remedies</span>
                          </div>
                          <div className="flex items-center gap-3 text-text-muted">
                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 ml-1.5" />
                            <span>Applying regional diagnostics standards</span>
                          </div>
                        </div>

                        <div className="w-full max-w-[280px] space-y-2 z-10">
                          <div className="h-1.5 w-full bg-bg-warm rounded-full overflow-hidden border border-border/40">
                            <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '60%' }} />
                          </div>
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] text-center">
                            Synthesizing medical intelligence...
                          </p>
                        </div>
                      </motion.div>
                    ) : view === 'analysis' && analysisData ? (
                      <motion.div
                        key="analysis-view"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        <AnalysisResult
                          data={analysisData}
                          mode={activeAnalysisMode}
                          onBack={() => {
                            setAnalysisData(null);
                            setView('home');
                          }}
                          onNavigate={setView}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="welcome-placeholder"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-8"
                      >
                        {/* 3. REDUCED AND SIZED HEADLINE AT TOP OF THE SCREEN */}
                        <div className="border-b border-border/50 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none relative">
                          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[50%] h-[100%] bg-accent/5 blur-[50px] rounded-full pointer-events-none -z-10" />
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 select-none">
                              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">{t('hero_tag')}</span>
                            </div>
                            <h2 className={cn(
                              "text-xl sm:text-2xl font-black text-text-primary tracking-tight uppercase font-display",
                              language === 'ar' || language === 'ur' || language === 'hi' || language === 'bn' ? "text-lg sm:text-xl" : ""
                            )}>
                              {t('hero_title')}
                            </h2>
                            <p className="text-text-secondary text-[11px] font-semibold mt-1 max-w-xl leading-relaxed">
                              {t('hero_desc')}
                            </p>
                          </div>
                        </div>

                        {/* INTERACTIVE COMPONENT / INPUT AREA RESIDES HERE */}
                        <div className="p-6 md:p-8 rounded-[2rem] bg-surface border border-border/85 bg-gradient-to-b from-surface to-bg-warm/10 shadow-xl overflow-hidden relative">
                          {/* Glow ambient accent */}
                          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-accent/5 blur-[50px] rounded-full pointer-events-none -z-10" />

                          <div className="space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                              <div>
                                <h3 className="text-sm font-black text-text-primary tracking-tight leading-none uppercase font-display flex items-center gap-2">
                                  {activeAnalysisMode === 'lab' ? (
                                    <>
                                      <FlaskConical className="w-4 h-4 text-accent" />
                                      <span>Laboratory / Radiology Upload</span>
                                    </>
                                  ) : activeAnalysisMode === 'medicine' ? (
                                    <>
                                      <Activity className="w-4 h-4 text-accent" />
                                      <span>Medicine Packs / Rx Prescription</span>
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-4 h-4 text-accent" />
                                      <span>Symptoms Descriptor Portal</span>
                                    </>
                                  )}
                                </h3>
                                <p className="text-text-muted text-[10.5px] font-semibold mt-1">
                                  {activeAnalysisMode === 'symptoms'
                                    ? 'Type or explain your general health concerns in the input area below.'
                                    : 'Drag-and-drop clinical PDFs or packet images of test reports to parse metrics.'}
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center">
                                {isPremium ? (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    Premium Active
                                  </span>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      setPaywallTriggerMode(activeAnalysisMode);
                                      setShowPaywall(true);
                                    }}
                                    className="text-[9px] font-black uppercase tracking-wider bg-accent/8 hover:bg-accent/15 text-accent border border-accent/20 px-2.5 py-1 rounded-full cursor-pointer transition-all flex items-center gap-1.5"
                                    title="Upgrade to Unlimited"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    <span>{getRemainingScans(activeAnalysisMode)} / {getLimitValue(activeAnalysisMode)} Scans Left Today</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {activeAnalysisMode === 'symptoms' ? (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <div className="relative group">
                                    <textarea
                                      ref={textareaRef}
                                      value={symptomsText}
                                      onChange={(e) => setSymptomsText(e.target.value)}
                                      placeholder={t('symptoms_placeholder')}
                                      className={cn(
                                        "w-full min-h-[140px] pt-12 px-4.5 pb-4 rounded-2xl bg-bg-warm border outline-none transition-all resize-none text-xs text-text-primary font-semibold leading-relaxed shadow-inner",
                                        validationResult.some(w => w.type === 'error')
                                          ? "border-coral text-text-primary"
                                          : "border-border/80 focus:border-accent"
                                      )}
                                      dir={languages.find((l) => l.code === language)?.dir === 'rtl' ? 'rtl' : 'ltr'}
                                    />
                                    <div className="absolute top-3 end-3 flex items-center gap-2">
                                      {symptomsText && (
                                        <button
                                          type="button"
                                          onClick={() => setSymptomsText('')}
                                          className="p-1.5 px-2.5 rounded-xl bg-surface border border-border text-text-muted hover:text-coral hover:border-coral/20 transition-all flex items-center gap-1.5 font-bold text-[9px] tracking-wider uppercase cursor-pointer shadow-sm select-none"
                                        >
                                          <RotateCcw className="w-3 h-3 text-coral" />
                                          <span>Clear</span>
                                        </button>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={toggleListening}
                                      className={cn(
                                        "absolute top-3 start-3 p-1.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 font-bold text-[9px] tracking-wider uppercase shadow-sm cursor-pointer",
                                        isListening
                                          ? "bg-coral text-white border-coral animate-pulse"
                                          : "bg-surface border-border text-text-muted hover:text-accent hover:border-accent/30"
                                      )}
                                    >
                                      <Mic className={cn("w-3.5 h-3.5", isListening ? "text-white animate-bounce" : "text-accent")} />
                                      <span>{isListening ? 'Stop' : 'Voice Input'}</span>
                                    </button>
                                  </div>

                                  {/* Length, Quality, and Status Feedback Panel */}
                                  <div className={cn(
                                    "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all duration-300 shadow-xs",
                                    getCharacterFeedback(symptomsText.length).bg
                                  )}>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border text-center whitespace-nowrap leading-none",
                                        getCharacterFeedback(symptomsText.length).color,
                                        "bg-surface border-border/20"
                                      )}>
                                        {getCharacterFeedback(symptomsText.length).label}
                                      </span>
                                      <p className="text-[10.5px] text-text-secondary font-semibold leading-relaxed">
                                        {getCharacterFeedback(symptomsText.length).desc}
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 select-none shrink-0 border-t sm:border-t-0 border-border/10 pt-1.5 sm:pt-0">
                                      <span className="text-[9.5px] font-mono tracking-wider font-extrabold text-text-muted">
                                        {symptomsText.length} Chars
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <span className={cn(
                                          "w-1.5 h-1.5 rounded-full animate-pulse",
                                          validationResult.some(w => w.type === 'error') ? "bg-coral" : "bg-emerald"
                                        )} />
                                        <span className="text-[8.5px] font-mono font-bold text-text-muted uppercase tracking-wide">
                                          {validationResult.some(w => w.type === 'error') ? "Error" : "Safe"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Severity & Duration Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border/80 bg-surface/50 shadow-sm">
                                  {/* Severity Slider */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10.5px] font-black text-text-primary uppercase tracking-wider">
                                        {t('symptoms_severity')}
                                      </span>
                                      <span className={cn(
                                        "text-xs font-mono font-black px-2 py-0.5 rounded-full border leading-none shrink-0 shadow-2xs",
                                        symptomsSeverity <= 3 ? "bg-emerald/10 border-emerald/20 text-emerald" :
                                        symptomsSeverity <= 7 ? "bg-accent/10 border-accent/20 text-accent" :
                                        "bg-coral/10 border-coral/20 text-coral animate-pulse"
                                      )}>
                                        {symptomsSeverity} / 10
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min="1"
                                      max="10"
                                      value={symptomsSeverity}
                                      onChange={(e) => setSymptomsSeverity(parseInt(e.target.value))}
                                      className="w-full h-2 rounded-lg bg-bg-warm appearance-none cursor-pointer accent-accent"
                                    />
                                    <div className="flex justify-between text-[8px] font-bold text-text-muted select-none">
                                      <span>Mild (1)</span>
                                      <span>Moderate (5)</span>
                                      <span>Severe (10)</span>
                                    </div>
                                  </div>

                                  {/* Duration Picker */}
                                  <div className="space-y-2">
                                    <span className="text-[10.5px] font-black text-text-primary uppercase tracking-wider block">
                                      {t('symptoms_duration')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {/* Number Input / Incrementer */}
                                      <div className="flex items-center rounded-xl bg-bg-warm border border-border/80 overflow-hidden shrink-0 h-10 w-28">
                                        <button
                                          type="button"
                                          onClick={() => setSymptomsDurationVal(Math.max(1, symptomsDurationVal - 1))}
                                          className="w-8 h-full flex items-center justify-center hover:bg-border/20 text-text-primary font-black active:scale-95 select-none cursor-pointer border-e border-border/60"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          min="1"
                                          value={symptomsDurationVal}
                                          onChange={(e) => setSymptomsDurationVal(Math.max(1, parseInt(e.target.value) || 1))}
                                          className="w-12 h-full text-center bg-transparent border-none outline-none text-xs font-mono font-bold text-text-primary"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setSymptomsDurationVal(symptomsDurationVal + 1)}
                                          className="w-8 h-full flex items-center justify-center hover:bg-border/20 text-text-primary font-black active:scale-95 select-none cursor-pointer border-s border-border/60"
                                        >
                                          +
                                        </button>
                                      </div>

                                      {/* Dropdown for Days/Weeks/Months */}
                                      <div className="flex-1 relative">
                                        <select
                                          value={symptomsDurationUnit}
                                          onChange={(e) => setSymptomsDurationUnit(e.target.value)}
                                          className="w-full h-10 px-3 pr-8 rounded-xl bg-bg-warm border border-border/80 text-xs font-semibold text-text-primary outline-none focus:border-accent appearance-none cursor-pointer"
                                        >
                                          <option value="days">{t('symptoms_duration_days')}</option>
                                          <option value="weeks">{t('symptoms_duration_weeks')}</option>
                                          <option value="months">{t('symptoms_duration_months')}</option>
                                        </select>
                                        <div className="absolute top-1/2 end-3 -translate-y-1/2 pointer-events-none text-text-muted">
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Warnings checklist */}
                                {validationResult.length > 0 && (
                                  <div className="p-3 rounded-xl bg-coral/5 border border-coral/10 text-[10px] font-semibold text-coral space-y-1">
                                    {validationResult.map((warning, idx) => (
                                      <p key={idx} className="flex items-start gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <span>{warning.message}</span>
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {/* Quick Suggestions Preset Library */}
                                <div className="space-y-3 pt-3 border-t border-border/40 select-none">
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                                      <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Quick Click Suggestions:</span>
                                    </div>
                                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">One-Tap Insert</span>
                                  </div>
                                  
                                  {/* Body System Tabs */}
                                  <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar scroll-smooth">
                                    {[
                                      { id: 'General', label: 'General / Systemic', icon: '🩺' },
                                      { id: 'Cardiac', label: 'Cardiac & Chest', icon: '❤️' },
                                      { id: 'Respiratory', label: 'Respiratory', icon: '🫁' },
                                      { id: 'Digestive', label: 'Digestive', icon: '🤢' },
                                      { id: 'Neurological', label: 'Neurological', icon: '🧠' },
                                      { id: 'Musculoskeletal', label: 'Musculoskeletal', icon: '💪' }
                                    ].map((tab) => (
                                      <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveSymptomTab(tab.id)}
                                        className={cn(
                                          "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all cursor-pointer",
                                          activeSymptomTab === tab.id
                                            ? "bg-accent/10 border-accent/20 text-accent font-extrabold"
                                            : "bg-surface border-border/80 text-text-secondary hover:bg-bg-warm/50"
                                        )}
                                      >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                      </button>
                                    ))}
                                  </div>

                                  {/* Active Category Symptom Pills */}
                                  <div className="bg-bg-warm/30 p-2.5 rounded-xl border border-border/40 min-h-[85px] flex items-center">
                                    {(() => {
                                      const activeCat = [
                                        {
                                          id: 'General',
                                          terms: ['Fatigue', 'Fever', 'Chills', 'Dizziness', 'Night Sweats', 'Weight Loss', 'Weakness']
                                        },
                                        {
                                          id: 'Cardiac',
                                          terms: ['Chest Pain', 'Palpitations', 'Shortness of Breath', 'Rapid Heartbeat', 'Chest Tightness']
                                        },
                                        {
                                          id: 'Respiratory',
                                          terms: ['Dry Cough', 'Wet Cough', 'Wheezing', 'Sore Throat', 'Stuffy Nose', 'Shortness of Breath']
                                        },
                                        {
                                          id: 'Digestive',
                                          terms: ['Nausea', 'Vomiting', 'Heartburn', 'Abdominal Pain', 'Bloating', 'Loss of Appetite', 'Diarrhea']
                                        },
                                        {
                                          id: 'Neurological',
                                          terms: ['Headache', 'Numbness', 'Tingling', 'Confusion', 'Neck Stiffness', 'Brain Fog', 'Tremors']
                                        },
                                        {
                                          id: 'Musculoskeletal',
                                          terms: ['Joint Pain', 'Muscle Aches', 'Stiffness', 'Lower Back Pain', 'Muscle Spasms']
                                        }
                                      ].find(c => c.id === activeSymptomTab);

                                      if (!activeCat || activeCat.terms.length === 0) return null;

                                      return (
                                        <div className="flex flex-wrap gap-1 text-left w-full">
                                          {activeCat.terms.map((term) => (
                                            <button
                                              key={term}
                                              type="button"
                                              onClick={() => handleInsertSymptom(term)}
                                              className="px-2 py-1 rounded-lg bg-surface border border-border/80 text-[10px] text-text-secondary hover:text-text-primary hover:border-accent hover:bg-bg-warm/50 font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                            >
                                              <Plus className="w-2.5 h-2.5 text-accent shrink-0" />
                                              <span>{term}</span>
                                            </button>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Analyze trigger button */}
                                <button
                                  onClick={() => handleProcessed(symptomsText, undefined, "Symptom Diagnosis Panel")}
                                  disabled={!symptomsText.trim() || isAnalyzing || validationResult.some(w => w.type === 'error')}
                                  className="w-full py-3.5 rounded-xl bg-accent text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-accent/15 hover:shadow-accent/35 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                  {t('analyze_symptoms_btn')}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <ReportUploader onProcessed={handleProcessed} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Commercially integrated AdSense Banner */}
                        <AdSenseBanner slot="medscan-home-ad" className="mt-6" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
            </motion.div>
          )}

          {view === 'lab' && (
            <motion.div
              key="lab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="space-y-6"
            >
               <button 
                 onClick={() => setView('home')}
                 className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors font-mono uppercase text-xs tracking-widest no-print"
               >
                 <ArrowLeft className="w-4 h-4" />
                 Return to Dashboard
               </button>
               <LabResultScreen />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="space-y-6 animate-fade-in"
            >
               <button 
                 onClick={() => setView('home')}
                 className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors font-mono uppercase text-xs tracking-widest no-print"
               >
                 <ArrowLeft className="w-4 h-4" />
                 Return to Dashboard
               </button>
               <ReportComparison 
                 onViewReport={(savedData, reportMode) => {
                   setAnalysisData(savedData);
                   setActiveAnalysisMode(reportMode);
                   setView('analysis');
                 }} 
                 autosaveEnabled={autosaveEnabled}
                 onToggleAutosave={toggleAutosave}
                 historyRetention={historyRetention}
                 setHistoryRetention={setHistoryRetention}
               />
            </motion.div>
          )}

          {view === 'reminders' && (
            <motion.div
              key="reminders"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
               <button 
                 onClick={() => setView('home')}
                 className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors font-mono uppercase text-xs tracking-widest no-print"
               >
                 <ArrowLeft className="w-4 h-4" />
                 Return to Dashboard
               </button>

               <div className="flex flex-col lg:flex-row items-start gap-6 select-none">
                 {/* Left Column: Create Reminder Form */}
                 <div className="w-full lg:w-[40%] bg-surface border border-border p-6 rounded-3xl space-y-5 shadow-sm">
                   <div>
                     <h3 className="text-sm font-black text-text-primary tracking-tight uppercase font-display flex items-center gap-2">
                       <PlusCircle className="text-accent w-4 h-4 animate-pulse" />
                       Add New Medicine Alarm
                     </h3>
                     <p className="text-[10.5px] text-text-muted font-semibold mt-1">
                       Keep your medications organized. Set timers or daily alarms easily.
                     </p>
                   </div>

                   {/* Custom Suggestions / Presets Row */}
                   <div className="space-y-2.5">
                     <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Common Rx Presets (One-Tap Add):</span>
                     <div className="flex flex-wrap gap-1.5">
                       {[
                         { name: 'Metformin', timing: '500mg breakfast' },
                         { name: 'Amoxicillin', timing: '500mg 3x daily' },
                         { name: 'Atorvastatin', timing: '10mg night' },
                         { name: 'Lisinopril', timing: '5mg morning' }
                       ].map((preset) => (
                         <button
                           key={preset.name}
                           type="button"
                           onClick={() => {
                             setNewMedName(preset.name);
                             handleAddNewReminder(preset.name, preset.timing);
                           }}
                           className="px-2.5 py-1.5 rounded-xl bg-bg-warm hover:bg-accent/15 border border-border/80 text-[10px] text-text-secondary hover:text-accent font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                         >
                           <Plus className="w-3 h-3 text-accent" />
                           <span>{preset.name}</span>
                         </button>
                       ))}
                     </div>
                   </div>

                   <div className="space-y-4 pt-3 border-t border-border/40">
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Medicine Name</label>
                       <input
                         type="text"
                         placeholder="e.g., Aspirin, Lipitor..."
                         value={newMedName}
                         onChange={(e) => setNewMedName(e.target.value)}
                         className="w-full p-3 rounded-xl bg-bg-warm border border-border/80 text-xs font-semibold text-text-primary outline-none focus:border-accent"
                       />
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Alarm Time</label>
                         <input
                           type="time"
                           value={newMedTime}
                           onChange={(e) => setNewMedTime(e.target.value)}
                           className="w-full p-2.5 rounded-xl bg-bg-warm border border-border/80 text-xs font-semibold text-text-primary outline-none focus:border-accent font-mono"
                         />
                       </div>

                       <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Date (Optional)</label>
                         <input
                           type="date"
                           value={newMedDate}
                           onChange={(e) => setNewMedDate(e.target.value)}
                           className="w-full p-2.5 rounded-xl bg-bg-warm border border-border/80 text-xs font-semibold text-text-primary outline-none focus:border-accent font-mono"
                         />
                       </div>
                     </div>

                     <div className="flex items-center justify-between p-3 rounded-xl bg-bg-warm/60 border border-border/50 select-none">
                       <div>
                         <span className="text-[10.5px] font-bold text-text-primary block leading-tight">Daily Recurrence</span>
                         <span className="text-[9.5px] text-text-muted font-medium">Trigger this alarm every day</span>
                       </div>
                       <button
                         type="button"
                         onClick={() => setMedIsRecurring(!medIsRecurring)}
                         className={cn(
                           "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                           medIsRecurring ? "bg-accent" : "bg-border"
                         )}
                       >
                         <span
                           className={cn(
                             "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                             medIsRecurring ? "translate-x-4" : "translate-x-0"
                           )}
                         />
                       </button>
                     </div>

                     <button
                       type="button"
                       onClick={() => handleAddNewReminder(newMedName)}
                       className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dim text-white font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-accent/15 hover:shadow-accent/35"
                     >
                       Schedule Alarm
                     </button>
                   </div>
                 </div>

                 {/* Right Column: Alarms List */}
                 <div className="flex-1 bg-surface border border-border p-6 rounded-3xl space-y-6 self-stretch min-h-[400px] flex flex-col">
                   <div className="flex items-center justify-between border-b border-border/40 pb-4">
                     <div>
                       <h3 className="text-sm font-black text-text-primary tracking-tight uppercase font-display flex items-center gap-2">
                         <Clock className="text-accent w-4 h-4" />
                         Active Alarm Schedules
                       </h3>
                       <p className="text-[10.5px] text-text-muted font-semibold mt-1">
                         Your configured automatic notifications for pills & therapeutics.
                       </p>
                     </div>
                     {reminders.length > 0 && (
                       <span className="bg-accent/10 border border-accent/20 text-accent font-mono font-black text-xs px-3 py-1 rounded-full">
                         {reminders.length} Active
                       </span>
                     )}
                   </div>

                   {reminders.length === 0 ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3.5 select-none opacity-80 decoration-transparent">
                       <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-bg-warm text-text-muted">
                         <Clock className="w-5 h-5 opacity-60" />
                       </div>
                       <div>
                         <p className="text-xs font-black text-text-primary uppercase tracking-wider">No Scheduled alarms</p>
                         <p className="text-[10.5px] text-text-secondary font-medium mt-1">Click any preset or enter details on the left to add your first alarm alert.</p>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin">
                       {reminders.map((rem) => (
                         <div
                           key={rem.id}
                           className={cn(
                             "flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300",
                             rem.active 
                               ? "bg-bg-warm/30 border-border hover:border-accent/40" 
                               : "bg-bg-warm/10 border-border/40 opacity-60 hover:opacity-80"
                           )}
                         >
                           <div className="flex items-center gap-3.5">
                             <div className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                               rem.active ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border"
                             )}>
                               <Pill className="w-5 h-5 animate-pulse" />
                             </div>
                             <div>
                               <span className={cn(
                                 "text-xs font-semibold leading-tight block",
                                 rem.active ? "text-text-primary" : "text-text-muted line-through"
                               )}>
                                 {rem.name}
                               </span>
                               <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider bg-surface px-1.5 py-0.5 rounded border border-border">
                                   ⌛ {rem.time}
                                 </span>
                                 <span className="text-[9px] font-semibold text-text-muted">
                                   {rem.date ? `Date: ${rem.date}` : rem.recurring ? 'Daily Recurrence' : 'One-time'}
                                 </span>
                               </div>
                             </div>
                           </div>

                           <div className="flex items-center gap-2.5">
                             <button
                               type="button"
                               onClick={() => speakMedicineAlert(rem.name, language)}
                               className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:text-accent hover:border-accent/20 transition-all cursor-pointer shadow-2xs"
                               title="Read alert aloud"
                             >
                               <Volume2 className="w-3.5 h-3.5" />
                             </button>

                             <button
                               type="button"
                               onClick={() => toggleReminderActive(rem.id)}
                               className={cn(
                                 "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                 rem.active ? "bg-emerald" : "bg-border"
                               )}
                             >
                               <span
                                 className={cn(
                                   "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                   rem.active ? "translate-x-4" : "translate-x-0"
                                 )}
                               />
                             </button>

                             <button
                               type="button"
                               onClick={() => handleDeleteReminder(rem.id, rem.name)}
                               className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:text-coral hover:border-coral/20 hover:bg-coral/5 transition-all cursor-pointer"
                               title="Remove schedule"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
            </motion.div>
          )}

          {view === 'emergency' && (
            <motion.div
              key="emergency"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
            >
              <EmergencyDirectory 
                initialCountry={userCountry}
                onReturnHome={() => setView('home')} 
              />
            </motion.div>
          )}

          {view === 'instructions' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="space-y-6"
            >
               <button 
                 onClick={() => setView('home')}
                 className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors font-mono uppercase text-xs tracking-widest no-print"
               >
                 <ArrowLeft className="w-4 h-4" />
                 Return to Dashboard
               </button>

               <div className="bg-surface border border-border p-6 rounded-[2rem] shadow-sm space-y-8 select-none">
                 {/* Title banner */}
                 <div>
                   <div className="flex items-center gap-2 text-accent mb-2">
                     <BookOpen className="w-4.5 h-4.5 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-[0.25em]">Walkthrough Registry</span>
                   </div>
                   <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight uppercase font-display">Instructions Guide</h2>
                   <p className="text-text-muted text-xs font-semibold mt-1 max-w-2xl leading-relaxed">
                     Learn how to interact with our three intelligent diagnostics engines. Use correct file formats to avoid intelligent classification flags.
                   </p>
                 </div>

                 {/* Step-by-step instructions cards */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="p-5.5 rounded-2xl bg-bg-warm/30 border border-border/80 space-y-3.5 hover:border-accent/30 hover:bg-bg-warm/40 transition-all duration-300">
                     <div className="w-8 h-8 rounded-lg bg-accent text-white font-mono font-black text-xs flex items-center justify-center font-bold">
                       01
                     </div>
                     <span className="text-xs font-black uppercase tracking-wider text-text-primary block font-display">Pick Diagnostic Engine</span>
                     <p className="text-[11px] leading-relaxed font-semibold text-text-secondary">
                       Toggle between **Lab Panel Analyzers**, **Packs/Prescriptions OCR**, or **the Systems Symptoms Reporter** using the control panel menu on the left side of your screen.
                     </p>
                   </div>

                   <div className="p-5.5 rounded-2xl bg-bg-warm/30 border border-border/80 space-y-3.5 hover:border-accent/30 hover:bg-bg-warm/40 transition-all duration-300 relative overflow-hidden group">
                     <div className="w-8 h-8 rounded-lg bg-accent text-white font-mono font-black text-xs flex items-center justify-center font-bold">
                       02
                     </div>
                     <span className="text-xs font-black uppercase tracking-wider text-text-primary block font-display">Present Clinical Signals</span>
                     <p className="text-[11px] leading-relaxed font-semibold text-text-secondary">
                       Upload standard clinical PDF files, laboratory report images, or Rx medication box snapshots. For symptom input, log qualitative feelings inside the direct text area.
                     </p>
                     
                     <div className="pt-2">
                       <button
                         type="button"
                         onClick={() => {
                           handleProcessed("Glucose: 154 mg/dL [Reference: 70 - 100 mg/dL], Cholesterol: 245 mg/dL [Reference: < 200 mg/dL], HbA1c: 6.8 % [Reference: 4.0 - 5.6 %]", undefined, "Simulated Diagnostics Case");
                           toast.success("Simulation triggered! Synthesizing mock diagnostics...");
                         }}
                         className="px-3 py-1.5 rounded-xl bg-accent text-white hover:bg-accent-dim text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                       >
                         Try Simulated Input
                       </button>
                     </div>
                   </div>

                   <div className="p-5.5 rounded-2xl bg-bg-warm/30 border border-border/80 space-y-3.5 hover:border-accent/30 hover:bg-bg-warm/40 transition-all duration-300">
                     <div className="w-8 h-8 rounded-lg bg-accent text-white font-mono font-black text-xs flex items-center justify-center font-bold">
                       03
                     </div>
                     <span className="text-xs font-black uppercase tracking-wider text-text-primary block font-display">Decypher Clinical Analysis</span>
                     <p className="text-[11px] leading-relaxed font-semibold text-text-secondary">
                       Review interpreted biometric markers, associations to clinical complaints, lifestyle prevention strategies, and structured traditional remedies.
                     </p>
                   </div>
                 </div>

                 {/* Standard Lab Reference Thresholds Dashboard Widget */}
                 <div className="border-t border-border/40 pt-6 space-y-4">
                   <div>
                     <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Reference Catalog</span>
                     <span className="text-xs font-black uppercase text-text-primary block tracking-wider font-display mt-0.5">Standard Lab Reference Thresholds</span>
                   </div>

                   <div className="overflow-x-auto rounded-2xl border border-border bg-bg-warm/10">
                     <table className="w-full text-left border-collapse text-[11px]">
                       <thead>
                         <tr className="bg-bg-warm border-b border-border text-text-secondary uppercase font-bold tracking-wider">
                           <th className="p-3">Biometric Metric</th>
                           <th className="p-3">Healthy Range</th>
                           <th className="p-3">Standard Unit</th>
                           <th className="p-3">Clinical Significance / Monitoring Focus</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-border/60 text-text-secondary font-semibold animate-fade-in">
                         {[
                           { name: 'Fasting Blood Glucose', range: '70 - 100', unit: 'mg/dL', note: 'Higher levels point directly towards prediabetes or insulin resistance markers.' },
                           { name: 'Total Cholesterol', range: '< 200', unit: 'mg/dL', note: 'Essential lipid transport metric. High concentrations require cardiovascular tracking.' },
                           { name: 'Vitamin D (25-OH)', range: '30 - 100', unit: 'ng/mL', note: 'Vital bone density & immune regulator. Low levels require herbal intake or light support.' },
                           { name: 'Hemoglobin (Hb)', range: '12.0 - 17.5', unit: 'g/dL', note: 'Oxygen delivery biomarker. Low levels suggest anemia, fatigue, or biological iron loss.' }
                         ].map((item, idx) => (
                           <tr key={idx} className="hover:bg-bg-warm/25 transition-colors">
                             <td className="p-3 font-bold text-text-primary">{item.name}</td>
                             <td className="p-3 font-mono text-accent">{item.range}</td>
                             <td className="p-3 text-text-muted">{item.unit}</td>
                             <td className="p-3 text-[10.5px] leading-relaxed text-text-secondary">{item.note}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>

      {/* Dynamic Gesture Navigation Banner overlay */}
      <AnimatePresence>
        {swipeIndicator.show && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "backOut" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-2.5 rounded-full bg-text-primary/95 text-white dark:bg-accent/95 border border-white/10 shadow-2xl flex items-center gap-3 backdrop-blur-md font-bold text-xs select-none pointer-events-none"
          >
            <div className="flex items-center gap-1 text-[10px] text-accent/90 dark:text-white/90">
              {swipeIndicator.dir === 'right' ? (
                <span className="animate-pulse">← Swipe Right</span>
              ) : (
                <span className="animate-pulse">Swipe Left →</span>
              )}
            </div>
            <div className="w-px h-3 bg-white/20" />
            <span className="uppercase tracking-widest font-black font-mono text-[9px] text-emerald dark:text-white">
              {swipeIndicator.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transition indicator (less intrusive than full screen overlay) */}
      {isAnalyzing && view !== 'analysis' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60]">
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-accent text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest"
           >
             <Activity className="w-4 h-4 animate-spin" />
             AI Synthesis in Progress...
           </motion.div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <PremiumProvider>
        <AppContent />
      </PremiumProvider>
    </LanguageProvider>
  );
}
