import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="flex items-center select-none pt-2">
      <img src="/navbar.png" alt="Busted Logo" className="h-[3rem] md:h-[3.5rem] w-auto object-contain" />
    </div>
  );
};