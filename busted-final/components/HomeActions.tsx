import React from 'react';
import { motion } from 'framer-motion';

interface HomeActionsProps {
  onLogin: () => void;
  onGuest: () => void;
}

export const HomeActions: React.FC<HomeActionsProps> = ({ onLogin, onGuest }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-row gap-6 items-center"
    >
      <button
        onClick={onLogin}
        className="group relative px-8 py-3 rounded-lg font-bold text-lg tracking-wide transition-all duration-300 overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:-translate-y-0.5"
      >
        {/* Glossy Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-md border-t border-white/50 border-b border-white/10 border-x border-white/20 rounded-lg group-hover:from-white/40 group-hover:to-white/20 transition-all" />
        {/* Text */}
        <span className="relative z-10 text-white drop-shadow-md">LOGIN / SIGNUP</span>
      </button>

      <button
        onClick={onGuest}
        className="group relative px-8 py-3 rounded-lg font-bold text-lg tracking-wide transition-all duration-300 overflow-hidden shadow-[0_0_15px_rgba(255,0,0,0.1)] hover:shadow-[0_0_25px_rgba(255,0,0,0.3)] hover:-translate-y-0.5"
      >
        {/* Glossy Background (Red Tinted for Guest) */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/20 to-red-900/20 backdrop-blur-md border-t border-red-400/50 border-b border-red-900/10 border-x border-red-500/20 rounded-lg group-hover:from-red-500/30 group-hover:to-red-900/30 transition-all" />
        {/* Text */}
        <span className="relative z-10 text-red-100 drop-shadow-md">GUEST MODE</span>
      </button>
    </motion.div>
  );
};