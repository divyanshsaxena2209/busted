import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="flex items-center select-none pt-2">
      <div className="relative inline-block cursor-pointer">
        <img src="/navbar.png" alt="Busted Logo" className="h-[7.5rem] md:h-[9.5rem] w-auto object-contain block" />

        {/* Siren Glow Dot Overlay */}
        {/* Note: You can tweak the top-[XX%] and left-[XX%] values below to align it perfectly over the dot in your image */}
        <div className="absolute top-[44.6%] left-[15.45%] w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-siren-glow pointer-events-none -translate-x-1/2 -translate-y-1/2 mix-blend-screen z-10"></div>
      </div>
    </div>
  );
};