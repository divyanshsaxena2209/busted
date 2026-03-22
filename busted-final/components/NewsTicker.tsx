import React from 'react';
import { motion } from 'framer-motion';

const NEWS_ITEMS = [
  "Heavy traffic reported at Connaught Place due to VVIP movement.",
  "Accident on Ring Road near South Ext. Expect delays of 20 mins.",
  "Checkpoints established at Sector 18 Noida. Please carry valid ID.",
  "Fog alert: Visibility dropping below 50m on Yamuna Expressway.",
  "Road repairs ongoing at MG Road. Diversion in place."
];

export const NewsTicker: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden py-3">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-policeBlue to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-policeBlue to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center whitespace-nowrap">
        <motion.div 
          className="flex space-x-20 pl-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            repeat: Infinity, 
            ease: "linear", 
            duration: 35 
          }}
        >
          {/* Duplicating items to ensure smooth infinite scroll loop */}
          {[...NEWS_ITEMS, ...NEWS_ITEMS, ...NEWS_ITEMS].map((news, index) => (
            <div key={index} className="flex items-center space-x-4 text-white/90 text-lg font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>{news}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};