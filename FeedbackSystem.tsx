import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { cn } from '../lib/utils';
import { useTranslation } from '../contexts/LanguageContext';
import { toast } from 'sonner';

interface FeedbackSystemProps {
  analysisId?: string;
}

export default function FeedbackSystem({ analysisId }: FeedbackSystemProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [useful, setUseful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Please sign in to submit feedback.");
      return;
    }
    if (rating === 0) {
      toast.error("Please provide a star rating.");
      return;
    }
    if (useful === null) {
      toast.error("Please indicate if the analysis was useful.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        analysisId: analysisId || 'general',
        rating,
        useful,
        comment: comment.trim(),
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setIsSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-accent/10 border border-accent/20 rounded-3xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/20">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">Feedback Received!</h3>
        <p className="text-text-secondary text-sm">Your insights help us improve accuracy and service quality.</p>
      </motion.div>
    );
  }

  return (
    <div className="bg-surface border border-border/50 rounded-3xl p-8 shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-text-primary tracking-tight">How was this analysis?</h3>
        <p className="text-text-secondary text-sm">Rate the accuracy and usefulness of these results.</p>
      </div>

      {!currentUser ? (
        <div className="p-6 bg-amber/5 border border-amber/20 rounded-2xl text-center">
           <AlertCircle className="w-8 h-8 text-amber mx-auto mb-3" />
           <p className="text-sm font-medium text-amber-dim mb-4">You must be signed in to provide feedback.</p>
           <p className="text-xs text-text-muted">Sign in via the header to help us improve.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-3">
            <p className="text-xs font-black text-text-muted uppercase tracking-widest">Rate the accuracy</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star 
                    className={cn(
                      "w-8 h-8 transition-colors",
                      (hoveredRating || rating) >= star 
                        ? "fill-accent text-accent" 
                        : "text-border fill-transparent"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Usefulness */}
          <div className="space-y-3">
            <p className="text-xs font-black text-text-muted uppercase tracking-widest">Was this useful?</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setUseful(true)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all font-bold text-sm",
                  useful === true 
                    ? "bg-accent/10 border-accent text-accent" 
                    : "bg-bg-warm border-border hover:border-accent/30 text-text-secondary"
                )}
              >
                <ThumbsUp className="w-4 h-4" />
                Yes
              </button>
              <button
                type="button"
                onClick={() => setUseful(false)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all font-bold text-sm",
                  useful === false 
                    ? "bg-coral/10 border-coral text-coral" 
                    : "bg-bg-warm border-border hover:border-accent/30 text-text-secondary"
                )}
              >
                <ThumbsDown className="w-4 h-4" />
                No
              </button>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <p className="text-xs font-black text-text-muted uppercase tracking-widest">Additional Comments (Optional)</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what was good or what could be improved..."
              className="w-full h-24 p-4 rounded-2xl bg-bg-warm border border-border focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none transition-all text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-accent text-white font-black uppercase tracking-widest hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
