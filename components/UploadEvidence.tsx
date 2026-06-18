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

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setFilePreview(URL.createObjectURL(selectedFile));
    startAnalysis(selectedFile);
  };

  const startAnalysis = async (selectedFile: File) => {
    setStatus('analyzing');
    setAnalysisStep("Uploading & analyzing video feed...");

    try {
      const formData = new FormData();
      // ✅ Key must be 'video' to match analysis.py parameter
      formData.append('file', selectedFile);

      // ✅ Use relative path so the Node server proxies it to the Python backend
      const aiUrl = '/api/ai';

      // ✅ Path must match APIRouter(prefix="/analyze") + @router.post("/")
      const response = await fetch(`${aiUrl}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setResult(data);
      setStatus('done');

    } catch (err: any) {
      console.error("Analysis Error:", err);
      setStatus('idle');
      alert(`Analysis failed: ${err.message}. Ensure Python backend is running (port 8005).`);
      setFile(null);
      setFilePreview(null);
    }
  };

  const handleFileComplaint = async () => {
    if (!result) return;
    try {
      const response = await fetch("/api/reports/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: `EV-${Date.now()}`,
          user_id: "demo-user",
          issue_type: result.violation || "Unknown",
          message_preview: result.plate || "No plate detected",
          timestamp: new Date().toISOString(),
          status: "detected",
          channel_type: "AI"
        }),
      });
      onContinue(result);
    } catch (err) {
      console.error("Save failed:", err);
      onContinue(result);
    }
  };

  return (
    <div className="w-full px-6 md:px-12 pb-20 relative text-white">
      <style>{`
        @keyframes scan { 0% { transform: translateY(-100%); } 50% { transform: translateY(500%); } 100% { transform: translateY(-100%); } }
        .animate-scan { animation: scan 3s ease-in-out infinite; }
      `}</style>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
              <ArrowLeft className="w-6 h-6 text-white/70" />
            </button>
            <h1 className="text-3xl font-bold tracking-tight">Upload Evidence</h1>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>AI Automated Extraction</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[400px] flex flex-col items-center justify-center">
          {status === 'idle' && (
            <div className="flex flex-col items-center cursor-pointer group py-12" onClick={() => fileInputRef.current?.click()}>
              <input type="file" accept="video/*" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])} />
              <div className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-6 group-hover:border-blue-500/50 transition-all">
                <Upload className="w-10 h-10 text-white/40 group-hover:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Drag & Drop Evidence</h3>
              <p className="text-white/40 mb-8">Supports MP4, AVI, MOV.</p>
              <div className="bg-blue-500 hover:bg-blue-600 px-8 py-3.5 rounded-xl flex items-center gap-3 transition-colors">
                <FileVideo className="w-5 h-5" />
                Select File
              </div>
            </div>
          )}

          {status === 'analyzing' && (
            <div className="flex flex-col items-center py-12">
              <div className="relative w-64 h-64 md:w-96 md:h-64 rounded-2xl overflow-hidden bg-black/60 border border-white/10 mb-8 flex items-center justify-center">
                {filePreview && <video src={filePreview} className="w-full h-full object-cover opacity-40 blur-[1px]" autoPlay loop muted />}
                <div className="absolute top-0 left-0 w-full h-[20%] bg-gradient-to-b from-transparent via-blue-500/40 to-transparent animate-scan z-10" />
                <ScanLine className="absolute inset-0 m-auto w-16 h-16 text-blue-400 animate-pulse z-20" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Analyzing Footage</h3>
              <p className="text-blue-300/80 animate-pulse font-medium">{analysisStep}</p>
            </div>
          )}

          {status === 'done' && result && (
            <div className="w-full flex flex-col items-center text-center py-6">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-8">Extraction Complete</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-8">
                {result.violation_frame && (
                  <div className="relative bg-black/50 border border-white/10 rounded-2xl overflow-hidden">
                    <img src={`data:image/jpeg;base64,${result.violation_frame}`} alt="Violation" className="w-full h-auto" />
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 rounded-full text-xs font-bold">Violation</div>
                  </div>
                )}
                {result.plate_frame && (
                  <div className="relative bg-black/50 border border-white/10 rounded-2xl overflow-hidden">
                    <img src={`data:image/jpeg;base64,${result.plate_frame}`} alt="Plate" className="w-full h-auto" />
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 rounded-full text-xs font-bold">Plate</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
                <button onClick={() => setStatus('idle')} className="flex-1 py-4 bg-white/5 border border-white/10 font-bold rounded-xl">Scan Another</button>
                <button onClick={handleFileComplaint} className="flex-[2] py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex justify-center items-center gap-2">
                  <ShieldCheck className="w-5 h-5" /> Proceed to Complaint
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};