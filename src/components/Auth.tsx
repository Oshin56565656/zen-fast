import React, { FC } from 'react';
import { motion } from 'motion/react';
import { LogIn, Timer } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';

export const Auth: FC = () => {
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

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
        className="text-white/40 max-w-[280px] mb-12"
      >
        Your personal intermittent fasting companion. Securely track your progress.
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={handleSignIn}
        className="flex items-center space-x-3 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-white/90 transition-all active:scale-95 shadow-xl"
      >
        <LogIn size={20} />
        <span>Continue with Google</span>
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-[10px] text-white/20 uppercase tracking-widest"
      >
        Securely powered by Firebase
      </motion.p>
    </div>
  );
};
