import React, { useState, useEffect } from 'react';
import { 
  History, 
  Trash2, 
  Plus, 
  ArrowRight, 
  Scale, 
  FileText, 
  Bookmark, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Edit3, 
  Check, 
  FolderHeart, 
  Info,
  Layers,
  FlaskConical,
  Pill,
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { cn, cleanObject } from '../lib/utils';
import { toast } from 'sonner';
import { AnalysisData, Metric } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, getDocs, collection, query, where } from 'firebase/firestore';

export interface SavedReport {
  id: string;
  name: string;
  date: string;
  mode: 'lab' | 'medicine' | 'symptoms';
  data: AnalysisData;
}

interface ReportComparisonProps {
  onViewReport: (data: AnalysisData, mode: 'lab' | 'medicine' | 'symptoms') => void;
  autosaveEnabled: boolean;
  onToggleAutosave: () => void;
  historyRetention: string;
  setHistoryRetention: (val: string) => void;
}

export default function ReportComparison({ 
  onViewReport, 
  autosaveEnabled, 
  onToggleAutosave,
  historyRetention,
  setHistoryRetention
}: ReportComparisonProps) {
  const { t, language } = useTranslation();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [compareActive, setCompareActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load saved reports from LocalStorage and listen to external storage updates
  useEffect(() => {
    const loadReports = () => {
      const saved = localStorage.getItem('medscan_saved_reports2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Deduplicate reports dynamically
            const seenIds = new Set();
            const seenSummaries = new Set();
            const normalize = (text: string) => (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
            const dedupedBy = parsed.filter((item: any) => {
              if (!item || !item.id) return false;
              const normSum = normalize(item.data?.summary || '');
              if (seenIds.has(item.id)) return false;
              if (normSum && seenSummaries.has(normSum)) return false;
              seenIds.add(item.id);
              if (normSum) seenSummaries.add(normSum);
              return true;
            });
            setReports(dedupedBy);
            // Write clean list back if it was deduplicated
            if (dedupedBy.length !== parsed.length) {
              localStorage.setItem('medscan_saved_reports2', JSON.stringify(dedupedBy));
            }
          } else {
            setReports([]);
          }
        } catch (err) {
          console.error("Failed to parse saved reports:", err);
        }
      } else {
        // Load legacy reports schema if exists
        const legacy = localStorage.getItem('medscan_saved_reports');
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            setReports(parsed);
            localStorage.setItem('medscan_saved_reports2', legacy);
          } catch (e) {}
        }
      }
    };

    loadReports();

    window.addEventListener('storage', loadReports);
    return () => {
      window.removeEventListener('storage', loadReports);
    };
  }, []);

  const saveReportsList = async (updated: SavedReport[]) => {
    // Deduplicate list in saveReportsList to prevent duplicates being written
    const seenIds = new Set();
    const seenSummaries = new Set();
    const normalize = (text: string) => (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
    
    const deduped = updated.filter((item: any) => {
      if (!item || !item.id) return false;
      const normSum = normalize(item.data?.summary || '');
      if (seenIds.has(item.id)) return false;
      if (normSum && seenSummaries.has(normSum)) return false;
      seenIds.add(item.id);
      if (normSum) seenSummaries.add(normSum);
      return true;
    });

    setReports(deduped);
    localStorage.setItem('medscan_saved_reports2', JSON.stringify(deduped));

    const user = auth.currentUser;
    if (user) {
      try {
        // Write all reports in the list to Firestore
        for (const rep of deduped) {
          await setDoc(doc(db, 'reports', rep.id), cleanObject({
            ...rep,
            userId: user.uid,
            createdAt: new Date().toISOString()
          }), { merge: true });
        }

        // Delete reports from Firestore that are no longer present in local list for this user
        const q = query(collection(db, 'reports'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          const reportId = document.id;
          const stillExists = deduped.some(r => r.id === reportId);
          if (!stillExists) {
            await deleteDoc(doc(db, 'reports', reportId));
          }
        });
      } catch (err) {
        console.error("Failed to sync reports updates to Firestore:", err);
      }
    }
  };

  const handleRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const submitRename = (id: string) => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    const updated = reports.map(r => r.id === id ? { ...r, name: editName.trim() } : r);
    saveReportsList(updated);
    setEditingId(null);
    toast.success("Report name updated successfully");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast("Delete this report permanently?", {
      action: {
        label: "Confirm Delete",
        onClick: () => {
          const updated = reports.filter(r => r.id !== id);
          saveReportsList(updated);
          setSelectedForCompare(prev => prev.filter(item => item !== id));
          toast.info("Report removed from vault.");
        }
      },
      duration: 6000,
      position: 'bottom-center'
    });
  };

  const handleClearAll = () => {
    if (reports.length === 0) {
      toast.info("Your vault is already empty!");
      return;
    }
    toast("Delete ALL clinical reports permanently?", {
      action: {
        label: "Yes, Clear All",
        onClick: () => {
          saveReportsList([]);
          setSelectedForCompare([]);
          setCompareActive(false);
          toast.success("All stored reports have been deleted permanently.");
        }
      },
      duration: 7000,
      position: 'bottom-center'
    });
  };

  const toggleSelectForCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 2) {
        toast.warning("You can select up to two reports for comparison. Please uncheck a report first.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const clearSelection = () => {
    setSelectedForCompare([]);
    setCompareActive(false);
  };

  // Extract reports for side by side comparison
  const reportA = reports.find(r => r.id === selectedForCompare[0]);
  const reportB = reports.find(r => r.id === selectedForCompare[1]);

  // Analyze shared metrics for Lab results
  interface CompareMetricRow {
    name: string;
    unit: string;
    refRange: string;
    valA: number | null;
    strValA: string;
    statusA: string;
    valB: number | null;
    strValB: string;
    statusB: string;
    delta: number | null;
    clinicalInsight: string;
  }

  const getCompareMetrics = (): CompareMetricRow[] => {
    if (!reportA || !reportB) return [];
    const metricsA = reportA.data.metrics || [];
    const metricsB = reportB.data.metrics || [];

    const mapA = new Map<string, Metric>();
    metricsA.forEach(m => mapA.set(m.name.toLowerCase().trim(), m));

    const mapB = new Map<string, Metric>();
    metricsB.forEach(m => mapB.set(m.name.toLowerCase().trim(), m));

    // Combine all unique biometric names
    const allNames = Array.from(new Set([
      ...metricsA.map(m => m.name.trim()),
      ...metricsB.map(m => m.name.trim())
    ]));

    return allNames.map(name => {
      const cleanName = name.toLowerCase().trim();
      const mA = mapA.get(cleanName);
      const mB = mapB.get(cleanName);

      const floatA = mA ? parseFloat(mA.value.replace(/[^\d.]/g, '')) : null;
      const floatB = mB ? parseFloat(mB.value.replace(/[^\d.]/g, '')) : null;

      let delta: number | null = null;
      if (mA && mB && !isNaN(floatA ?? NaN) && !isNaN(floatB ?? NaN) && floatA !== null && floatB !== null) {
        delta = floatB - floatA;
      }

      return {
        name,
        unit: mA?.unit || mB?.unit || '',
        refRange: mA?.referenceRange || mB?.referenceRange || 'Unknown',
        valA: floatA,
        strValA: mA?.value || '—',
        statusA: mA?.status || '',
        valB: floatB,
        strValB: mB?.value || '—',
        statusB: mB?.status || '',
        delta,
        clinicalInsight: mB?.interpretation || mA?.interpretation || ''
      };
    });
  };

  const comparedMetrics = getCompareMetrics();

  const getStatusBadgeClass = (status: string) => {
    const isNormal = status === 'normal';
    const isCritical = status === 'critical';
    if (isNormal) return 'text-emerald bg-emerald/10 border-emerald/20';
    if (isCritical) return 'text-coral bg-coral/10 border-coral/20 animate-pulse';
    return 'text-amber bg-amber/10 border-amber/20';
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'lab': return FlaskConical;
      case 'medicine': return Pill;
      case 'symptoms': return Search;
      default: return FileText;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'lab': return 'Lab Work';
      case 'medicine': return 'Prescription';
      case 'symptoms': return 'Symptom Log';
      default: return 'Report';
    }
  };

  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.name.toLowerCase().includes(query) ||
      getModeLabel(report.mode).toLowerCase().includes(query)
    );
  });

  return (
    <div id="compare-suite" className="space-y-12">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 text-accent mb-3">
            <FolderHeart className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Health Vault Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Your Stored Health Records</h2>
          <p className="text-text-secondary text-xs sm:text-sm font-medium max-w-xl mt-2 leading-relaxed opacity-90">
            Renamable clinical insights archived securely in local sandbox database. Select any to compare longitudinal biological trendlines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* History Retention Control Dropdown */}
          <div className="flex items-center gap-3 bg-surface border border-border px-4 py-2 rounded-2xl shadow-sm">
            <div className="text-left select-none">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-wider leading-none">History Retention</p>
              <span className="text-[11px] font-black text-text-secondary capitalize">
                {historyRetention === 'forever' ? 'Keep Forever' : historyRetention.replace('_', ' ')}
              </span>
            </div>
            <select
              value={historyRetention}
              onChange={(e) => setHistoryRetention(e.target.value)}
              className="text-xs font-bold text-text-primary bg-bg-warm border border-border/80 rounded-xl p-1 px-2 focus:border-accent outline-none cursor-pointer"
            >
              <option value="24_hours">24 Hours</option>
              <option value="7_days">7 Days</option>
              <option value="15_days">15 Days</option>
              <option value="21_days">21 Days</option>
              <option value="1_month">1 Month</option>
              <option value="3_months">3 Months</option>
              <option value="6_months">6 Months</option>
              <option value="1_year">1 Year</option>
              <option value="forever">Forever</option>
            </select>
          </div>

          {/* Autosave Switch */}
          <div className="flex items-center gap-3 bg-surface border border-border px-4 py-2 rounded-2xl shadow-sm">
            <div className="text-left select-none">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-wider leading-none">Autosave Vault</p>
              <p className="text-[11px] font-black text-text-secondary">{autosaveEnabled ? 'Auto-Save' : 'Manual'}</p>
            </div>
            <button
              onClick={onToggleAutosave}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                autosaveEnabled ? "bg-accent" : "bg-border"
              )}
              title="Toggle automatic saving of reports to the Health Vault"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  autosaveEnabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {selectedForCompare.length > 0 && (
            <div className="flex items-center gap-4 bg-surface border border-accent/20 p-2.5 rounded-2xl shadow-xl shadow-accent/5">
              <div className="text-left pl-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Comparison Deck</p>
                <p className="text-xs font-black text-accent">{selectedForCompare.length} of 2 Selected</p>
              </div>
              {selectedForCompare.length === 2 ? (
                <button
                  onClick={() => setCompareActive(true)}
                  className="px-5 py-2.5 bg-accent text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-accent-dim transition-all flex items-center gap-2 active:scale-95 cursor-pointer shadow-md shadow-accent/10"
                >
                  <Scale className="w-4 h-4" />
                  Compare Now
                </button>
              ) : (
                <div className="px-5 py-2.5 bg-bg-warm border border-border text-text-muted text-xs font-black uppercase tracking-widest rounded-xl">
                  Select 1 More
                </div>
              )}
              <button 
                onClick={clearSelection}
                className="p-2 border border-border rounded-xl hover:bg-coral/5 hover:text-coral transition-colors"
                title="Clear desk selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* State A: Compare Display Is Active */}
        {compareActive && reportA && reportB ? (
          <motion.div
            key="compare-grid"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {/* Header comparison card */}
            <div className="p-6 sm:p-8 rounded-[2.5rem] bg-surface border border-border flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl pointer-events-none rounded-full -mr-32 -mt-32" />
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <Scale className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-text-primary tracking-tight">Longitudinal Comparison Screen</h3>
                    <p className="text-xs text-text-secondary font-semibold">Comparing chronological biometric fluctuations</p>
                  </div>
               </div>

               <div className="flex gap-4 w-full md:w-auto">
                 <button
                   onClick={() => setCompareActive(false)}
                   className="flex-1 md:flex-initial px-6 py-3 rounded-xl border border-border hover:bg-bg-warm text-xs font-black uppercase tracking-widest text-text-secondary transition-all"
                 >
                   Back to Vault
                 </button>
                 <button
                   onClick={clearSelection}
                   className="flex-1 md:flex-initial px-6 py-3 rounded-xl bg-text-primary text-white dark:bg-accent dark:text-white hover:bg-black dark:hover:bg-accent-dim text-xs font-black uppercase tracking-widest transition-all"
                 >
                   Clear Selection
                 </button>
               </div>
            </div>

            {/* Quick Report Summaries Side-By-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Report 1 Card */}
              <div className="p-8 rounded-3xl bg-surface border-t-4 border-t-indigo border border-border shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2.5">
                     <span className="p-2 bg-indigo/5 text-indigo rounded-xl border border-indigo/10">
                       <FileText className="w-4 h-4" />
                     </span>
                     <p className="text-[10px] font-black text-indigo uppercase tracking-[0.2em]">{getModeLabel(reportA.mode)}</p>
                   </div>
                   <span className="text-[10px] text-text-muted font-mono font-bold uppercase">{reportA.date}</span>
                 </div>
                 <h4 className="text-2xl font-black text-text-primary">{reportA.name}</h4>
                 <div className="p-5 rounded-2xl bg-bg-warm/60 border border-border">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Diagnostic Summary</p>
                    <p className="text-sm text-text-secondary leading-relaxed font-semibold">{reportA.data.summary}</p>
                 </div>
              </div>

              {/* Report 2 Card */}
              <div className="p-8 rounded-3xl bg-surface border-t-4 border-t-accent border border-border shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2.5">
                     <span className="p-2 bg-accent/5 text-accent rounded-xl border border-accent/10">
                       <FileText className="w-4 h-4" />
                     </span>
                     <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">{getModeLabel(reportB.mode)}</p>
                   </div>
                   <span className="text-[10px] text-text-muted font-mono font-bold uppercase">{reportB.date}</span>
                 </div>
                 <h4 className="text-2xl font-black text-text-primary">{reportB.name}</h4>
                 <div className="p-5 rounded-2xl bg-bg-warm/60 border border-border">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Diagnostic Summary</p>
                    <p className="text-sm text-text-secondary leading-relaxed font-semibold">{reportB.data.summary}</p>
                 </div>
              </div>
            </div>

            {/* In-depth Metrics Correlation Comparison */}
            {comparedMetrics.length > 0 && (
              <div className="p-8 sm:p-10 rounded-3xl bg-surface border border-border shadow-sm space-y-8">
                <div>
                   <h4 className="text-xl font-black text-text-primary tracking-tight">Quantitative Biomaker Variances</h4>
                   <p className="text-xs text-text-muted font-bold uppercase tracking-wider mt-1">Side-by-side metric analytics & mathematical delta calculations</p>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/80 text-[10px] font-black uppercase tracking-wider text-text-muted pb-4">
                          <th className="py-4 font-black">Biomarker / Range</th>
                          <th className="py-4 font-black">{reportA.name}</th>
                          <th className="py-4 font-black">{reportB.name}</th>
                          <th className="py-4 font-black text-center">Variance / Delta</th>
                          <th className="py-4 font-black hidden lg:table-cell pl-4">Primary Therapeutic Focus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 text-sm">
                        {comparedMetrics.map((row, index) => {
                          const isNumeric = row.delta !== null;
                          const deltaStr = row.delta !== null 
                            ? (row.delta > 0 ? `+${row.delta.toFixed(1)}` : row.delta.toFixed(1)) 
                            : '—';
                          const isImproved = isNumeric && 
                            ((row.statusA === 'high' && row.delta! < 0) || 
                             (row.statusA === 'low' && row.delta! > 0) || 
                             (row.statusA !== 'normal' && row.statusB === 'normal'));
                          const isWorsened = isNumeric && 
                            ((row.statusA === 'normal' && row.statusB !== 'normal') ||
                             (row.statusA === 'low' && row.delta! < 0) || 
                             (row.statusA === 'high' && row.delta! > 0));
                          const isStable = isNumeric && !isImproved && !isWorsened;
                          
                          const isNewlyAbnormal = isNumeric && row.statusA === 'normal' && row.statusB !== 'normal';
                          const isNewlyNormal = isNumeric && row.statusA !== 'normal' && row.statusB === 'normal';

                          // Compute modern, highly refined background highlight classes for the row
                          let rowBgClass = "hover:bg-bg-warm/20 transition-colors";
                          if (isNumeric) {
                            if (isImproved) {
                              rowBgClass = "bg-emerald/[0.015] hover:bg-emerald/[0.035] transition-colors border-l-2 border-l-emerald";
                            } else if (isWorsened) {
                              rowBgClass = "bg-coral/[0.012] hover:bg-coral/[0.025] transition-colors border-l-2 border-l-coral";
                            } else {
                              rowBgClass = "bg-surface hover:bg-bg-warm/15 transition-colors border-l-2 border-l-border/30";
                            }
                          } else {
                            rowBgClass = "hover:bg-bg-warm/20 transition-colors border-l-2 border-l-transparent";
                          }

                          return (
                            <tr key={index} className={cn("transition-all duration-200 border-b border-border/30", rowBgClass)}>
                              <td className="py-5 pr-4 pl-3">
                                <div className="flex items-center gap-2">
                                  {isNumeric && (
                                    <span 
                                      className={cn(
                                        "w-2 h-2 rounded-full shrink-0 shadow-sm", 
                                        isImproved ? "bg-emerald shadow-emerald/30 animate-pulse" :
                                        isWorsened ? "bg-coral shadow-coral/30 animate-pulse duration-700" :
                                        "bg-text-muted/65"
                                      )}
                                      title={isImproved ? "Significant Improvement" : isWorsened ? "Attentive Observation Required" : "Stable/Unchanged"}
                                    />
                                  )}
                                  <p className="font-extrabold text-text-primary text-sm sm:text-base">{row.name}</p>
                                </div>
                                <div className={cn("flex items-center gap-1.5 mt-1.5", isNumeric ? "pl-4" : "")}>
                                  <span className="text-[9px] font-bold font-mono text-text-muted uppercase bg-bg-warm/80 px-1.5 py-0.5 rounded border border-border/80">Ref: {row.refRange}</span>
                                  {row.unit && <span className="text-[9px] font-extrabold font-mono text-text-muted uppercase">{row.unit}</span>}
                                </div>
                              </td>
                              
                              <td className="py-5 pr-4">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-base font-bold font-mono text-text-primary">{row.strValA}</span>
                                  {row.statusA && (
                                    <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shadow-sm", getStatusBadgeClass(row.statusA))}>
                                      {row.statusA}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className={cn(
                                "py-5 px-3 relative transition-colors duration-300 rounded-lg",
                                isNewlyAbnormal && "bg-coral/10 border border-coral/20",
                                isNewlyNormal && "bg-emerald/10 border border-emerald/20"
                              )}>
                                {(isNewlyAbnormal || isNewlyNormal) && (
                                  <div className="absolute top-2 right-2">
                                    <span className="flex h-2 w-2">
                                      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isNewlyAbnormal ? "bg-coral" : "bg-emerald")}></span>
                                      <span className={cn("relative inline-flex rounded-full h-2 w-2", isNewlyAbnormal ? "bg-coral" : "bg-emerald")}></span>
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  {isNumeric && !isStable && (
                                    <span className={cn(
                                       "flex items-center justify-center w-5 h-5 rounded-full shrink-0 shadow-sm",
                                       isImproved ? "bg-emerald/15 text-emerald border border-emerald/20" : "bg-coral/15 text-coral border border-coral/20 animate-pulse transition-all"
                                    )} title={isImproved ? "Improvement" : "Deterioration"}>
                                      {row.delta! > 0 ? (
                                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                      ) : (
                                        <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                                      )}
                                    </span>
                                  )}
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-base font-bold font-mono text-text-primary">{row.strValB}</span>
                                    {row.statusB && (
                                      <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shadow-sm", getStatusBadgeClass(row.statusB))}>
                                        {row.statusB}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-5 text-center">
                                {isNumeric ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className={cn(
                                      "font-mono font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl flex items-center gap-1.5 border shadow-sm",
                                      isImproved ? "text-emerald bg-emerald/10 border-emerald/25" :
                                      isWorsened ? "text-coral bg-coral/10 border-coral/25" :
                                      "text-text-secondary bg-bg-warm/80 border-border"
                                    )}>
                                      {isStable ? (
                                        <span className="w-2.5 h-0.5 bg-text-muted rounded-full inline-block" />
                                      ) : row.delta! > 0 ? (
                                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                      ) : (
                                        <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                                      )}
                                      <span className="leading-none">{deltaStr}</span>
                                    </span>
                                    <span className={cn(
                                      "text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold mt-1.5 px-2 py-0.5 rounded-md border leading-none font-display",
                                      isImproved ? "text-emerald bg-emerald/5 border-emerald/10" :
                                      isWorsened ? "text-coral bg-coral/5 border-coral/15 animate-pulse" :
                                      "text-text-muted bg-bg-warm border-border/40"
                                    )}>
                                      {isImproved ? "Improved" : isWorsened ? "Observe" : "Stable"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-text-muted font-mono font-bold text-xs bg-bg-warm/85 px-2.5 py-1 rounded-lg border border-border/80">Different Tests</span>
                                )}
                              </td>

                              <td className="py-5 pl-4 hidden lg:table-cell max-w-[280px]">
                                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed font-semibold">{row.clinicalInsight}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                   </table>
                </div>
              </div>
            )}

            {/* Dual Mode Interaction Matrix (Unified Correlation Card) */}
            {reportA.mode !== reportB.mode && (
              <div className="p-8 sm:p-10 rounded-3xl bg-bg-warm/30 border border-dashed border-border shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-amber/15 p-2 rounded-2xl border border-amber/20 text-text-primary">
                    <AlertTriangle className="w-5 h-5 text-amber" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-text-primary">Synergistic Clinical Correlation</h4>
                    <p className="text-xs text-text-muted font-bold uppercase tracking-wider leading-none mt-1">Cross-referencing distinct medical file formats</p>
                  </div>
                </div>

                <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
                  <p className="text-sm text-text-secondary leading-relaxed font-semibold">
                    You are comparing two different clinical report modes: a <strong className="text-indigo">{getModeLabel(reportA.mode)}</strong> with a <strong className="text-accent">{getModeLabel(reportB.mode)}</strong>. 
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    While they cannot be graphed with numerical delta equations, analyzing your reports simultaneously can provide extremely valuable bio-insights:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                     <div className="p-4 rounded-xl border border-border bg-bg-warm/40">
                       <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-1">Prescription Compliance</p>
                       <p className="text-xs text-text-secondary">Correlate active prescription ingredients with improvements shown on subsequent blood panel results.</p>
                     </div>
                     <div className="p-4 rounded-xl border border-border bg-bg-warm/40">
                       <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-1">Symptomatic Correlation</p>
                       <p className="text-xs text-text-secondary">Validate if reported symptoms of fatigue or blood pressure fluctuations match the specific deficiencies flagged in your diagnostics.</p>
                     </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Prevention compliance analysis info */}
            <div className="p-6 rounded-3xl bg-surface border border-border space-y-4 shadow-sm">
              <h4 className="text-base font-black text-text-primary uppercase tracking-wider">Lifestyle Recommendations Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-black text-indigo uppercase tracking-widest">{reportA.name} Strategies:</p>
                  <ul className="space-y-1.5 text-xs text-text-secondary">
                    {(reportA.data.preventionPlan || []).slice(0, 3).map((plan, i) => (
                      <li key={i} className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-indigo flex-shrink-0 mt-0.5" /> {plan.title}: {plan.description}</li>
                    ))}
                    {(reportA.data.preventionPlan || []).length === 0 && <span className="text-text-muted italic block">No structural strategy suggested</span>}
                  </ul>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-black text-accent uppercase tracking-widest">{reportB.name} Strategies:</p>
                  <ul className="space-y-1.5 text-xs text-text-secondary">
                    {(reportB.data.preventionPlan || []).slice(0, 3).map((plan, i) => (
                      <li key={i} className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" /> {plan.title}: {plan.description}</li>
                    ))}
                    {(reportB.data.preventionPlan || []).length === 0 && <span className="text-text-muted italic block">No structural strategy suggested</span>}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* State B: Manage Reports Vault List */
          <motion.div
            key="vault-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {reports.length === 0 ? (
               <div className="p-16 border-2 border-dashed border-border rounded-[2.5rem] bg-surface text-center space-y-6 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-accent/5 border border-accent/10 flex items-center justify-center mx-auto text-accent">
                    <Bookmark className="w-8 h-8 opacity-60" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                     <h3 className="text-xl font-black text-text-primary">Secure Clinical Archive is Empty</h3>
                     <p className="text-sm text-text-secondary leading-relaxed font-semibold">
                       You haven't archived any analyses in this session yet. Run an AI clinical analysis on a report and click "Save to Vault" to start tracking improvements.
                     </p>
                  </div>
               </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Reports Vault List Deck */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] pl-2">{reports.length} secure document(s) saved</p>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                          type="text"
                          placeholder="Search reports by name or type..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted focus:border-accent outline-none"
                        />
                      </div>
                      <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-coral/20 hover:border-coral/40 bg-coral/5 hover:bg-coral/10 text-coral transition-colors text-[10px] font-black uppercase tracking-wider cursor-pointer h-[34px]"
                        title="Clear all archived diagnostic reports"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {filteredReports.map((report) => {
                      const Icon = getModeIcon(report.mode);
                      const isSelected = selectedForCompare.includes(report.id);
                      const isEditing = editingId === report.id;

                      return (
                        <motion.div
                          key={report.id}
                          className={cn(
                            "p-5 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface",
                            isSelected 
                              ? "border-accent ring-2 ring-accent/15" 
                              : "border-border hover:border-accent/30"
                          )}
                          onClick={() => onViewReport(report.data, report.mode)}
                        >
                          {/* Inner glow */}
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                          )}

                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                              report.mode === 'lab' ? "bg-emerald/5 border-emerald/15 text-emerald" :
                              report.mode === 'medicine' ? "bg-amber/5 border-amber/15 text-amber" :
                              "bg-indigo/5 border-indigo/15 text-indigo"
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="px-3 py-1.5 border border-accent rounded-lg bg-surface text-text-primary text-sm font-bold min-w-[150px] outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') submitRename(report.id);
                                      if (e.key === 'Escape') setEditingId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => submitRename(report.id)}
                                    className="p-1.5 bg-accent text-white rounded-lg hover:bg-accent-dim"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 border border-border rounded-lg hover:bg-bg-warm"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap text-text-primary">
                                  <p className="font-extrabold text-base truncate max-w-[200px] sm:max-w-md">
                                    {report.name}
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRename(report.id, report.name);
                                    }}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-accent transition-all text-text-muted"
                                    title="Rename"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 mt-1 sm:mt-1.5 flex-wrap">
                                <span className="text-[9px] font-extrabold font-mono text-text-muted uppercase bg-bg-warm px-1.5 py-0.5 rounded border border-border">
                                  {report.date}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                                  {getModeLabel(report.mode)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                             {/* Compare check selector */}
                             <button
                               onClick={(e) => toggleSelectForCompare(report.id, e)}
                               className={cn(
                                 "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest leading-none border transition-all cursor-pointer",
                                 isSelected 
                                   ? "bg-accent text-white border-accent shadow-md shadow-accent/15" 
                                   : "bg-surface border-border text-text-secondary hover:border-accent/40"
                                )}
                             >
                               <Scale className="w-3" />
                               {isSelected ? "Selected" : "Add to Compare"}
                             </button>

                             {/* Delete */}
                             <button
                               onClick={(e) => handleDelete(report.id, e)}
                               className="p-2.5 rounded-xl bg-bg-warm border border-border text-text-muted hover:text-coral hover:border-coral/20 hover:bg-coral/5 transition-all"
                               title="Permanently remove"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </motion.div>
                      );
                    })}
                    {filteredReports.length === 0 && searchQuery && (
                       <div className="p-8 text-center text-text-muted text-sm font-semibold border border-dashed border-border rounded-3xl">
                         No reports found matching "{searchQuery}".
                       </div>
                    )}
                  </div>
                </div>

                {/* Right sidebar comparison instructions */}
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-bg-warm/60 border border-border space-y-4">
                     <p className="text-xs font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
                       <Scale className="w-4 h-4 text-accent" />
                       Biometric Comparison Logic
                     </p>
                     
                     <div className="space-y-3.5 text-xs text-text-secondary font-semibold leading-relaxed">
                        <p>
                          Our deep compliance comparisons parse clinical parameters chronologically. To analyze a biological trend:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-[11px] text-text-muted">
                           <li>Select exactly two diagnostics inside the Vault.</li>
                           <li>For lab panels, the engine will isolate matching variables automatically.</li>
                           <li>Deltas and clinical improvement indicators are processed in real-time.</li>
                        </ol>
                        <div className="pt-2 border-t border-border/80 text-[10px] text-text-muted italic flex items-start gap-1.5">
                          <Info className="w-4 h-4 flex-shrink-0 text-accent" />
                          Different modes (e.g., Symptom list compared with prescription package) generate synergistic medical associations.
                        </div>
                     </div>
                  </div>

                  {selectedForCompare.length === 2 && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-6 rounded-3xl bg-emerald/5 border border-emerald/15 space-y-4"
                    >
                      <p className="text-xs font-black uppercase tracking-widest text-emerald flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Deck Ready
                      </p>
                      <p className="text-xs text-text-secondary font-semibold">
                        Two reports staged safely inside comparing registry. Launch calculation portal:
                      </p>
                      <button
                        onClick={() => setCompareActive(true)}
                        className="w-full justify-center px-6 py-4 bg-accent text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-accent-dim shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Scale className="w-4 h-4" />
                        Launch Comparison Engine
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
