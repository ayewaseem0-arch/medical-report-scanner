import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Terminal, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Info,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../lib/utils';

interface LabMetric {
  name: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low';
  history: { date: string, val: number }[];
  description: string;
}

const mockMetrics: LabMetric[] = [
  {
    name: "Glucose (Fasting)",
    value: 105,
    unit: "mg/dL",
    referenceRange: "70 - 99",
    status: 'high',
    history: [
      { date: 'Jan', val: 98 },
      { date: 'Feb', val: 102 },
      { date: 'Mar', val: 105 }
    ],
    description: "Fasting blood sugar level. High levels may indicate prediabetes or diabetes risk."
  },
  {
    name: "Total Cholesterol",
    value: 185,
    unit: "mg/dL",
    referenceRange: "< 200",
    status: 'normal',
    history: [
      { date: 'Jan', val: 195 },
      { date: 'Feb', val: 190 },
      { date: 'Mar', val: 185 }
    ],
    description: "Combined measure of LDL, HDL, and other lipid components."
  },
  {
    name: "Hemoglobin (Hgb)",
    value: 14.2,
    unit: "g/dL",
    referenceRange: "13.5 - 17.5",
    status: 'normal',
    history: [
      { date: 'Jan', val: 13.8 },
      { date: 'Feb', val: 14.0 },
      { date: 'Mar', val: 14.2 }
    ],
    description: "Protein in red blood cells that carries oxygen."
  },
  {
    name: "Vitamin D",
    value: 22,
    unit: "ng/mL",
    referenceRange: "30 - 100",
    status: 'low',
    history: [
      { date: 'Jan', val: 28 },
      { date: 'Feb', val: 25 },
      { date: 'Mar', val: 22 }
    ],
    description: "Essential for bone health and immune function. Levels below 30 are considered insufficient."
  }
];

export default function LabResultScreen() {
  const [selectedMetric, setSelectedMetric] = useState<LabMetric>(mockMetrics[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    
    // Stop any existing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const narrateMetric = (metric: LabMetric) => {
    const statusText = metric.status === 'normal' ? 'within normal range' : `flagged as ${metric.status}`;
    const text = `${metric.name} is ${metric.value} ${metric.unit}. This is ${statusText}. Reference range is ${metric.referenceRange}. ${metric.description}`;
    speak(text);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div id="lab-result-screen" className="w-full max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <div className="flex items-center gap-2 text-accent mb-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Real-time Clinical Data</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Diagnostic Metrics</h2>
        </div>
        
        <div className="flex items-center gap-3 bg-surface border border-border p-1.5 rounded-2xl shadow-sm">
           <button 
             onClick={() => setVoiceEnabled(!voiceEnabled)}
             className={cn(
               "p-2.5 rounded-xl transition-all",
               voiceEnabled ? "text-accent bg-accent/5 ring-1 ring-accent/10" : "text-text-muted hover:bg-bg-warm"
             )}
           >
             {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
           </button>
           <button 
             onClick={() => narrateMetric(selectedMetric)}
             disabled={isSpeaking || !voiceEnabled}
             className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-accent-dim active:scale-95 shadow-md shadow-accent/10"
           >
             {isSpeaking ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
             {isSpeaking ? 'Analyzing...' : 'Listen to Insight'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Metrics List */}
        <div className="lg:col-span-4 space-y-4 custom-scrollbar overflow-y-auto max-h-[650px] pr-2">
          {mockMetrics.map((metric) => (
            <motion.button
              key={metric.name}
              onClick={() => {
                setSelectedMetric(metric);
                if (voiceEnabled) narrateMetric(metric);
              }}
              whileHover={{ x: 6 }}
              className={cn(
                "w-full text-left p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-sm",
                selectedMetric.name === metric.name 
                  ? "bg-surface border-accent ring-2 ring-accent/5" 
                  : "bg-surface border-border hover:border-accent/30"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold font-mono text-text-muted uppercase tracking-widest">{metric.unit}</span>
                {metric.status !== 'normal' && (
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ring-1 ring-inset",
                    metric.status === 'high' ? "bg-coral/5 text-coral ring-coral/20" : "bg-amber/5 text-amber ring-amber/20"
                  )}>
                    {metric.status}
                  </span>
                )}
              </div>
              
              <h4 className="font-bold text-xl text-text-primary group-hover:text-accent transition-colors tracking-tight">
                {metric.name}
              </h4>
              
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-3xl font-mono font-bold text-text-primary tabular-nums">{metric.value}</span>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Normal: {metric.referenceRange}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Right Column: Detailed View */}
        <div className="lg:col-span-8">
          <div className="bg-surface border border-border rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-sm ring-1 ring-border/50 h-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-12">
              <div>
                <h3 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                  {selectedMetric.name}
                  <div className="p-1.5 rounded-lg bg-bg-warm transition-colors hover:bg-border cursor-help">
                    <Info className="w-4 h-4 text-text-muted" />
                  </div>
                </h3>
                <p className="text-text-secondary text-base leading-relaxed mt-4 max-w-xl">
                  {selectedMetric.description}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 bg-bg-warm/50 p-4 rounded-2xl border border-border/50">
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">30-Day Variance</p>
                 <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1 rounded-full",
                      selectedMetric.history[selectedMetric.history.length-1].val > selectedMetric.history[selectedMetric.history.length-2].val ? "bg-coral/10 text-coral" : "bg-accent/10 text-accent"
                    )}>
                       {selectedMetric.history[selectedMetric.history.length-1].val > selectedMetric.history[selectedMetric.history.length-2].val ? (
                         <TrendingUp className="w-4 h-4" />
                       ) : (
                         <TrendingDown className="w-4 h-4" />
                       )}
                    </div>
                    <span className="text-2xl font-mono font-bold text-text-primary tabular-nums">
                      {Math.abs(((selectedMetric.value - selectedMetric.history[0].val) / selectedMetric.history[0].val) * 100).toFixed(1)}%
                    </span>
                 </div>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedMetric.history}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }} 
                    dy={15}
                  />
                  <YAxis hide domain={['dataMin - 15', 'dataMax + 15']} />
                  <Tooltip 
                    cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                      border: '1px solid var(--color-border)'
                    }}
                    labelStyle={{ fontWeight: 800, marginBottom: '4px', color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase' }}
                    itemStyle={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-mono)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="val" 
                    stroke="var(--color-accent)" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    animationDuration={1500}
                    activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: 'var(--color-accent)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-10 border-t border-border">
               {[
                 { label: 'Baseline', value: selectedMetric.history[0].val },
                 { label: 'Mid-Cycle', value: selectedMetric.history[1].val },
                 { label: 'Current', value: selectedMetric.history[2].val },
                 { label: 'Average', value: (selectedMetric.history.reduce((a, b) => a + b.val, 0) / 3).toFixed(1) }
               ].map((stat, i) => (
                 <div key={i} className="p-4 rounded-2xl bg-bg-warm/50 border border-border/50 text-center">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2">{stat.label}</p>
                    <p className="text-xl font-mono font-bold text-text-primary tabular-nums">{stat.value}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
