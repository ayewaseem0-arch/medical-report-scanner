import React, { useEffect, useState } from 'react';
import { usePremium } from '../contexts/PremiumContext';
import { Sparkles, Megaphone, ShieldClose, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface AdSenseBannerProps {
  slot?: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
}

const HEALTH_ADS = [
  {
    title: "Instant Specialists On-Demand (Telehealth)",
    desc: "Connect with certified general physicians, path-experts, and neurologists in 5 minutes. First session is completely complimentary.",
    action: "Consult Online",
    sponsor: "HealthLink network"
  },
  {
    title: "Precise Biometric Smart Scales",
    desc: "Seamlessly synchronize skeletal mass, fluid, and metabolic curves into your personal MedScan dashboard without typing.",
    action: "Order with 25% Off",
    sponsor: "ScaleBio Systems"
  },
  {
    title: "Secure Premium Health Insurance Plans",
    desc: "Comprehensive coverage of diagnostics, pharmaceutical refills, and emergency ambulance operations starting from ₹25/day.",
    action: "Check Eligibility",
    sponsor: "CareShield Insurance"
  }
];

export default function AdSenseBanner({ slot = 'general-med', format = 'horizontal', className }: AdSenseBannerProps) {
  const { isPremium, setShowPaywall, setPaywallTriggerMode } = usePremium();
  const [adIndex, setAdIndex] = useState(0);

  // Rotate custom relative healthcare fallback ads every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % HEALTH_ADS.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Hydrate Adsense standard tags
  useEffect(() => {
    if (!isPremium) {
      try {
        // Trigger pagead script hydration if script exists
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      } catch (e) {
        // AdBlocker or script not loaded, fallback will be styled perfectly
      }
    }
  }, [isPremium]);

  if (isPremium) return null;

  const currentAd = HEALTH_ADS[adIndex];

  return (
    <div className={cn("w-full bg-bg-warm/30 border border-border/40 hover:border-accent/15 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden transition-all duration-300 shadow-xs", className)}>
      {/* Background graphic */}
      <div className="absolute top-[-10px] right-[-14px] w-24 h-24 bg-accent/5 rounded-full pointer-events-none" />

      {/* Actual AdSense Tag Placeholder */}
      <ins className="adsbygoogle text-xs hidden absolute pointer-events-none"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-2873634022086434"
           data-ad-slot={slot}
           data-ad-format={format}
           data-full-width-responsive="true"></ins>

      <div className="flex items-start gap-3 w-full">
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
          <Megaphone className="w-4 h-4 animate-pulse" />
        </div>
        <div className="space-y-1 w-full">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-accent border border-accent/25 px-1.5 py-0.5 rounded-md leading-none bg-accent/5">
              Sponsored
            </span>
            <span className="text-[9px] font-bold text-text-muted">
              AdSense pub-2873634022086434 • {currentAd.sponsor}
            </span>
          </div>
          <h4 className="text-xs font-extrabold text-text-primary leading-tight">
            {currentAd.title}
          </h4>
          <p className="text-[11px] text-text-secondary leading-normal max-w-xl">
            {currentAd.desc}
          </p>
        </div>
      </div>

      <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
        <button
          onClick={() => {
            setPaywallTriggerMode(null);
            setShowPaywall(true);
          }}
          className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg text-text-muted hover:text-accent bg-transparent hover:bg-accent/5 border border-border/80 hover:border-accent/25 transition-all cursor-pointer truncate"
        >
          Remove Ads
        </button>
        <button
          onClick={() => {
            toast.info(`Navigating to verified clinical partner: ${currentAd.sponsor}`);
          }}
          className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-white bg-accent hover:bg-accent-bright transition-all cursor-pointer shadow-xs whitespace-nowrap text-center"
        >
          {currentAd.action}
        </button>
      </div>
    </div>
  );
}
