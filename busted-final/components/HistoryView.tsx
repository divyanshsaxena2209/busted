import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Filter, Search } from 'lucide-react';
import { ActivityItem } from '../types';

interface HistoryViewProps {
  activity: ActivityItem[];
  onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ activity, onBack }) => {
  return (
    <div className="w-full px-6 md:px-12 pb-20">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 rounded-full hover:bg-white/10 transition-colors group"
            >
              <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Report History</h1>
              <p className="text-white/40 text-sm mt-1">Track status of your submitted violations and issues.</p>
            </div>
          </div>

          <div className="flex gap-3">
             <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="text" 
                  placeholder="Search Ticket ID..." 
                  className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:bg-white/10 w-64"
                />
             </div>
             <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
             </button>
          </div>
        </div>

        {/* List */}
        <div className="flex flex-col gap-4">
          {activity.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-5 mb-4 md:mb-0">
                  <div className="mt-1 p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors mb-1">{item.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-white/40 font-mono">
                      <span>{item.ticketId || `BST-REF-${1000 + Number(item.id)}`}</span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-6 pl-14 md:pl-0">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase ${
                      item.status === 'Verified' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      item.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      item.status === 'Resolved' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                      {item.status}
                  </div>
                  <ArrowLeft className="w-4 h-4 text-white/20 rotate-180 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </div>
  );
};