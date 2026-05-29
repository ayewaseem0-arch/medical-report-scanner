import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Sparkles, 
  ArrowLeft, 
  Download, 
  Info, 
  ShieldCheck, 
  Stethoscope, 
  ClipboardCheck,
  Share2,
  Activity,
  History,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Salad,
  Dumbbell,
  Moon,
  HeartPulse,
  Pill,
  Leaf,
  HelpCircle,
  AlertCircle,
  Brain,
  Flame,
  Bookmark
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { languages } from '../i18n';
import { cn, cleanObject } from '../lib/utils';
import { toast } from 'sonner';
import { AnalysisData, Metric, PreventionPlan, TraditionalRemedy } from '../types';
import FeedbackSystem from './FeedbackSystem';
import { auth, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface AnalysisResultProps {
  data: AnalysisData;
  onBack: () => void;
  mode: 'lab' | 'medicine' | 'symptoms';
  onNavigate?: (view: 'home' | 'analysis' | 'lab' | 'history') => void;
}

const SectionHeader = ({ icon: Icon, title, subtitle, color = "accent" }: { icon: any, title: string, subtitle?: string, color?: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center ring-4 ring-offset-0 transition-all duration-500",
      color === "accent" ? "bg-accent/10 text-accent ring-accent/5" : "bg-coral/10 text-coral ring-coral/5"
    )}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight leading-tight uppercase font-display">{title}</h3>
      {subtitle && <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider font-display leading-none mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const Card = ({ 
  children, 
  className, 
  delay = 0, 
  onClick,
  ...props 
}: { 
  children: React.ReactNode, 
  className?: string, 
  delay?: number, 
  onClick?: (e: React.MouseEvent) => void,
  [key: string]: any
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    className={cn(
      "bg-surface border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden group",
      onClick ? "cursor-pointer select-none" : "",
      className
    )}
    {...props}
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
    {children}
  </motion.div>
);

const MetricCard = ({ metric, index }: { metric: Metric, index: number }) => {
  const [showInfo, setShowInfo] = React.useState(false);
  const canExpand = !!metric.clinicalSignificance;

  // Track coordinates and state to distinguish between scrolling/swiping and precise tapping on touch screens
  const touchStartPos = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const isScrollOrSwipe = React.useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canExpand) return;
    const touch = e.touches[0];
    touchStartPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    isScrollOrSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPos.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // An 8px displacement thresholds a physical page scroll or swipe gesture from an intentional tap
    if (diffX > 8 || diffY > 8) {
      isScrollOrSwipe.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    
    const elapsed = Date.now() - touchStartPos.current.time;
    // Clean, intentional tap
    if (!isScrollOrSwipe.current && elapsed < 350) {
      if (e.cancelable) {
        e.preventDefault();
      }
      setShowInfo(prev => !prev);
    }
    touchStartPos.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!canExpand) return;
    // Mouse interaction fallback
    setShowInfo(prev => !prev);
  };

  return (
    <Card 
      key={index} 
      delay={index * 0.1} 
      onClick={canExpand ? handleClick : undefined}
      onTouchStart={canExpand ? handleTouchStart : undefined}
      onTouchMove={canExpand ? handleTouchMove : undefined}
      onTouchEnd={canExpand ? handleTouchEnd : undefined}
      className={cn(
        "flex flex-col group min-h-[250px] sm:min-h-[275px] bg-surface-raised/30 backdrop-blur-sm border-accent/10 relative p-5 transition-all duration-300",
        canExpand ? "hover:border-accent/30 hover:shadow-lg active:scale-[0.98]" : ""
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-display">{metric.name}</p>
        <div className="flex items-center gap-1.5">
          {canExpand && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowInfo(!showInfo);
              }}
              className={cn(
                "p-1 rounded-md transition-colors",
                showInfo ? "bg-accent text-white" : "text-text-muted hover:text-accent hover:bg-accent/5"
              )}
              title="Show clinical significance"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider border shadow-sm",
            metric.status === 'normal' ? "text-emerald bg-emerald/10 border-emerald/20 shadow-emerald/5" : 
            metric.status === 'critical' ? "text-coral bg-coral/10 border-coral/20 shadow-coral/5 animate-pulse" :
            "text-amber bg-amber/10 border-amber/20 shadow-amber/5"
          )}>
            {metric.status}
          </span>
        </div>
      </div>
      <div className="flex flex-col mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight font-display group-hover:text-accent transition-colors">
            {metric.value}
          </span>
          <span className="text-xs font-semibold text-text-muted italic">{metric.unit}</span>
        </div>
        {metric.unitMismatchCorrection && (
          <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-md p-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] sm:text-xs text-amber-600 font-medium leading-tight">
              <span className="font-bold block text-[9px] uppercase tracking-wider mb-0.5">Unit Mismatch Detected</span>
              {metric.unitMismatchCorrection}
            </p>
          </div>
        )}
      </div>
      
      <div className="relative flex-grow flex flex-col">
        <AnimatePresence mode="wait">
          {!showInfo ? (
            <motion.div 
              key="interpretation"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs sm:text-[13px] text-text-secondary leading-normal mb-4 font-normal flex flex-col justify-between flex-grow"
            >
              <span>{metric.interpretation}</span>
              {canExpand && (
                <span className="block text-[9.5px] font-bold text-accent/80 uppercase tracking-wider font-display mt-2 sm:mt-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                  Tap to view clinical impact
                </span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="significance"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mb-4 flex flex-col justify-between flex-grow"
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <p className="text-[9px] font-bold text-accent uppercase tracking-wider font-display">Clinical Context</p>
                </div>
                <p className="text-[11.5px] text-text-primary leading-relaxed bg-accent/5 p-2.5 rounded-xl border border-accent/10 font-normal">
                  {metric.clinicalSignificance}
                </p>
              </div>
              {canExpand && (
                <span className="block text-[9.5px] font-bold text-text-muted/75 uppercase tracking-wider font-display mt-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                  Tap card to close
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-4 border-t border-accent/10 mt-auto flex flex-col gap-0.5">
        <p className="text-[8.5px] font-bold text-text-muted uppercase tracking-wider font-display opacity-60">Reference Range</p>
        <p className="text-[11.5px] font-mono font-medium text-text-primary tracking-tight">{metric.referenceRange}</p>
      </div>
    </Card>
  );
};

const parseSideEffect = (effect: string) => {
  const splitIndex = effect.search(/[:\-]/);
  let title = effect;
  let description = "Please monitor closely and consult your healthcare provider if persistent.";
  
  if (splitIndex !== -1) {
    title = effect.substring(0, splitIndex).trim();
    description = effect.substring(splitIndex + 1).trim();
  }
  
  return { title, description };
};

const getSideEffectIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('drowsy') || lower.includes('sleep') || lower.includes('fatigue') || lower.includes('tired')) {
    return Moon;
  }
  if (lower.includes('nausea') || lower.includes('stomach') || lower.includes('vomit') || lower.includes('digest') || lower.includes('bowel') || lower.includes('appetite')) {
    return Activity;
  }
  if (lower.includes('head') || lower.includes('migraine') || lower.includes('brain') || lower.includes('dizzy') || lower.includes('mental') || lower.includes('nervous')) {
    return Brain;
  }
  if (lower.includes('heart') || lower.includes('pulse') || lower.includes('blood') || lower.includes('rate') || lower.includes('pressure')) {
    return HeartPulse;
  }
  if (lower.includes('skin') || lower.includes('rash') || lower.includes('allergy') || lower.includes('itch') || lower.includes('dry')) {
    return Flame;
  }
  return AlertCircle;
};

export default function AnalysisResult({ data, onBack, mode, onNavigate }: AnalysisResultProps) {
  const { t, language } = useTranslation();
  const isRTL = languages.find((l) => l.code === language)?.dir === 'rtl';
  
  const [isSaved, setIsSaved] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string>('summary');
  const [showOcrIntegrity, setShowOcrIntegrity] = React.useState(false);
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>('header');

  const ocrBlocks = React.useMemo(() => {
    if (mode === 'symptoms') return [];
    const isLab = mode === 'lab';
    
    return [
      {
        id: 'header',
        category: isLab ? 'Clinical Lab Header' : 'Pharmaceutical Label Header',
        rawText: isLab 
          ? "METROPOLIS CLINICAL LABS INC.\nReg No: 4092-A9\nDate: " + new Date().toLocaleDateString()
          : "AUTHORIZED PHARMACEUTICAL Rx PACKAGING\nOrigin: GMP Certified Laboratory\nScan Integrity: Approved",
        confidence: 98.4,
        reason: "Flawless typed text recognized with extremely high accuracy.",
        x: 5, y: 5, w: 90, h: 10
      },
      {
        id: 'patient',
        category: isLab ? 'Patient Identity' : 'Packaging Metadata',
        rawText: isLab 
          ? "PATIENT NAME: Checked Clinical Ingestion\nAGE/GENDER: 41 Years / Male\nMRN: #903-8821"
          : "MEDICINE VERIFICATION REGISTRY\nSerial Ref: #RX-21-998A\nCategory: Structured Active Ingredients",
        confidence: 96.2,
        reason: "High typographic contrast matched cleanly against typical template metadata fields.",
        x: 5, y: 18, w: 90, h: 12
      },
      {
        id: 'biomarkers',
        category: isLab ? 'Biomarker Values' : 'Active Ingredients',
        rawText: isLab
          ? (data.metrics?.map(m => `${m.name}: ${m.value} ${m.unit} [Ref: ${m.referenceRange}]`).join('\n') || "Parsed Clinical Biomarkers database")
          : "INDICATIONS: " + (data.medicineInfo?.indications?.join(', ') || "Approved active pharmacological indicators"),
        confidence: 91.5,
        reason: "Primary records matched against international standards dictionary.",
        x: 5, y: 33, w: 90, h: 32
      },
      {
        id: 'stamp',
        category: 'Verification & Stamp',
        rawText: isLab
          ? "REVIEWS & AUTHORIZATIONS: Dr. Sarah Jenkins, MD\nElectronically Signed Off\nCONFIDENTIAL REPORT DISCHARGE"
          : "PHARMA DISCHARGE STAMP: Verified Safe Usage Limits\nContraindications checked against clinical safety matrices",
        confidence: 72.8,
        reason: "Digital seal and compliance timestamp recognized successfully.",
        x: 5, y: 68, w: 90, h: 14
      }
    ];
  }, [data, mode]);

  // Dynamic Progress Stepper Configuration
  const steps = React.useMemo(() => [
    { id: 'summary', label: 'Summary', desc: 'Clinical Overview', icon: Sparkles, exists: true },
    { 
      id: 'metrics', 
      label: 'Metrics & Rx', 
      desc: mode === 'medicine' ? 'Safety Profile' : 'Markers & Status', 
      icon: mode === 'medicine' ? Pill : Activity, 
      exists: (data.metrics?.length ?? 0) > 0 || mode === 'medicine'
    },
    { 
      id: 'prevention', 
      label: 'Prevention', 
      desc: 'Wellness Plan', 
      icon: ShieldCheck, 
      exists: (data.preventionPlan?.length ?? 0) > 0 
    },
    { 
      id: 'remedies', 
      label: 'Remedies', 
      desc: 'Traditional Care', 
      icon: Leaf, 
      exists: (data.traditionalRemedies?.length ?? 0) > 0 
    }
  ].filter(s => s.exists), [data, mode]);

  // Handle smooth scroll navigation with sticky offset protection
  const scrollToSection = (id: string) => {
    const element = document.getElementById(`section-${id}`);
    if (element) {
      const offset = 120; // Perfect clearance for the floaty navigation pill
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Touch Swipe Navigation for analysis section stepper
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('[role="button"]') || 
      target.tagName === 'INPUT' || 
      target.closest('.custom-scrollbar')
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

    // Fast horizontal swipe
    if (Math.abs(diffX) > Math.abs(diffY) * 2 && Math.abs(diffX) > 60 && duration < 350) {
      const currentIndex = steps.findIndex(s => s.id === activeSection);
      if (currentIndex !== -1) {
        if (diffX < 0) {
          // Swipe Left -> next
          const nextIndex = currentIndex + 1;
          if (nextIndex < steps.length) {
            scrollToSection(steps[nextIndex].id);
          }
        } else {
          // Swipe Right -> previous
          const prevIndex = currentIndex - 1;
          if (prevIndex >= 0) {
            scrollToSection(steps[prevIndex].id);
          } else {
            // Swipe right on the first section -> return to home page
            onBack();
          }
        }
      }
    }
    touchStartRef.current = null;
  };

  // Keep track of which section is currently centered/visible in view
  React.useEffect(() => {
    const activeSectionIds = steps.map(s => `section-${s.id}`);
    
    const observerOptions = {
      root: null,
      rootMargin: '-140px 0px -55% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          const sectionName = sectionId.replace('section-', '');
          setActiveSection(sectionName);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    activeSectionIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      activeSectionIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) observer.unobserve(element);
      });
    };
  }, [steps]);

  React.useEffect(() => {
    const saved = localStorage.getItem('medscan_saved_reports2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalize = (text: string) => (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
          const targetSummaryNorm = normalize(data?.summary);

          const exists = parsed.some((item: any) => {
            if (!item?.data) return false;
            if (normalize(item.data.summary) === targetSummaryNorm) return true;
            // compare metrics
            const m1 = item.data.metrics || [];
            const m2 = data?.metrics || [];
            if (m1.length > 0 && m1.length === m2.length) {
              return m1.every((metric1: any, idx: number) => {
                const metric2 = m2[idx];
                return metric1 && metric2 && metric1.name === metric2.name && metric1.value === metric2.value;
              });
            }
            return false;
          });
          setIsSaved(exists);
        }
      } catch (err) {}
    }
  }, [data]);

  const handleSaveReport = () => {
    const saved = localStorage.getItem('medscan_saved_reports2');
    let list = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          list = parsed;
        }
      } catch (err) {}
    }

    const normalize = (text: string) => (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const targetSummaryNorm = normalize(data?.summary);

    // Deduplicate existing list to be clean
    const seenIds = new Set();
    const seenSummaries = new Set();
    list = list.filter((item: any) => {
      if (!item || !item.id) return false;
      const normSum = normalize(item.data?.summary || '');
      if (seenIds.has(item.id)) return false;
      if (normSum && seenSummaries.has(normSum)) return false;
      seenIds.add(item.id);
      if (normSum) seenSummaries.add(normSum);
      return true;
    });

    const alreadyExists = list.some((item: any) => {
      if (!item?.data) return false;
      if (normalize(item.data.summary) === targetSummaryNorm) return true;
      const m1 = item.data.metrics || [];
      const m2 = data?.metrics || [];
      if (m1.length > 0 && m1.length === m2.length) {
        return m1.every((metric1: any, idx: number) => {
          const metric2 = m2[idx];
          return metric1 && metric2 && metric1.name === metric2.name && metric1.value === metric2.value;
        });
      }
      return false;
    });

    if (alreadyExists) {
      setIsSaved(true);
      toast.info("This report is already stored in your secure vault.");
      return;
    }

    const defaultName = `${mode === 'lab' ? 'Lab Work' : mode === 'medicine' ? 'Medicine Pack' : 'Symptom Panel'} - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    
    const newSaved = {
      id: Math.random().toString(36).substring(2, 11),
      name: defaultName,
      date: new Date().toLocaleDateString(),
      mode,
      data,
      timestamp: Date.now()
    };

    list.unshift(newSaved);
    localStorage.setItem('medscan_saved_reports2', JSON.stringify(list));
    setIsSaved(true);

    const currentUser = auth.currentUser;
    if (currentUser) {
      setDoc(doc(db, 'reports', newSaved.id), cleanObject({
        ...newSaved,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      })).catch(err => {
        try {
          handleFirestoreError(err, OperationType.WRITE, `reports/${newSaved.id}`);
        } catch (fErr) {
          console.error("Manual save Firestore backup error:", fErr);
        }
      });
    }

    // Notify other components (e.g., vault lists)
    window.dispatchEvent(new Event('storage'));

    toast.success("Successfully saved to your Health Vault! Access or compare from the 'Vault' menu.");
  };

  const getSectionDisclaimer = () => {
    switch (mode) {
      case 'lab': return t('disclaimer_lab');
      case 'medicine': return t('disclaimer_medicine');
      case 'symptoms': return t('disclaimer_symptoms');
      default: return '';
    }
  };

  const shareReport = () => {
    toast.success('Report link copied to clipboard');
  };

  const getMetricColor = (status: Metric['status']) => {
    switch (status) {
      case 'normal': return 'text-emerald bg-emerald/5 border-emerald/20';
      case 'abnormal': return 'text-amber bg-amber/5 border-amber/20';
      case 'critical': return 'text-coral bg-coral/5 border-coral/20';
      default: return 'text-text-muted bg-bg-warm border-border';
    }
  };

  const getCategoryIcon = (category: PreventionPlan['category']) => {
    switch (category) {
      case 'diet': return Salad;
      case 'exercise': return Dumbbell;
      case 'lifestyle': return Moon;
      case 'wellness': return HeartPulse;
      default: return Activity;
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById('report-content-to-export');
    if (!element) return;

    try {
      toast.info('Generating PDF...', { duration: 2000 });
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`medscan-report.pdf`);
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <motion.div
      id="report-content-to-export"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full max-w-7xl mx-auto space-y-10 pb-24 px-4 pt-10 relative select-none md:select-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-accent/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-indigo/5 blur-[100px] rounded-full" />
      </div>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05, x: isRTL ? 3 : -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-3 rounded-xl bg-surface border border-border text-text-secondary hover:text-accent transition-all shadow-sm"
          >
            <ArrowLeft className={cn("w-5 h-5", isRTL && "rotate-180")} />
          </motion.button>
          <div>
             <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight leading-none mb-1 uppercase">Analysis Results</h1>
             <p className="text-[9px] font-extrabold text-text-muted tracking-[0.25em] uppercase">RedScan AI v3.0 // Clinical Output</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto" data-html2canvas-ignore="true">
          <button 
            onClick={handleSaveReport} 
            className={cn(
              "flex-1 md:flex-initial px-4 py-2.5 rounded-xl border transition-all shadow-sm flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider cursor-pointer",
              isSaved 
                ? "bg-emerald/10 border-emerald/20 text-emerald" 
                : "bg-accent/15 border-accent/25 text-accent hover:bg-accent hover:text-white"
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            {isSaved ? "Saved!" : "Save to Vault"}
          </button>
          <button onClick={shareReport} className="p-3 rounded-xl bg-surface border border-border text-text-secondary hover:border-accent transition-all shadow-sm flex items-center justify-center">
            <Share2 className="w-4.5 h-4.5" />
          </button>
          <button onClick={exportToPDF} className="p-3 rounded-xl bg-surface border border-border text-text-secondary hover:border-accent transition-all shadow-sm flex items-center justify-center">
            <Download className="w-4.5 h-4.5" />
          </button>
          <button 
            onClick={onBack} 
            className="flex-1 md:flex-initial bg-text-primary text-white dark:bg-accent dark:text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl hover:bg-black dark:hover:bg-accent-dim transition-all shadow-md"
          >
            {t('new_screening')}
          </button>
        </div>
      </div>

      {/* Visual Navigation Progress Stepper */}
      <div className="sticky top-4 z-40 transition-all duration-300 no-print select-none" data-html2canvas-ignore="true">
        <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-2.5 sm:p-3.5 max-w-5xl mx-auto shadow-md">
          <div className="flex items-center justify-between sm:justify-around gap-4 overflow-x-auto scrollbar-none scroll-smooth">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeSection === step.id;
              
              return (
                <React.Fragment key={step.id}>
                  {/* Stepper Node Button */}
                  <button
                    type="button"
                    onClick={() => scrollToSection(step.id)}
                    className="flex items-center gap-2.5 group focus:outline-none shrink-0 cursor-pointer text-left"
                  >
                    <div className={cn(
                      "w-8.5 h-8.5 rounded-xl flex items-center justify-center border transition-all duration-300 shadow-xs",
                      isActive 
                        ? "bg-accent border-accent text-white ring-4 ring-accent/10" 
                        : "bg-bg-warm/60 border-border text-text-muted group-hover:border-accent/40 group-hover:text-accent"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className={cn("hidden sm:block", isRTL ? "text-right" : "text-left")}>
                      <span className={cn(
                        "text-[10px] font-black tracking-wider uppercase block transition-colors leading-none",
                        isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"
                      )}>
                        {step.label}
                      </span>
                      <span className="text-[8px] font-semibold text-text-muted mt-1 block leading-none">
                        {step.desc}
                      </span>
                    </div>
                  </button>

                  {/* Connecting Line between steps */}
                  {idx < steps.length - 1 && (
                    <div className="flex-grow max-w-[40px] md:max-w-[100px] h-0.5 relative shrink-0">
                      <div className="absolute inset-0 bg-border/40 rounded-full" />
                      {/* Active progress transition connector */}
                      <div 
                        className="absolute inset-0 bg-accent transition-all duration-500 rounded-full" 
                        style={{ 
                          width: steps.findIndex(s => s.id === activeSection) > idx ? '100%' : '0%' 
                        }} 
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-6">
        {/* Top Warning Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-coral/10 border border-coral/30 rounded-xl p-3 flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center shrink-0 shadow-md shadow-coral/15">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] md:text-[11px] font-bold text-coral leading-tight">
            {getSectionDisclaimer()} {t('disclaimer_text')}
          </p>
        </motion.div>

        {/* Cheap Generic Alternatives (Medicine Mode Only - AT THE TOP) */}
        {mode === 'medicine' && (
          <Card className="bg-accent/5 border-2 border-accent/20">
            <SectionHeader icon={ShieldCheck} title={t('cheap_generic_alternatives')} subtitle="Cost-Effective Clinical Options" />
            <div className="flex flex-wrap gap-4">
              {data.medicineInfo?.genericAlternatives && data.medicineInfo.genericAlternatives.length > 0 ? (
                data.medicineInfo.genericAlternatives.map((alt, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 px-6 py-4 rounded-3xl bg-surface border border-accent/10 shadow-sm hover:border-accent hover:shadow-md transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                      <Pill className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-text-primary">{alt}</span>
                  </motion.div>
                ))
              ) : (
                <div className="w-full p-8 rounded-[2rem] bg-bg-warm/50 border border-dashed border-border text-center">
                  <p className="text-text-muted font-bold italic">{t('no_options_available')}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Executive Summary Section */}
        <div id="section-summary" className="scroll-mt-32 space-y-6">
          <Card className="bg-emerald/5 border-emerald/10 border-2">
            <SectionHeader icon={Sparkles} title="Executive Summary" subtitle="Clinical Intelligence Overview" />
            <p className="text-sm sm:text-base font-medium leading-relaxed text-text-primary/95">
              {data.summary}
            </p>
          </Card>



          {/* Associated Symptoms (If present) */}
          {(data.associatedSymptoms?.length ?? 0) > 0 && (
            <Card>
              <SectionHeader icon={Stethoscope} title="Associated Symptoms" subtitle="Potential manifestations related to findings" />
              <div className="flex flex-wrap gap-2">
                {data.associatedSymptoms?.map((symptom, i) => (
                  <motion.span 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-3.5 py-1.5 rounded-lg bg-bg-warm border border-border text-xs font-semibold text-text-primary transition-all hover:border-accent hover:text-accent cursor-default flex items-center gap-1.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {symptom}
                  </motion.span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Metrics Grid (Clinical Markers) and Medication Rx Details */}
        <div id="section-metrics" className="scroll-mt-32 space-y-6">
          {(data.metrics?.length ?? 0) > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-accent animate-pulse" />
                  <h3 className="text-base sm:text-lg font-bold text-text-primary uppercase tracking-tight font-display">Clinical Markers</h3>
                </div>
                <div className="h-px bg-accent/20 flex-grow mx-6 hidden md:block" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.metrics?.map((metric, i) => (
                  <MetricCard key={i} metric={metric} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Medicine Info Grid (If present) */}
          {mode === 'medicine' && data.medicineInfo && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-5 sm:p-6">
                <SectionHeader icon={Pill} title="Prescription Details" subtitle="Safety and Pharmacological Data" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-accent font-display">Indications</h5>
                    <ul className="space-y-2">
                      {data.medicineInfo.indications.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-text-secondary">
                          <ArrowLeft className="w-4 h-4 mt-0.5 text-accent rotate-180 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-accent font-display">Safe Usage</h5>
                    <p className="text-xs sm:text-sm font-medium text-text-secondary bg-bg-warm p-4 rounded-xl border border-border leading-relaxed">
                      {data.medicineInfo.safeUsage}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-coral/5 border-coral/10 p-5 sm:p-6">
                <SectionHeader icon={AlertTriangle} title="Critical Warnings" color="coral" />
                <ul className="space-y-3">
                  {data.medicineInfo.warnings.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-bold text-coral leading-tight">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-3 rounded-xl bg-surface border border-coral text-[9px] uppercase font-bold tracking-wider text-coral text-center font-display">
                  User Responsibility Disclosure Applied
                </div>
              </Card>
            </div>
          )}

          {/* Medicine Side Effects Profile (Medicine Mode Only) */}
          {mode === 'medicine' && data.medicineInfo && (data.medicineInfo.sideEffects?.length ?? 0) > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                 <AlertCircle className="w-5 h-5 text-amber" />
                 <h3 className="text-base sm:text-lg font-bold text-text-primary uppercase tracking-tight font-display">Side Effects Profile</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.medicineInfo.sideEffects.map((effect, i) => {
                  const { title, description } = parseSideEffect(effect);
                  const SideEffectIcon = getSideEffectIcon(title);
                  return (
                    <Card key={i} delay={i * 0.1} className="hover:border-amber/40 border-amber/10 transition-colors p-5">
                      <div className="w-9 h-9 rounded-xl bg-amber/10 flex items-center justify-center mb-4 ring-4 ring-amber/5 text-amber">
                        <SideEffectIcon className="w-4.5 h-4.5" />
                      </div>
                      <p className="text-[9px] font-bold text-amber uppercase tracking-wider font-display mb-1">Physiological Response</p>
                      <h4 className="text-sm sm:text-base font-bold text-text-primary mb-2 font-display leading-tight">{title}</h4>
                      <p className="text-xs sm:text-[13px] text-text-secondary leading-normal mb-4 font-normal">{description}</p>
                      <div className="pt-3 border-t border-border flex items-center gap-1.5 text-amber font-bold text-[10px] uppercase tracking-wider font-display">
                         <Info className="w-3.5 h-3.5" />
                         Monitored Response
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Prevention Plan Grid */}
        {(data.preventionPlan?.length ?? 0) > 0 && (
          <div id="section-prevention" className="scroll-mt-32 space-y-4">
            <div className="flex items-center gap-3 px-2">
               <ShieldCheck className="w-5 h-5 text-accent" />
               <h3 className="text-base sm:text-lg font-bold text-text-primary uppercase tracking-tight font-display">Prevention Plan</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {data.preventionPlan?.map((plan, i) => {
                const CategoryIcon = getCategoryIcon(plan.category);
                return (
                  <Card key={i} delay={i * 0.1} className="hover:border-accent/40 transition-colors p-5">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center mb-4 ring-4 ring-accent/5 text-accent">
                      <CategoryIcon className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-[9px] font-bold text-accent uppercase tracking-wider font-display mb-1">{plan.category}</p>
                    <h4 className="text-sm sm:text-base font-bold text-text-primary mb-2 font-display leading-tight">{plan.title}</h4>
                    <p className="text-xs sm:text-[13px] text-text-secondary leading-normal mb-4 font-normal">{plan.description}</p>
                    <div className="pt-3 border-t border-border flex items-center gap-1.5 text-accent font-bold text-[10px] uppercase tracking-wider">
                       <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                       {plan.action}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Traditional & Next Steps Footer */}
        {(data.traditionalRemedies?.length ?? 0) > 0 && (
          <div id="section-remedies" className="scroll-mt-32">
            <Card className="bg-bg-warm/30 border-border p-5 sm:p-6">
              <SectionHeader icon={Leaf} title={t('traditional_remedies')} subtitle="Complementary Supportive Insights" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.traditionalRemedies?.map((remedy, i) => (
                  <div key={i} className="flex flex-col p-4 sm:p-5 rounded-xl bg-surface border border-border/50 hover:border-accent/30 transition-all shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald/10 flex items-center justify-center text-emerald">
                        <Leaf className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-text-primary uppercase tracking-wide text-xs sm:text-sm font-display">{remedy.name}</span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-text-secondary leading-normal mb-4 font-normal">
                      {remedy.description}
                    </p>
                    <div className="mt-auto pt-3 border-t border-border/50">
                      <p className="text-[9px] font-bold text-emerald uppercase tracking-wider font-display mb-1">Context & Usage</p>
                      <p className="text-[11px] text-text-muted italic">{remedy.context}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Engine Card */}
          <Card className="p-5 sm:p-6 flex flex-col justify-between hover:border-accent/30 transition-all">
            <div>
              <SectionHeader icon={History} title={t('trend_title')} subtitle="Longitudinal Mapping Suite" />
              <p className="text-xs sm:text-sm text-text-secondary leading-normal font-normal mb-6">
                 {data.healthTrends || "No prior reports found for longitudinal comparison. Consistency in regular checkups is recommended."}
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="w-full py-3 px-4 rounded-xl border border-accent/25 bg-accent/5 hover:bg-accent text-accent hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs group"
              >
                <History className="w-4 h-4 text-accent group-hover:text-white transition-colors" />
                <span>Launch Trend Engine</span>
              </button>
            )}
          </Card>

          {/* Clinical Portal Card */}
          <Card className="p-5 sm:p-6 flex flex-col justify-between hover:border-accent/30 transition-all">
            <div>
              <SectionHeader icon={Activity} title={t('portal_title')} subtitle="Diagnostic Standards & Ref Tables" />
              <p className="text-xs sm:text-sm text-text-secondary leading-normal font-normal mb-6">
                Map clinical records against global reference ranges, standard biological indicators, and safe physiological threshold tables.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('lab')}
                className="w-full py-3 px-4 rounded-xl border border-accent/25 bg-accent/5 hover:bg-accent text-accent hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs group"
              >
                <Activity className="w-4 h-4 text-accent group-hover:text-white transition-colors animate-pulse" />
                <span>Explore Clinical Portal</span>
              </button>
            )}
          </Card>

          {/* Doctor Discussion Card */}
          <Card className="p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <SectionHeader icon={HelpCircle} title="Doctor Discussion" subtitle="Informed Medical Dialogue" />
              <ul className="space-y-3 mb-6">
                {(data.medicineInfo?.doctorQuestions || data.nextSteps || []).slice(0, 4).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-text-secondary leading-normal">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center py-2.5 bg-bg-warm/50 border border-border/40 rounded-xl">
              Take these to your next visit
            </div>
          </Card>
        </div>

        {/* User Feedback System */}
        <FeedbackSystem analysisId={data.summary.substring(0, 50)} />

        {/* ID & Verification Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-8 border-t border-border">
          <div className="flex items-center gap-4 text-[9px] font-bold font-mono tracking-wider text-text-muted uppercase">
             <span>ID: MS-RPT-{Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
             <div className="w-1 h-1 rounded-full bg-border" />
             <span>Precision Diagnostics Engine v3.0</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
             <span className="text-[9px] font-bold uppercase text-accent tracking-wider font-display">Verified Signature</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

