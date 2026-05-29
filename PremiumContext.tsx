import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';

interface PremiumContextType {
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;
  getRemainingScans: (mode: 'lab' | 'medicine' | 'symptoms') => number;
  getLimitValue: (mode: 'lab' | 'medicine' | 'symptoms') => number;
  hasReachedLimit: (mode: 'lab' | 'medicine' | 'symptoms') => boolean;
  incrementScan: (mode: 'lab' | 'medicine' | 'symptoms') => boolean;
  currency: 'INR' | 'USD';
  setCurrency: (curr: 'INR' | 'USD') => void;
  showPaywall: boolean;
  setShowPaywall: (val: boolean) => void;
  paywallTriggerMode: 'lab' | 'medicine' | 'symptoms' | 'reminders' | 'history' | null;
  setPaywallTriggerMode: (mode: 'lab' | 'medicine' | 'symptoms' | 'reminders' | 'history' | null) => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremiumState] = useState<boolean>(() => {
    return localStorage.getItem('medscan_is_premium') === 'true';
  });
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTriggerMode, setPaywallTriggerMode] = useState<'lab' | 'medicine' | 'symptoms' | 'reminders' | 'history' | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // Daily Scan Counts State
  // Format: key is `YYYY-MM-DD_mode`, value is count
  const [scanCounts, setScanCounts] = useState<{ [key: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('medscan_scan_counts_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('medscan_scan_counts_v1', JSON.stringify(scanCounts));
  }, [scanCounts]);

  // Auth sync with Firestore for premium tier
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        // Sync real-time subscription status
        const docRef = doc(db, 'users', user.uid);
        const unsubDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isPremium !== undefined) {
              setIsPremiumState(data.isPremium);
              localStorage.setItem('medscan_is_premium', String(data.isPremium));
            }
          }
        }, (error) => {
          console.warn("Firestore premium sync offline:", error);
        });
        return () => unsubDoc();
      } else {
        setUid(null);
      }
    });
    return () => unsubAuth();
  }, []);

  const setIsPremium = async (val: boolean) => {
    setIsPremiumState(val);
    localStorage.setItem('medscan_is_premium', String(val));
    
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid), { isPremium: val }, { merge: true });
      } catch (err) {
        console.error("Failed to sync premium state to Firestore:", err);
      }
    }
  };

  const getTodayStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [todayStr, setTodayStr] = useState(getTodayStr());

  // Periodically refresh/check day transitions
  useEffect(() => {
    const timer = setInterval(() => {
      setTodayStr(getTodayStr());
    }, 60000); // every minute
    return () => clearInterval(timer);
  }, []);

  const getLimitValue = (mode: 'lab' | 'medicine' | 'symptoms') => {
    if (mode === 'symptoms') return 3;
    return 2; // lab & medicine are 2 per day
  };

  const getRemainingScans = (mode: 'lab' | 'medicine' | 'symptoms') => {
    if (isPremium) return Infinity;
    const key = `${todayStr}_${mode}`;
    const used = scanCounts[key] || 0;
    const limit = getLimitValue(mode);
    return Math.max(0, limit - used);
  };

  const hasReachedLimit = (mode: 'lab' | 'medicine' | 'symptoms') => {
    if (isPremium) return false;
    return getRemainingScans(mode) <= 0;
  };

  const incrementScan = (mode: 'lab' | 'medicine' | 'symptoms') => {
    if (isPremium) return true;
    const key = `${todayStr}_${mode}`;
    const used = scanCounts[key] || 0;
    const limit = getLimitValue(mode);
    
    if (used >= limit) {
      setPaywallTriggerMode(mode);
      setShowPaywall(true);
      return false;
    }

    setScanCounts(prev => ({
      ...prev,
      [key]: used + 1
    }));
    return true;
  };

  return (
    <PremiumContext.Provider value={{
      isPremium,
      setIsPremium,
      getRemainingScans,
      getLimitValue,
      hasReachedLimit,
      incrementScan,
      currency,
      setCurrency,
      showPaywall,
      setShowPaywall,
      paywallTriggerMode,
      setPaywallTriggerMode
    }}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};
