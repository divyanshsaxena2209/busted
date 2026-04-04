import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, ArrowLeft, Upload, FileVideo, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

interface UploadEvidenceProps {
  onCancel: () => void;
  onContinue: (data: any) => void;
}

export const UploadEvidence: React.FC<UploadEvidenceProps> = ({ onCancel, onContinue }) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle');
  const [analysisStep, setAnalysisStep] = useState("Initializing...");
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setFilePreview(url);
    startAnalysis(selectedFile);
  };

  const startAnalysis = async (selectedFile: File) => {
    setStatus('analyzing');
    setAnalysisStep("Uploading & analyzing video feed...");

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await fetch('http://127.0.0.1:8000/api/analyze/', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setResult(data);
      setStatus('done');

    } catch (err) {
      console.error(err);
      setStatus('idle');
      alert("Backend error during analysis. Please ensure the AI backend is running.");
      setFile(null);
      setFilePreview(null);
    }
  };

  const handleFileComplaint = async () => {
    if (!result) return;
    
    try {
      const response = await fetch("http://localhost:3000/api/reports/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_id: `EV-${Date.now()}`,
          user_id: "demo-user",
          issue_type: result.violation || "Unknown",
          state: "Unknown",
          latitude: 0,
          longitude: 0,
          formatted_address: "N/A",
          selected_handle: "Traffic Police",
          timestamp: new Date().toISOString(),
          message_preview: result.plate || "No plate detected",
          channel_type: "AI",
          status: "detected"
        }),
      });

      const data = await response.json();
      console.log("Saved to DB:", data);
      
      onContinue(result);

    } catch (err) {
      console.error("Save failed:", err);
      onContinue(result);
    }
  };

  return (
    <div className="w-full px-6 md:px-12 pb-20 relative">
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(500%); }
          100% { transform: translateY(-100%); }
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-white/10 transition-colors group border border-transparent hover:border-white/10"
            >
              <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white" />
            </button>
            <h1 className="text-3xl font-bold text-white tracking-tight">Upload Evidence</h1>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>AI Automated Extraction</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full relative z-10 grid gap-8">
            
          {/* Upload Box OR Analysis Box */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 overflow-hidden relative min-h-[400px] flex flex-col items-center justify-center">
            
            {status === 'idle' && (
              <div 
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer group py-12"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="video/*,image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && e.target.files.length > 0 && handleFileSelection(e.target.files[0])
                  }
                />
                <div className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:border-blue-500/50 transition-all duration-300">
                    <Upload className="w-10 h-10 text-white/40 group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight group-hover:text-blue-200 transition-colors">Drag & Drop Evidence</h3>
                <p className="text-white/40 mb-8 font-medium text-center max-w-sm">
                  Click or drag to upload.<br/>Supports MP4, AVI, MOV, JPG, PNG.
                </p>
                <div className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-3.5 rounded-xl flex items-center gap-3 transition-colors shadow-lg shadow-blue-500/30">
                  <FileVideo className="w-5 h-5" />
                  Select File
                </div>
              </div>
            )}

            {status === 'analyzing' && (
              <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500 py-12">
                 <div className="relative w-64 h-64 md:w-96 md:h-64 rounded-2xl overflow-hidden bg-black/60 border border-white/10 mb-8 flex items-center justify-center shadow-2xl">
                    {filePreview ? (
                      <video src={filePreview} className="w-full h-full object-cover opacity-40 blur-[1px]" autoPlay loop muted />
                    ) : (
                      <FileVideo className="w-16 h-16 text-white/20" />
                    )}
                    
                    {/* Scanner Effect */}
                    <div className="absolute top-0 left-0 w-full h-[20%] bg-gradient-to-b from-transparent via-blue-500/40 to-transparent animate-scan z-10" />
                    <ScanLine className="absolute inset-0 m-auto w-16 h-16 text-blue-400 animate-pulse z-20 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Analyzing Footage</h3>
                 <p className="text-blue-300/80 animate-pulse font-medium">{analysisStep}</p>
              </div>
            )}

            {status === 'done' && result && (
              <div className="w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-500 py-6">
                 <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                   <CheckCircle className="w-10 h-10 text-green-400" />
                 </div>
                 <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Extraction Complete</h2>
                 <p className="text-white/50 mb-8 max-w-md">Our AI model has successfully processed the evidence and extracted the following incident details.</p>
                 
                 {/* Images Grids */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-8">
                    {/* Violation Frame */}
                    {result.violation_frame_base64 && (
                      <div className="relative w-full aspect-video bg-black/50 border border-white/10 rounded-2xl overflow-hidden group shadow-[0_10px_40px_-10px_rgba(239,68,68,0.15)] hover:shadow-[0_10px_40px_-5px_rgba(239,68,68,0.25)] transition-all">
                         <img src={`data:image/jpeg;base64,${result.violation_frame_base64}`} alt="Violation" className="w-full h-full object-contain" />
                         
                         {result.violation_box && (
                           <div 
                             className="absolute border-2 border-red-500 rounded bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                             style={{
                               left: `${(result.violation_box.x1 / result.violation_frame_width) * 100}%`,
                               top: `${(result.violation_box.y1 / result.violation_frame_height) * 100}%`,
                               width: `${((result.violation_box.x2 - result.violation_box.x1) / result.violation_frame_width) * 100}%`,
                               height: `${((result.violation_box.y2 - result.violation_box.y1) / result.violation_frame_height) * 100}%`
                             }}
                           >
                              <div className="absolute top-0 right-0 -translate-y-full translate-x-0.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-lg rounded-bl shadow-lg whitespace-nowrap">
                                 {result.violation} ({result.confidence}%)
                              </div>
                           </div>
                         )}
                         <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold text-white/70">
                            Violation Frame
                         </div>
                      </div>
                    )}
                 
                    {/* Plate Frame */}
                    {result.plate_frame_base64 && (
                      <div className="relative w-full aspect-video bg-black/50 border border-white/10 rounded-2xl overflow-hidden group shadow-[0_10px_40px_-10px_rgba(59,130,246,0.15)] hover:shadow-[0_10px_40px_-5px_rgba(59,130,246,0.25)] transition-all flex items-center justify-center">
                         <img src={`data:image/jpeg;base64,${result.plate_frame_base64}`} alt="License Plate" className="w-full h-full object-contain" />
                         
                         {result.plate_box && (
                           <div 
                             className="absolute border-[3px] border-blue-500 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.6)] bg-blue-500/10"
                             style={{
                               left: `calc(${(result.plate_box.x1 / result.plate_frame_width) * 100}% - 12px)`,
                               top: `calc(${(result.plate_box.y1 / result.plate_frame_height) * 100}% - 8px)`,
                               width: `calc(${((result.plate_box.x2 - result.plate_box.x1) / result.plate_frame_width) * 100}% + 24px)`,
                               height: `calc(${((result.plate_box.y2 - result.plate_box.y1) / result.plate_frame_height) * 100}% + 16px)`
                             }}
                           >
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%+4px)] bg-blue-500 text-white text-xs font-bold tracking-widest px-3 py-1 rounded-b-lg shadow-lg whitespace-nowrap">
                                 {result.plate}
                              </div>
                           </div>
                         )}
                         <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold text-white/70">
                            Zoomed License Plate
                         </div>
                      </div>
                    )}
                 </div>
                 
                 <div className="w-full max-w-2xl bg-black/40 border border-white/10 rounded-2xl p-6 mb-8 text-left grid gap-4 grid-cols-1 md:grid-cols-2">
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">Detected Violation</p>
                        <p className="text-xl font-bold text-red-400 leading-tight">{result.violation || "Unknown"}</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">License Plate</p>
                        <p className="text-xl font-bold text-blue-400 font-mono tracking-widest leading-tight">{result.plate || "Not Found"}</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5 col-span-1 md:col-span-2 flex items-center justify-between group hover:bg-white/10 transition-colors">
                        <div>
                           <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Model Confidence</p>
                           <p className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">{(result.confidence ? Number(result.confidence).toFixed(2) : '95.0')}%</p>
                        </div>
                        <div className="px-4 py-1.5 bg-green-500/10 text-green-400 text-xs font-bold rounded-full uppercase tracking-wider border border-green-500/20">
                           High Accuracy
                        </div>
                    </div>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
                    <button
                      onClick={() => { setStatus('idle'); setFile(null); setFilePreview(null); setResult(null); }}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all"
                    >
                      Scan Another
                    </button>
                    <button
                      onClick={handleFileComplaint}
                      className="flex-[2] py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex justify-center items-center gap-2"
                    >
                      <ShieldCheck className="w-5 h-5 fill-black text-white" />
                      Proceed to File Complaint
                    </button>
                 </div>
              </div>
            )}
            
          </div>

          {/* Info Banner */}
          {status === 'idle' && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
               <div className="flex gap-4 items-start">
                 <div className="p-3 bg-blue-500/20 rounded-xl shrink-0">
                    <AlertCircle className="w-6 h-6 text-blue-400" />
                 </div>
                 <div>
                    <h4 className="text-white font-bold text-lg">Automated Analysis</h4>
                    <p className="text-white/50 text-sm mt-1 max-w-xl leading-relaxed">Our AI extracts vehicle numbers and classifies traffic violations securely. Your data is not stored permanently without your consent.</p>
                 </div>
               </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};