import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onValidate: (isValid: boolean) => void;
}

export const Captcha: React.FC<CaptchaProps> = ({ onValidate }) => {
  const [captchaCode, setCaptchaCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [rotations, setRotations] = useState<number[]>([]);
  const [noiseLines, setNoiseLines] = useState<{x1: string, y1: string, x2: string, y2: string}[]>([]);

  const generateCaptcha = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    const newRotations: number[] = [];
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
      newRotations.push(Math.random() * 20 - 10);
    }
    
    const newNoiseLines = [];
    for (let i = 0; i < 5; i++) {
      newNoiseLines.push({
        x1: Math.random() * 100 + "%",
        y1: Math.random() * 100 + "%",
        x2: Math.random() * 100 + "%",
        y2: Math.random() * 100 + "%"
      });
    }

    setCaptchaCode(code);
    setRotations(newRotations);
    setNoiseLines(newNoiseLines);
    setUserInput('');
    onValidate(false);
  }, [onValidate]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);
    if (value === captchaCode) {
      onValidate(true);
    } else {
      onValidate(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Captcha Display */}
        <div 
          className="flex-1 bg-white/10 border border-white/20 rounded-lg h-12 flex items-center justify-center select-none relative overflow-hidden"
          style={{
            backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+")',
          }}
        >
          <span className="text-2xl font-mono font-bold tracking-widest text-white/90" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            {captchaCode.split('').map((char, i) => (
              <span key={i} style={{ display: 'inline-block', transform: `rotate(${rotations[i] || 0}deg)` }}>
                {char}
              </span>
            ))}
          </span>
          {/* Noise lines */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
             <svg width="100%" height="100%">
               {noiseLines.map((line, i) => (
                 <line 
                   key={i}
                   x1={line.x1} 
                   y1={line.y1} 
                   x2={line.x2} 
                   y2={line.y2} 
                   stroke="white" 
                   strokeWidth="1" 
                 />
               ))}
             </svg>
          </div>
        </div>

        <button 
          type="button"
          onClick={generateCaptcha}
          className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Refresh Captcha"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <input
        type="text"
        value={userInput}
        onChange={handleChange}
        placeholder="Enter the code above"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-center tracking-widest font-mono"
      />
    </div>
  );
};
