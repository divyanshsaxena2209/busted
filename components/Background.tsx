import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 bg-[#0a0a0c] overflow-hidden pointer-events-none">
      {/* Subtle radial lighting for depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-white/[0.02] rounded-full blur-[120px]"></div>
      
      {/* Global Ambient Waves (Red & Blue) - Made more visible */}
      {/* Blue Wave */}
      <div className="absolute top-[5%] left-[-10%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] bg-blue-600/[0.15] rounded-full blur-[140px] animate-pulse-slow mix-blend-screen"></div>
      
      {/* Red Wave */}
      <div className="absolute bottom-[10%] right-[-10%] w-[70vw] h-[70vw] max-w-[1000px] max-h-[1000px] bg-red-600/[0.12] rounded-full blur-[150px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
      
      {/* Purple Intersection Wave */}
      <div className="absolute top-[35%] left-[25%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] bg-purple-600/[0.08] rounded-full blur-[140px] animate-pulse-slow delay-2000 mix-blend-screen"></div>

      {/* Very faint grain noise overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      ></div>
    </div>
  );
};