import React from 'react';

interface HomeActionsProps {
  onLogin: () => void;
  onGuest: () => void;
}

export const HomeActions: React.FC<HomeActionsProps> = ({ onLogin, onGuest }) => {
  return (
    <div className="flex flex-row gap-4 items-center">
      <button
        onClick={onLogin}
        className="px-2 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
      >
        Login
      </button>

      <button
        onClick={onGuest}
        className="px-4 py-1.5 text-sm font-semibold bg-white/[0.08] text-gray-200 border border-white/[0.1] rounded-sm hover:bg-white/[0.12] transition-colors"
      >
        Guest Mode
      </button>
    </div>
  );
};