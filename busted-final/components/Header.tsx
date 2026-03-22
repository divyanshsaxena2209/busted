import React from 'react';
import { motion, Variants } from 'framer-motion';

export const Header: React.FC = () => {
  const text = "BUSTED";
  
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const child: Variants = {
    hidden: { 
      opacity: 0, 
      y: 100,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <div className="relative z-10 w-full text-center select-none py-10 overflow-visible">
      <div className="w-full flex justify-center items-center overflow-visible">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex relative items-center justify-center pt-4 pb-4"
        >
          {text.split("").map((char, index) => (
            <motion.span 
              key={index} 
              variants={child}
              // Fix for clipping: 
              // 1. Used leading-normal (approx 1.5) to increase line box height significantly.
              // 2. Added py-6 and px-2 to give ample buffer space around the glyph.
              // 3. inline-block ensures padding affects layout and background painting.
              className="inline-block text-[15vw] md:text-[12rem] leading-normal font-black tracking-tighter drop-shadow-2xl animate-shimmer bg-gradient-to-b from-white via-blue-200 to-blue-950 bg-[length:200%_auto] bg-clip-text text-transparent filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] py-6 px-2"
            >
              {char}
            </motion.span>
          ))}
        </motion.div>
      </div>
      {/* Integrated Description with Powered by AI */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="mt-6 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-blue-100 font-medium tracking-widest uppercase drop-shadow-md"
      >
        <span className="text-lg md:text-xl">Civic & Traffic Violation Reporting</span>
        <span className="hidden md:block text-blue-500">•</span>
        <span className="text-sm md:text-lg text-cyan-300 font-bold tracking-[0.2em] drop-shadow-[0_0_8px_rgba(34,211,238,0.4)] animate-pulse-slow">
          Powered by AI
        </span>
      </motion.div>
    </div>
  );
};