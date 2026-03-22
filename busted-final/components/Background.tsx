import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0">
      {/* The main gradient background representing police lights */}
      <div className="absolute inset-0 bg-gradient-to-br from-policeBlue via-[#2a002a] to-policeRed" />
      
      {/* Overlay gradient to add depth and gloss */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/5 mix-blend-overlay" />
      
      {/* Optional subtle animated pulse for the 'lights' effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-red-900/20 animate-pulse-slow opacity-50" />
    </div>
  );
};