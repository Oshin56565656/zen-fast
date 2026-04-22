import React, { FC, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, Timer, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from '../firebase';

export const Auth: FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    
    // Handle redirect result on mount
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // User is signed in
        }
      } catch (err: any) {
        console.error('Redirect error:', err);
        if (err.code === 'auth/user-cancelled' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          // Silent ignore user cancellation
          return;
        }
        setError(err.message || 'Failed to sign in after redirect.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkRedirect();
  }, []);

  const handleSignIn = async (method: 'popup' | 'redirect') => {
    if (signingIn) return;
    setError(null);
    setSigningIn(true);
    try {
      if (method === 'popup') {
        await signInWithPopup(auth, googleProvider);
      } else {
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (err: any) {
      console.error('Error signing in:', err);
      if (err.code === 'auth/user-cancelled' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // Silent ignore user cancellation
        setSigningIn(false);
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Try "Sign In with Redirect" or open in a new tab.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in Firebase. Please add it to the Authorized Domains list.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else if (err.code === 'auth/internal-error') {
        setError('An internal Firebase error occurred. Please try again later.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
      setSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-primary/20"
      >
        <Timer size={40} className="text-white" />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-4xl font-bold tracking-tight mb-4"
      >
        AllRound <span className="text-primary">AI</span>
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-white/40 max-w-[280px] mb-8"
      >
        Your personal intermittent fasting companion. Securely track your progress.
      </motion.p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-8 flex items-start space-x-3 text-left max-w-xs"
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="text-xs font-medium leading-relaxed">{error}</p>
        </motion.div>
      )}

      <div className="space-y-4 w-full max-w-xs">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => handleSignIn('popup')}
          disabled={signingIn}
          className="w-full flex items-center justify-center space-x-3 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-white/90 transition-all active:scale-95 shadow-xl disabled:opacity-50"
        >
          {signingIn ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn size={20} />
          )}
          <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
        </motion.button>

        {isIframe && (
          <motion.a
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 text-white/20 text-[10px] font-bold py-2 hover:text-primary transition-colors uppercase tracking-widest"
          >
            <ExternalLink size={12} />
            <span>Open in new tab</span>
          </motion.a>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12"
      >
        <p className="text-[10px] text-white/10 uppercase tracking-[0.2em] font-medium">
          Securely powered by Firebase
        </p>
      </motion.div>
    </div>
  );
};
