import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div 
      className={`animate-pulse bg-slate-200/60 dark:bg-slate-700/50 rounded-md ${className}`}
    />
  );
};

export const SkeletonText: React.FC<SkeletonProps & { lines?: number }> = ({ 
  className = '', 
  lines = 3 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'} rounded-md`} 
        />
      ))}
    </div>
  );
};

export const SkeletonImage: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <Skeleton className={`w-full aspect-video rounded-xl ${className}`} />;
};

export const SkeletonCard: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col gap-4 p-5 bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl backdrop-blur-sm ${className}`}>
      {/* Card Image */}
      <SkeletonImage />
      
      {/* Card Header (Avatar + Title) */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      
      {/* Card Body Text */}
      <SkeletonText lines={2} className="mt-2" />
    </div>
  );
};
