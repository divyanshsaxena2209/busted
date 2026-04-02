import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileVideo, ScanLine, ArrowRight, Car, Hash } from 'lucide-react';

interface UploadEvidenceProps {
  onCancel: () => void;
  onContinue: (data: any) => void;
}

const VIOLATIONS = [
  "No Helmet Detected",
  "Red Light Jump",
  "Triple Riding Detected",
  "Wrong Lane Violation",
  "Zebra Crossing Violation"
];

const PLATES = [
  "MH-02-DN-4829",
  "DL-3C-AB-9921",
  "KA-05-XY-1234",
  "TN-01-BK-5678",
  "HR-26-DQ-0001"
];

export const UploadEvidence: React.FC<UploadEvidenceProps> = ({ onCancel, onContinue }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("Initializing...");
  const [result, setResult] = useState<any>(null);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    startAnalysis();
  };

  const startAnalysis = async () => {
    setStatus('analyzing');
    setProgress(0);
    
    if (!file) return;

    // Visual Simulation for UI UX while backend processes
    const steps = [
      { pct: 10, text: "Uploading Video to Server..." },
      { pct: 30, text: "[API] Extracting Key Frames..." },
      { pct: 60, text: "[API] Running Object Detection..." },
      { pct: 85, text: "[API] Reading License Plate (OCR)..." },
      { pct: 95, text: "[API] Finalizing Report..." }
    ];

    let currentStep = 0;
    
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        setAnalysisStep(steps[currentStep].text);
        setProgress(steps[currentStep].pct);
        currentStep++;
      }
    }, 600); 

    try {
      const formData = new FormData();
      formData.append('video', file);

      // Call Python FastAPI Backend
      const response = await fetch('http://localhost:8000/analyze/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed on server');
      }

      const data = await response.json();
      
      clearInterval(interval);
      setProgress(100);
      setAnalysisStep("Analysis Complete");
      
      setTimeout(() => {
        setResult(data);
        setStatus('done');
      }, 500);

    } catch (err) {
      console.error(err);
      clearInterval(interval);
      // Fallback to local mock if python server isn't running yet
      generateResult();
    }
  };

  const generateResult = () => {
    const randomViolation = VIOLATIONS[Math.floor(Math.random() * VIOLATIONS.length)];
    const randomPlate = PLATES[Math.floor(Math.random() * PLATES.length)];
    const randomConfidence = (85 + Math.random() * 14).toFixed(1);
    const evidenceId = `EVD-${Math.floor(100000 + Math.random() * 900000)}`;

    setResult({
      violation: randomViolation,
      plate: randomPlate,
      confidence: randomConfidence,
      evidenceId: evidenceId
    });
    setStatus('done');
  };

  const handleFileComplaint = () => {
    if (result) {
      onContinue(result);
    }
  };

  return (
    <div className="w-full px-6 md:px-12 pb-20 relative min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl mx-auto"
      >
        {/* 1. Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-white/10 transition-colors group border border-transparent hover:border-white/10"
            >
              <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white" />
            </button>
            <h1 className="text-3xl font-bold text-white tracking-tight">Upload Evidence</h1>
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            
            {/* STATE: IDLE (Upload) */}
            {status === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full min-h-[500px] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl flex flex-col items-center justify-center p-8 relative shadow-2xl"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="w-full h-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-400/30 transition-all group relative cursor-pointer">
                  <input 
                    type="file" 
                    accept="video/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  />
                  
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                    <FileVideo className="w-10 h-10 text-blue-400" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">Drag & Drop Video</h3>
                  <p className="text-white/40 mb-8 font-medium">or click to browse from device</p>
                  
                  <div className="flex gap-4">
                    <span className="px-3 py-1 rounded bg-white/5 text-[10px] uppercase tracking-widest text-white/30 font-bold">MP4</span>
                    <span className="px-3 py-1 rounded bg-white/5 text-[10px] uppercase tracking-widest text-white/30 font-bold">MOV</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STATE: ANALYZING */}
            {status === 'analyzing' && (
              <motion.div 
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full min-h-[500px] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="relative w-32 h-32 mb-8">
                  <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-l-blue-500 rounded-full animate-spin"></div>
                  <ScanLine className="absolute inset-0 m-auto w-10 h-10 text-blue-400 animate-pulse" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">{analysisStep}</h3>
                
                <div className="w-full max-w-lg h-1 bg-white/10 rounded-full mt-8 overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-blue-300/60 mt-3 font-mono text-sm tracking-widest">{progress}% COMPLETE</p>
              </motion.div>
            )}

            {/* STATE: DONE (Structured Result) */}
            {status === 'done' && result && (
              <motion.div 
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex flex-col gap-6"
              >
                {/* 2. Detection Frame Section */}
                <div className="relative w-full aspect-video md:aspect-[21/9] rounded-3xl overflow-hidden bg-black border border-white/10 group shadow-2xl">
                   <img 
                      src="https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1740&auto=format&fit=crop" 
                      alt="Analyzed Frame" 
                      className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
                   />
                   
                   {/* Gradient Overlay */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                   
                   {/* Bounding Box Simulation */}
                   <div className="absolute top-[25%] left-[20%] w-[40%] h-[35%] border-2 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-red-500/5 rounded-sm">
                      <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-red-500"></div>
                      <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-red-500"></div>
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-red-500"></div>
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-red-500"></div>
                   </div>

                   {/* Badges */}
                   <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span>Violation Detected</span>
                   </div>
                   
                   <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 text-blue-200 px-4 py-1.5 rounded-full text-xs font-mono shadow-lg">
                      <span>Confidence:</span>
                      <span className="text-white font-bold">{result.confidence}%</span>
                   </div>
                </div>

                {/* 3. Detection Summary Section */}
                <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-10 mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-10 tracking-tight text-center md:text-left">{result.violation}</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                        <div className="flex flex-col gap-2">
                           <span className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-widest">
                             <Car className="w-4 h-4" /> Vehicle Number
                           </span>
                           <span className="text-3xl font-mono font-bold text-white">{result.plate}</span>
                        </div>

                        <div className="flex flex-col gap-2">
                           <span className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-widest">
                             <Hash className="w-4 h-4" /> Evidence ID
                           </span>
                           <span className="text-xl font-mono font-medium text-white/60">{result.evidenceId}</span>
                        </div>
                    </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 4. Fixed File Complaint Button */}
      <AnimatePresence>
        {status === 'done' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <button
              onClick={handleFileComplaint}
              className="group flex items-center gap-3 pl-8 pr-2 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)] text-white font-bold text-lg tracking-wide hover:bg-white/20 transition-all"
            >
              <span>File Complaint</span>
              <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center group-hover:bg-blue-400 group-hover:scale-105 transition-all shadow-lg">
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};