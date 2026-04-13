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
      // ✅ Key name must match the Python function parameter 'video'
      formData.append('video', selectedFile);

      // ✅ Point directly to the AI Proxy port (8213)
      const aiUrl = import.meta.env.VITE_AI_URL || 'http://127.0.0.1:9000';

      // ✅ UPDATED ROUTE: Removed '/api' to match your main.py fix
      // ✅ Included trailing '/' to prevent 307 redirect errors
      const response = await fetch(`${aiUrl}/analyze/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Analysis failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setStatus('done');

    } catch (err) {
      console.error("Analysis Fetch Error:", err);
      setStatus('idle');
      alert("Analysis failed. Please ensure the AI backend is active on port 9000 and CORS is configured.");
      setFile(null);
      setFilePreview(null);
    }
  };

  const handleFileComplaint = async () => {
    if (!result) return;

    try {
      // ✅ Calls Node backend (3000) to save data to Supabase
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
    <div className="w-full px-6 md:px-12 pb-20 relative text-white">
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
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-white/10 transition-colors group border border-transparent hover:border-white/10"
            >
              <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white" />
            </button>
            <h1 className="text-3xl font-bold tracking-tight">Upload Evidence</h1>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>AI Automated Extraction</span>
          </div>
        </div>

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
                onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              />
              <div className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:border-blue-500/50 transition-all duration-300">
                <Upload className="w-10 h-10 text-white/40 group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="text-2xl font-bold mb-2 tracking-tight group-hover:text-blue-200 transition-colors">Drag & Drop Evidence</h3>
              <p className="text-white/40 mb-8 font-medium text-center">Supports MP4, AVI, MOV, JPG, PNG.</p>
              <div className="bg-blue-500 hover:bg-blue-600 px-8 py-3.5 rounded-xl flex items-center gap-3 transition-colors shadow-lg shadow-blue-500/30">
                <FileVideo className="w-5 h-5" />
                Select File
              </div>
            </div>
          )}

          {status === 'analyzing' && (
            <div className="w-full h-full flex flex-col items-center justify-center py-12">
              <div className="relative w-64 h-64 md:w-96 md:h-64 rounded-2xl overflow-hidden bg-black/60 border border-white/10 mb-8 flex items-center justify-center shadow-2xl">
                {filePreview && (
                  <video src={filePreview} className="w-full h-full object-cover opacity-40 blur-[1px]" autoPlay loop muted />
                )}
                <div className="absolute top-0 left-0 w-full h-[20%] bg-gradient-to-b from-transparent via-blue-500/40 to-transparent animate-scan z-10" />
                <ScanLine className="absolute inset-0 m-auto w-16 h-16 text-blue-400 animate-pulse z-20" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Analyzing Footage</h3>
              <p className="text-blue-300/80 animate-pulse font-medium">{analysisStep}</p>
            </div>
          )}

          {status === 'done' && result && (
            <div className="w-full flex flex-col items-center text-center animate-in zoom-in-95 py-6">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Extraction Complete</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-8">
                {result.violation_frame && (
                  <div className="relative bg-black/50 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                    <img src={`data:image/jpeg;base64,${result.violation_frame}`} alt="Violation" className="w-full h-auto" />
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 rounded-full text-xs font-bold">Violation Frame</div>
                  </div>
                )}
                {result.plate_frame && (
                  <div className="relative bg-black/50 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                    <img src={`data:image/jpeg;base64,${result.plate_frame}`} alt="Plate" className="w-full h-auto" />
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 rounded-full text-xs font-bold">License Plate</div>
                  </div>
                )}
              </div>

              <div className="w-full max-w-2xl bg-black/40 border border-white/10 rounded-2xl p-6 mb-8 text-left grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">Detected Violation</p>
                  <p className="text-xl font-bold text-red-400 leading-tight">{result.violation || "Unknown"}</p>
                </div>
                <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">License Plate</p>
                  <p className="text-xl font-bold text-blue-400 font-mono tracking-widest leading-tight">{result.plate || "Not Found"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
                <button onClick={() => setStatus('idle')} className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 font-bold rounded-xl transition-all">Scan Another</button>
                <button onClick={handleFileComplaint} className="flex-[2] py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex justify-center items-center gap-2">
                  <ShieldCheck className="w-5 h-5 fill-black" />
                  Proceed to File Complaint
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};