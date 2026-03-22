import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, AlertTriangle, Cone } from 'lucide-react';
import { ActivityItem } from '../types';

interface ReportHistoryProps {
  activity: ActivityItem[];
  onBack: () => void;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({ activity, onBack }) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const filteredActivity = activity.filter(item => {
    if (filterStatus === 'All') return true;
    return item.status === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'Verified': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'Resolved': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'Rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="w-full px-6 md:px-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
           <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 rounded-full hover:bg-white/10 transition-colors group"
            >
              <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Report History</h1>
              <p className="text-white/40 text-sm mt-1">Track and manage your submitted violations.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 hover:bg-white/10 text-white pl-4 pr-10 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
              >
                <option value="All" className="bg-[#000428]">All Reports</option>
                <option value="Pending" className="bg-[#000428]">Pending</option>
                <option value="Verified" className="bg-[#000428]">Verified</option>
                <option value="Resolved" className="bg-[#000428]">Resolved</option>
                <option value="Rejected" className="bg-[#000428]">Rejected</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* List Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-bold text-blue-200 uppercase tracking-widest border-b border-white/10 mb-2 opacity-70">
          <div className="col-span-2">Report ID</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-5">Violation / Issue Details</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Timestamp</div>
        </div>

        {/* List Content */}
        <div className="flex flex-col gap-2">
          {filteredActivity.length > 0 ? (
            filteredActivity.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group md:grid md:grid-cols-12 gap-4 items-center px-6 py-5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/5"
              >
                {/* ID */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.type === 'Traffic' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {item.type === 'Traffic' ? <AlertTriangle className="w-4 h-4" /> : <Cone className="w-4 h-4" />}
                  </div>
                  <span className="font-mono text-sm text-white/70 group-hover:text-white transition-colors">
                    {item.ticketId || `#${item.id}`}
                  </span>
                </div>

                {/* Type Badge */}
                <div className="col-span-1 hidden md:block">
                   <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                     item.type === 'Traffic' 
                       ? 'bg-red-500/5 border-red-500/10 text-red-300' 
                       : 'bg-blue-500/5 border-blue-500/10 text-blue-300'
                   }`}>
                     {item.type || 'General'}
                   </span>
                </div>

                {/* Details */}
                <div className="col-span-5 mb-2 md:mb-0">
                  <h4 className="text-white font-medium group-hover:text-blue-200 transition-colors truncate">
                    {item.title}
                  </h4>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {item.status}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="col-span-2 text-right text-sm text-white/40 font-mono group-hover:text-white/60">
                  {item.time}
                </div>
              </motion.div>
            ))
          ) : (
             <div className="text-center py-20 text-white/30">
                No reports found matching your filter.
             </div>
          )}
        </div>

      </motion.div>
    </div>
  );
};