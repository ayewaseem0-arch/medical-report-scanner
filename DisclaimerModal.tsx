import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { languages } from '../i18n';
import { cn } from '../lib/utils';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export default function DisclaimerModal({ isOpen, onAccept }: DisclaimerModalProps) {
  const { t, language } = useTranslation();
  const isRTL = languages.find((l) => l.code === language)?.dir === 'rtl';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="relative w-full max-w-lg bg-surface rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 p-8 md:p-10"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-coral/10 flex items-center justify-center mb-8 ring-8 ring-coral/5">
                <ShieldAlert className="w-10 h-10 text-coral" />
              </div>
              
              <h2 className="text-3xl font-bold text-text-primary mb-6 tracking-tight">
                {t('disclaimer_title')}
              </h2>
              
              <div className="bg-bg-warm/50 rounded-3xl p-6 mb-10 border border-border/50">
                <p className={cn(
                  "text-text-secondary leading-relaxed",
                  language === 'ar' || language === 'ur' ? "text-lg" : "text-sm"
                )}>
                  {t('disclaimer_text')}
                </p>
              </div>
              
              <button
                onClick={onAccept}
                className="group relative w-full py-5 rounded-2xl bg-text-primary text-white dark:bg-accent dark:text-white font-bold transition-all hover:bg-black dark:hover:bg-accent-dim active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-white/10 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>{t('disclaimer_button')}</span>
              </button>
              
              <p className="mt-6 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">
                MedScan AI • Precision Diagnostics
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
