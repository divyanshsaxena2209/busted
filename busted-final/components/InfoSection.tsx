import React from 'react';

const WORKFLOW_STEPS = [
  { title: "User Uploads", desc: "Citizen captures and uploads violation video." },
  { title: "AI Analysis", desc: "System detects crime type and extracts evidence." },
  { title: "Verification", desc: "User confirms the extracted details." },
  { title: "Report Gen", desc: "Legal compliant complaint PDF is created." },
  { title: "Submitted", desc: "Sent to Traffic Police with OTP auth." }
];

export const InfoSection: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Content Container */}
      <div className="w-full text-white font-sans space-y-32">
        
        {/* Intro Section - Centered */}
        <div className="text-center w-full mx-auto">
          
          <h2 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-10 tracking-tighter drop-shadow-2xl">
            WHAT IS BUSTED?
          </h2>
          <p className="text-xl md:text-3xl leading-relaxed text-blue-100/90 font-light w-full mx-auto">
            Busted is an AI-powered civic and traffic violation reporting platform. We empower citizens to upload video evidence of traffic violations, which our system analyzes to automatically detect crimes, identify vehicles, and generate legally formatted complaints for state authorities.
          </p>
        </div>

        {/* Workflow Section - Moved Before Features & Removed Box */}
        <div className="w-full py-12">
          <h3 className="text-4xl font-bold text-white mb-16 text-center drop-shadow-md">How It Works</h3>
          
          <div className="relative mt-4">
              {/* The Connecting Line (Horizontal on Desktop, Vertical on Mobile) */}
              <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
              <div className="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/10 via-blue-400/30 to-white/10" />

              <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
                  {WORKFLOW_STEPS.map((step, idx) => (
                      <div key={idx} className="relative flex md:flex-col items-center md:text-center group cursor-default">
                          
                          {/* The Node/Dot */}
                          <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-[#000428] border-2 border-white/20 flex items-center justify-center mr-6 md:mr-0 md:mb-6 group-hover:border-blue-400 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300 shadow-lg">
                              <div className="w-3 h-3 bg-white/50 rounded-full group-hover:bg-blue-400 transition-colors" />
                          </div>

                          {/* Text Content */}
                          <div>
                              <h4 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">{step.title}</h4>
                              <p className="text-sm text-gray-400 font-medium leading-relaxed group-hover:text-gray-200 transition-colors">{step.desc}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
        </div>

        {/* Core Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-10 shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
            <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-blue-200 transition-colors">AI Video Analysis</h3>
            <p className="text-xl text-gray-300 leading-relaxed font-light">
              Upload traffic footage. Our AI extracts the clearest proof frame, reads the number plate (OCR), and identifies the specific violation (e.g., no helmet, red light jump).
            </p>
          </div>

          <div className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-10 shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
            <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-blue-200 transition-colors">Instant Reports</h3>
            <p className="text-xl text-gray-300 leading-relaxed font-light">
              The system generates a structured complaint with location, timestamp, violation summary, and evidence frames automatically filled in.
            </p>
          </div>
          
           <div className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-10 shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
            <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-blue-200 transition-colors">Civic Reporting</h3>
            <p className="text-xl text-gray-300 leading-relaxed font-light">
              Beyond traffic, report potholes, accidents, and construction hazards to improve city infrastructure and safety.
            </p>
          </div>

          <div className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-10 shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
            <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-blue-200 transition-colors">Direct Submission</h3>
            <p className="text-xl text-gray-300 leading-relaxed font-light">
              Seamlessly submit generated complaints to the respective state traffic police portal with OTP verification.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};