import React, { FC, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, Timer, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from '../firebase';

export const Auth: FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        setError(err.message || 'Failed to sign in after redirect.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkRedirect();
  }, []);

  const handleSignIn = async (method: 'popup' | 'redirect') => {
    setError(null);
    try {
      if (method === 'popup') {
        await signInWithPopup(auth, googleProvider);
      } else {
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (err: any) {
      console.error('Error signing in:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Try "Sign In with Redirect" or open in a new tab.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in Firebase. Please add it to the Authorized Domains list.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
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
        FastTrack
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
          className="w-full flex items-center justify-center space-x-3 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-white/90 transition-all active:scale-95 shadow-xl"
        >
          <LogIn size={20} />
          <span>Continue with Google</span>
        </motion.button>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => handleSignIn('redirect')}
          className="w-full flex items-center justify-center space-x-3 bg-white/5 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95"
        >
          <ArrowRight size={20} />
          <span>Sign In with Redirect</span>
        </motion.button>

        {isIframe && (
          <motion.a
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 text-primary text-xs font-bold py-2 hover:underline"
          >
            <ExternalLink size={14} />
            <span>Open in new tab (Recommended for Mobile)</span>
          </motion.a>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 space-y-4"
      >
        <p className="text-[10px] text-white/20 uppercase tracking-widest">
          Securely powered by Firebase
        </p>
        
        <div className="bg-white/5 p-4 rounded-2xl text-left max-w-xs mx-auto">
          <p className="text-[10px] text-white/40 font-bold uppercase mb-2 tracking-wider">Troubleshooting Mobile Login:</p>
          <ul className="text-[10px] text-white/30 space-y-1 list-disc pl-4">
            <li>Try <strong>Sign In with Redirect</strong> if the popup fails.</li>
            <li>Use the <strong>Open in new tab</strong> link above.</li>
            <li>Ensure you are not in "Incognito" or "Private" mode.</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};
