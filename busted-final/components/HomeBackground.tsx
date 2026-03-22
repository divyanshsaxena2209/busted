import React from 'react';
import { Aurora } from './Aurora';

export const HomeBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 bg-[#000428] overflow-hidden">
      {/* Aurora Layer */}
      <div className="absolute inset-0 opacity-100">
        <Aurora 
          colorStops={[
            '#000428', // Deep Blue Base
            '#3b82f6', // Electric Blue
            '#870000', // Deep Red
            '#6b21a8', // Slight Purple
            '#1d4ed8', // Darker Blue
          ]} 
          blend={0.35} // 35% opacity
          amplitude={1.2}
        />
      </div>
      
      {/* Subtle Gradient Overlay to ensure text readability and depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#000428]/40 to-[#000428]/90 pointer-events-none" />
      
      {/* Radial Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,4,40,0.6)_100%)] pointer-events-none" />
    </div>
  );
};