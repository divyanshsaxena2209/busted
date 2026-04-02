import React from 'react';

export const InfoSection: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center font-sans">
      
      {/* Hero Section */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-8 items-center min-h-[60vh] mb-32">
        {/* Left Side: Copy */}
        <div className="flex flex-col space-y-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Turn Evidence <br/>
            <span className="text-gray-400">into Action</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 font-medium max-w-lg leading-relaxed">
            AI-powered civic reporting for real-world accountability.
          </p>
        </div>

        {/* Right Side: Minimalist Visual / Detection Frame */}
        <div className="relative w-full aspect-video md:aspect-[4/3] rounded-sm border border-white/5 bg-white/[0.01] flex items-center justify-center overflow-hidden">
          {/* Subtle grid background inside the frame */}
          <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px]"></div>
          
          {/* Bounding box mock */}
          <div className="relative w-[50%] h-[40%] border border-[#870000]/30 bg-[#870000]/5 group">
            {/* Corners */}
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-[#870000]"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-[#870000]"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-[#870000]"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[#870000]"></div>
            
            <div className="absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-mono text-[#870000] uppercase tracking-widest border border-[#870000]/30">
              Target Acquired
            </div>
            <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
               <div className="w-[80%] h-[1px] bg-[#870000]/40"></div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="w-full mb-32">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-12 flex items-center gap-4">
          <span className="w-8 h-[1px] bg-white/20"></span>
          How It Works
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
           <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-[1px] bg-white/5"></div>
           
           {[
             { step: "01", title: "Upload evidence", desc: "Submit raw video or images directly from your dashcam or phone." },
             { step: "02", title: "AI verifies", desc: "Our models extract plates, classify violations, and pinpoint locations." },
             { step: "03", title: "Report to authorities", desc: "A legally-formatted complaint is instantly generated for submission." }
           ].map((item, idx) => (
             <div key={idx} className="relative flex flex-col items-center text-center">
                 <div className="w-14 h-14 rounded-full bg-[#0a0a0c] border border-white/10 flex items-center justify-center text-sm font-bold text-gray-400 mb-6 z-10 shadow-sm relative transition-all hover:bg-white/[0.02]">
                    {item.step}
                 </div>
                 <h4 className="text-lg md:text-xl font-bold text-white mb-3">{item.title}</h4>
                 <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed max-w-[240px]">{item.desc}</p>
             </div>
           ))}
        </div>
      </div>

      {/* Why Busted Section */}
      <div className="w-full mb-20">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-12 flex items-center gap-4">
          <span className="w-8 h-[1px] bg-white/20"></span>
          Why Busted
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-white/[0.015] border border-white/[0.03] rounded-sm hover:bg-white/[0.02] transition-colors">
            <h4 className="text-lg font-bold text-white mb-3">Faster reporting</h4>
            <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed">Skip the paperwork. Turn raw footage into official reports in seconds.</p>
          </div>

          <div className="p-8 bg-white/[0.015] border border-white/[0.03] rounded-sm hover:bg-white/[0.02] transition-colors">
            <h4 className="text-lg font-bold text-white mb-3">Proof-backed complaints</h4>
            <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed">AI acts as an impartial observer, surfacing uneditable metadata and clear frames.</p>
          </div>
          
          <div className="p-8 bg-white/[0.015] border border-white/[0.03] rounded-sm hover:bg-white/[0.02] transition-colors">
            <h4 className="text-lg font-bold text-white mb-3">Real accountability</h4>
            <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed">Closing the loop between citizen observation and institutional enforcement.</p>
          </div>
        </div>
      </div>

    </div>
  );
};