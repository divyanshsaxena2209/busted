import React from 'react';
import { motion } from 'framer-motion';

interface AuroraProps {
  colorStops: string[];
  amplitude?: number;
  blend?: number;
}

export const Aurora: React.FC<AuroraProps> = ({ 
  colorStops, 
  amplitude = 1, 
  blend = 0.5 
}) => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {colorStops.map((color, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full mix-blend-screen filter blur-[100px] opacity-50"
          style={{
            backgroundColor: color,
            width: '60vw',
            height: '60vw',
            // Distribute blobs across the screen width
            left: `${(index / colorStops.length) * 100 - 20}%`,
            top: `${(index % 2 === 0 ? -10 : 20)}%`,
            opacity: blend,
          }}
          animate={{
            x: [0, 60 * amplitude, -40 * amplitude, 0],
            y: [0, -40 * amplitude, 40 * amplitude, 0],
            scale: [1, 1.1 + (amplitude * 0.1), 0.95, 1],
            rotate: [0, 30 * amplitude, -30 * amplitude, 0],
          }}
          transition={{
            duration: 20 + index * 6, // Slower duration: 20-40s range
            repeat: Infinity,
            repeatType: 'reverse',
            ease: "easeInOut",
          }}
        />
      ))}
      {/* Overlay to smooth edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent opacity-50" />
    </div>
  );
};