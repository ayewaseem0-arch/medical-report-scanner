import React, { useState } from 'react';
import { usePremium } from '../contexts/PremiumContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ShieldCheck, CheckCircle2, Zap, Hourglass, Globe2, CreditCard, Landmark } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { toast } from 'sonner';

export default function PremiumPaywallModal() {
  const { 
    showPaywall, 
    setShowPaywall, 
    isPremium, 
    setIsPremium, 
    paywallTriggerMode,
    currency,
    setCurrency
  } = usePremium();

  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<string>('month');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'plan' | 'checkout' | 'success'>('plan');

  // Simulated billing inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');

  if (!showPaywall || isPremium) return null;

  // Custom visual message depending on what feature triggered it
  let triggerMessage = "unlock full diagnostics potential without restrictions or advertisements.";
  if (paywallTriggerMode === 'lab') {
    triggerMessage = "You have used your 2 free Lab & Diagnostics scans today. Upgrade to Premium for infinite instant medical reports analysis.";
  } else if (paywallTriggerMode === 'medicine') {
    triggerMessage = "You have used your 2 free Medicine scans today. Upgrade to Premium for continuous prescription and pill bottle OCR analytics.";
  } else if (paywallTriggerMode === 'symptoms') {
    triggerMessage = "You have completed your 3 free Care Navigator evaluations today. Upgrade to Premium for unlimited sympomatic triaging paths.";
  } else if (paywallTriggerMode === 'reminders') {
    triggerMessage = "Medicine Alarms schedule dashboard is exclusive to MedScan Premium. Stay synced with your treatment plans with zero restrictions.";
  } else if (paywallTriggerMode === 'history') {
    triggerMessage = "Health Vault logs and comparative timelines are reserved for Premium subscribers. Track biometric improvement curves over time.";
  }

  // Offer valid for the first three months (until Aug 27, 2026)
  const isOfferValid = new Date() < new Date('2026-08-27T00:00:00Z');

  // Plan Prices Map
  const plans = {
    INR: [
      { id: 'month', name: 'Monthly Saver', price: '₹300', period: 'month', desc: 'Most popular option for progressive treatments', tag: 'Best Value' },
      { 
        id: 'year', 
        name: 'Annual Vault', 
        price: isOfferValid ? '₹2,880' : '₹3,000', 
        period: 'year', 
        desc: 'Complete peace of mind for you and your family', 
        tag: isOfferValid ? 'Save 20%' : undefined 
      }
    ],
    USD: [
      { id: 'month', name: 'Monthly Core', price: '$23', period: 'month', desc: 'Advanced continuous analysis and triage tool' },
      { id: 'year', name: 'Annual Shield', price: '$240', period: 'year', desc: 'Secure lifetime monitoring and priority AI support', tag: 'Best Plan' }
    ]
  };

  const activePlans = plans[currency];

  const handleToggleCurrency = () => {
    const next = currency === 'INR' ? 'USD' : 'INR';
    setCurrency(next);
    // Reset selection based on active plans
    if (next === 'USD') {
      setSelectedPlan('month');
    } else {
      setSelectedPlan('month');
    }
  };

  const handleSubscribe = () => {
    setPaymentStep('checkout');
  };

  const handleCompletePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsPremium(true);
      setIsProcessing(false);
      setPaymentStep('success');
      toast.success("Successfully upgraded to MedScan Premium!");
      
      // Auto close after 3 seconds
      setTimeout(() => {
        setShowPaywall(false);
        // Reset states
        setPaymentStep('plan');
      }, 3500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99] flex items-center justify-center p-4 overflow-y-auto animate-fade-in custom-scrollbar">
      {/* Outer shadow containment box */}
      <div className="fixed inset-0" onClick={() => setShowPaywall(false)} />
      
      <motion.div 
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="bg-surface border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col md:flex-row max-h-[90vh] md:max-h-none"
      >
        {/* Close Button */}
        <button 
          onClick={() => setShowPaywall(false)}
          className="absolute right-4 top-4 z-20 p-1.5 rounded-lg bg-bg-warm/80 hover:bg-bg-warm border border-border/60 text-text-muted hover:text-text-primary transition-all cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Left Aspect: Brand/Upgrade Visual Intro Panel */}
        <div className="md:w-5/12 bg-gradient-to-b from-accent/95 to-accent-bright text-white p-6 flex flex-col justify-between relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-black tracking-widest uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
              Pro Tier Upgrades
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight font-display leading-tight">
              Unlock MedScan Premium
            </h3>
            <p className="text-xs text-white/80 font-medium leading-relaxed">
              Activate the ultimate precise diagnostics portal. Explore without limits, banners, or daily scan blocks.
            </p>
          </div>

          <div className="my-6 space-y-3">
            {[
              "Endless Lab & Diagnostics Scans",
              "Unlimited Prescriptions & Medicine OCR",
              "Infinite Symptom Triage Solutions",
              "Instant Treatment Alarms Enabled",
              "Secure Biometric Health Vault Portal",
              "100% Ad-Free UI Performance"
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-semibold text-white/90">
                <ShieldCheck className="w-4 h-4 text-emerald shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
            <span>Encrypted Checkout SSL</span>
            <span>Cancel Anytime</span>
          </div>
        </div>

        {/* Right Aspect: Interactive Payment Selector/Simulation */}
        <div className="md:w-7/12 p-6 flex flex-col justify-between bg-surface overflow-y-auto">
          {paymentStep === 'plan' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                  Choose Plan Tier
                </span>
                
                {/* Geolocation Currency Selector */}
                <button
                  onClick={handleToggleCurrency}
                  className="flex items-center gap-1 font-display font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg border border-accent/25 bg-accent/5 hover:bg-accent/10 text-accent transition-all cursor-pointer"
                  title="Toggle Global vs Indian Pricing"
                >
                  <Globe2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Region: {currency === 'INR' ? 'India (₹)' : 'Global ($)'}</span>
                </button>
              </div>

              {/* Notification Banner about limits */}
              <p className="text-xs text-coral bg-coral/5 border border-coral/10 p-2.5 rounded-lg leading-relaxed font-bold">
                {triggerMessage}
              </p>

              {/* Plans Radio Stack */}
              <div className="space-y-2.5">
                {activePlans.map((plan) => (
                  <label
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer relative group ${
                      selectedPlan === plan.id
                        ? 'border-accent bg-accent/[0.02] shadow-sm'
                        : 'border-border/60 hover:border-accent/30 bg-surface'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 shrink-0 ${
                        selectedPlan === plan.id ? 'border-accent text-accent' : 'border-border'
                      }`}>
                        {selectedPlan === plan.id && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-text-primary leading-tight">
                            {plan.name}
                          </span>
                          {plan.tag && (
                            <span className="text-[8px] font-black tracking-wider uppercase bg-accent text-white px-2 py-0.5 rounded-md leading-none">
                              {plan.tag}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-text-muted font-medium block leading-normal mt-0.5">
                          {plan.desc}
                        </span>
                      </div>
                    </div>
                    <div className="text-right pl-3 shrink-0">
                      <span className="font-mono font-black text-base text-accent block leading-none">
                        {plan.price}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold block mt-1 leading-none">
                        / {plan.period}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Call to action */}
              <button
                onClick={handleSubscribe}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent text-white hover:bg-accent-bright font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer mt-4"
              >
                <Zap className="w-4 h-4 text-yellow-300 animate-pulse" />
                <span>Continue to Checkout</span>
              </button>
            </div>
          )}

          {paymentStep === 'checkout' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                  Billing & Simulated Invoice
                </span>
                <button
                  onClick={() => setPaymentStep('plan')}
                  className="text-[10.5px] font-bold text-accent hover:underline uppercase tracking-wide cursor-pointer"
                >
                  Change Plan
                </button>
              </div>

              {/* Invoice Breakdown */}
              <div className="bg-bg-warm/40 border border-border/50 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-text-primary block leading-tight">
                    Premium Upgrade - {selectedPlan === 'month' ? 'Monthly Saver' : 'Annual Secure'}
                  </span>
                  <span className="text-[9px] font-semibold text-text-muted block mt-0.5 leading-none">
                    Unlocks full options, infinite scans, and hides AdSense banners
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-lg text-text-primary leading-none">
                    {activePlans.find(p => p.id === selectedPlan)?.price || activePlans[0].price}
                  </span>
                </div>
              </div>

              {/* Payment Methods Tabs */}
              <div className="flex gap-2 p-1 bg-bg-warm/60 border border-border/40 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    paymentMethod === 'card' ? 'bg-surface text-accent shadow-xs border border-border/50' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Credit / Debit Card
                </button>
                {currency === 'INR' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      paymentMethod === 'upi' ? 'bg-surface text-accent shadow-xs border border-border/50' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    UPI / Instant Pay
                  </button>
                )}
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleCompletePayment} className="space-y-3.5">
                {paymentMethod === 'card' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-text-muted px-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted px-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-accent text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted px-1">
                          CVV
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-accent text-center"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-text-muted px-1">
                      Virtual Payment Address (VPA / UPI ID)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="username@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent text-white hover:bg-accent-bright font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer mt-4 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Hourglass className="w-4 h-4 animate-spin" />
                      <span>Validating Payment Securely...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald" />
                      <span>Pay & Unlock Premium Status</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="py-8 px-4 flex flex-col items-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald/10 border-2 border-emerald flex items-center justify-center text-emerald animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-text-primary font-display">
                Premium Activated!
              </h3>
              <p className="text-xs text-text-muted max-w-sm leading-relaxed">
                Thank you for subscribing! Your diagnostic limits have been completely lifted, Medicine Alarms and Health Vault portals are fully unlocked, and AdSense banners are hidden. Enjoy high-fidelity clinical analytics.
              </p>
            </div>
          )}

          {/* Guarantee stamp */}
          <p className="text-[9px] text-text-muted text-center pt-4 font-bold border-t border-border/40 mt-4 leading-none select-none">
            🔒 SSL Secured - 256-bit AES Encryption. Dynamic sandbox checkout.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
