import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Copy, ExternalLink, ShieldCheck, Check, Edit3, Trash2, Twitter, AlertCircle } from 'lucide-react';
import { getOfficialHandle, logComplaintAction, generateXMessage } from '../services/complaintService';

interface ComplaintPreviewProps {
  data: any;
  onSubmit: () => void;
  onBack: () => void;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const VIOLATION_TYPES = [
  "No Helmet Detected",
  "Red Light Jump",
  "Triple Riding Detected",
  "Wrong Lane Violation",
  "Zebra Crossing Violation",
  "Overspeeding",
  "No Parking"
];

export const ComplaintPreview: React.FC<ComplaintPreviewProps> = ({ data, onSubmit, onBack }) => {
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state
  const [formData, setFormData] = useState({
    reporterName: 'Amit Verma',
    reporterMobile: '9876543210',
    reporterEmail: 'amit.verma@example.com',
    
    vehicleNumber: data?.plate || '',
    violationType: data?.violation || VIOLATION_TYPES[0],
    
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit" }),
    
    state: 'Uttar Pradesh',
    city: 'Noida',
    address: 'Sector 62, Near Metro Station',
    
    description: '',
    evidenceId: data?.evidenceId || `EVD-${Math.floor(100000 + Math.random() * 900000)}`,
    consent: false
  });

  // Set initial description with AI Confidence
  useEffect(() => {
    if (data?.confidence && !formData.description) {
      setFormData(prev => ({
        ...prev,
        description: `The vehicle was detected committing a ${data.violation} violation.\nAI confidence score: ${data.confidence}%.`
      }));
    }
  }, [data, formData.description]);

  const generateComplaintString = () => {
    return `OFFICIAL TRAFFIC COMPLAINT
---------------------------
REPORTER: ${formData.reporterName} (${formData.reporterMobile})
VEHICLE: ${formData.vehicleNumber}
VIOLATION: ${formData.violationType}
DATE/TIME: ${formData.date} at ${formData.time}
LOCATION: ${formData.address}, ${formData.city}, ${formData.state}

DESCRIPTION:
${formData.description}

EVIDENCE ID: ${formData.evidenceId}`;
  };

  const handleCopy = () => {
    const text = generateComplaintString();
    navigator.clipboard.writeText(text);
    return true;
  };

  const handleXPost = () => {
    setError(null);

    // 1. Validate Required Fields
    if (!formData.vehicleNumber || !formData.violationType || !formData.address || !formData.date || !formData.time || !formData.state) {
      setError("Please fill in all required fields (Vehicle, Violation, Location, Date, Time, State).");
      return;
    }

    if (!formData.consent) {
      setError("You must confirm that the information is accurate before posting.");
      return;
    }

    // 2. Fetch State Record
    const handleRecord = getOfficialHandle(formData.state, formData.city);

    if (!handleRecord) {
      setError("Official X handle not configured for this state/city.");
      return;
    }

    // 3. Generate Structured X Message
    // Format:
    // Traffic Violation Report
    // Vehicle: {vehicle_number}
    // Violation: {violation_type}
    // Location: {location_text}
    // Time: {date} approx {time}
    // Requesting necessary action. Evidence attached.
    // @{official_handle}
    // #TrafficViolation #RoadSafety

    const messageData = {
      vehicleNumber: formData.vehicleNumber,
      violationType: formData.violationType,
      location: `${formData.address}, ${formData.city}, ${formData.state}`,
      date: formData.date,
      time: formData.time,
      state: formData.state,
      city: formData.city,
      description: formData.description
    };

    // Generate message with truncation logic
    // Note: generateXMessage handles the format and truncation (Notes removal, Location shortening, Hashtags removal)
    // We pass the handle string (without @, as the function adds it)
    const finalMessage = generateXMessage(messageData, handleRecord.handle);

    // 4. Log Action
    const logEntry = {
      report_id: `RPT-${Date.now()}`,
      user_id: 'USER-CURRENT', // In real app, get from auth context
      state: formData.state,
      selected_handle: handleRecord.handle,
      timestamp: new Date().toISOString(),
      message_preview: finalMessage,
      channel_type: 'X' as const,
      status: 'draft_redirected' as const
    };

    logComplaintAction(logEntry);

    // 5. Encode and Redirect
    const encodedMessage = encodeURIComponent(finalMessage);
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`;

    // Notify parent component of "submission" (even though it's a redirect)
    onSubmit();

    // Redirect
    window.location.href = intentUrl;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  // Check if current state has dedicated system for UI logic
  const currentHandleRecord = getOfficialHandle(formData.state, formData.city);
  const hasDedicatedSystem = currentHandleRecord?.has_dedicated_system ?? false;

  return (
    <div className="w-full px-6 md:px-12 pb-20 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 rounded-full hover:bg-white/10 transition-colors group border border-transparent hover:border-white/10"
            >
              <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white" />
            </button>
            <h1 className="text-3xl font-bold text-white tracking-tight">File Official Complaint</h1>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>AI Verified Data</span>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: FORM FIELDS (Span 2) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Reporter Details */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
               <h3 className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Reporter Information</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">Full Name</label>
                    <input name="reporterName" value={formData.reporterName} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">Mobile Number</label>
                    <input name="reporterMobile" value={formData.reporterMobile} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">Email Address</label>
                    <input name="reporterEmail" type="email" value={formData.reporterEmail} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>
               </div>
            </div>

            {/* 2. Incident & Location Details */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
               <h3 className="text-red-300 text-sm font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Incident & Location</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">Vehicle Number</label>
                    <input name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono font-bold tracking-wider focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">Violation Type</label>
                    <select name="violationType" value={formData.violationType} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer">
                      {VIOLATION_TYPES.map(type => <option key={type} value={type} className="bg-gray-900">{type}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">Date</label>
                    <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">Time</label>
                    <input name="time" type="time" value={formData.time} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">State</label>
                    <select name="state" value={formData.state} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer">
                      {INDIAN_STATES.map(state => <option key={state} value={state} className="bg-gray-900">{state}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">City</label>
                    <input name="city" value={formData.city} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-white/50 font-bold uppercase ml-1">Exact Address</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none" />
                  </div>
               </div>
            </div>

            {/* 3. Description */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
               <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Description</h3>
               <div className="space-y-2">
                  <label className="text-xs text-white/50 font-bold uppercase ml-1">Details (Editable)</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none font-mono text-sm leading-relaxed" />
               </div>
            </div>

          </div>

          {/* RIGHT: EVIDENCE & ACTIONS */}
          <div className="space-y-8">
             {/* Evidence Preview */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
               <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                 <h3 className="text-white text-sm font-bold uppercase tracking-widest">Evidence Preview</h3>
                 <button className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                   <Trash2 className="w-3 h-3" /> Remove
                 </button>
               </div>
               <div className="flex flex-col gap-4">
                 {/* Violation Frame */}
                 {data?.violation_frame_base64 ? (
                   <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50 group cursor-pointer border border-white/10 shadow-lg">
                      <img 
                        src={`data:image/jpeg;base64,${data.violation_frame_base64}`} 
                        alt="Violation Evidence" 
                        className="w-full h-full object-contain opacity-80"
                      />
                      {data.violation_box && (
                           <div 
                             className="absolute border-2 border-red-500 rounded bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                             style={{
                               left: `${(data.violation_box.x1 / data.violation_frame_width) * 100}%`,
                               top: `${(data.violation_box.y1 / data.violation_frame_height) * 100}%`,
                               width: `${((data.violation_box.x2 - data.violation_box.x1) / data.violation_frame_width) * 100}%`,
                               height: `${((data.violation_box.y2 - data.violation_box.y1) / data.violation_frame_height) * 100}%`
                             }}
                           >
                              <div className="absolute top-0 right-0 -translate-y-full translate-x-0.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-lg rounded-bl shadow-lg whitespace-nowrap">
                                 {data.violation} ({data.confidence}%)
                              </div>
                           </div>
                       )}
                       <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold">
                           <Edit3 className="w-4 h-4" /> Change Image
                         </span>
                       </div>
                   </div>
                 ) : (
                   <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black group cursor-pointer border border-white/10 shadow-lg">
                      <img 
                        src="https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1740&auto=format&fit=crop" 
                        alt="Evidence Placeholder" 
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold">
                           <Edit3 className="w-4 h-4" /> Change Image
                         </span>
                      </div>
                   </div>
                 )}

                 {/* Plate Frame */}
                 {data?.plate_frame_base64 && (
                   <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50 group border border-white/10 shadow-lg flex items-center justify-center">
                      <img 
                        src={`data:image/jpeg;base64,${data.plate_frame_base64}`} 
                        alt="License Plate Evidence" 
                        className="w-full h-full object-contain opacity-90"
                      />
                      {data.plate_box && (
                           <div 
                             className="absolute border-[3px] border-blue-500 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.6)] bg-blue-500/10"
                             style={{
                               left: `calc(${(data.plate_box.x1 / data.plate_frame_width) * 100}% - 12px)`,
                               top: `calc(${(data.plate_box.y1 / data.plate_frame_height) * 100}% - 8px)`,
                               width: `calc(${((data.plate_box.x2 - data.plate_box.x1) / data.plate_frame_width) * 100}% + 24px)`,
                               height: `calc(${((data.plate_box.y2 - data.plate_box.y1) / data.plate_frame_height) * 100}% + 16px)`
                             }}
                           >
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%+4px)] bg-blue-500 text-white text-[10px] font-bold tracking-widest px-3 py-1 rounded-b-lg shadow-lg whitespace-nowrap">
                                 {data.plate}
                              </div>
                           </div>
                       )}
                       {/* Badge */}
                       <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur text-white/70 text-[10px] font-mono border border-white/10 rounded z-10 hidden md:block">
                          ID: {formData.evidenceId}
                       </div>
                   </div>
                 )}
               </div>
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-4 sticky top-8">
               {/* Error Message */}
               {error && (
                 <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-200 text-sm">
                   <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                   <span>{error}</span>
                 </div>
               )}

               {/* Consent Checkbox */}
               <div className="flex items-start gap-3 px-2 py-2">
                 <input 
                   type="checkbox" 
                   name="consent" 
                   checked={formData.consent} 
                   onChange={handleChange}
                   className="mt-1 w-4 h-4 rounded border-white/30 bg-black/20 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                 />
                 <label className="text-sm text-white/70 leading-snug cursor-pointer" onClick={() => setFormData({...formData, consent: !formData.consent})}>
                   I confirm that the information provided is accurate and I consent to posting this report publicly on X (Twitter).
                 </label>
               </div>

               <button 
                  onClick={handleXPost}
                  className="w-full py-5 rounded-2xl bg-white text-black font-bold text-lg tracking-wide hover:bg-gray-200 transition-all flex items-center justify-center gap-3 shadow-lg"
                >
                  <Twitter className="w-5 h-5 fill-black" />
                  <span>Post on X</span>
                </button>
                
                <p className="text-center text-white/40 text-[10px] px-4 leading-relaxed">
                  You will be redirected to X to publish this report. Busted does not post automatically without your confirmation.
                </p>

                {/* Conditional Options */}
                {hasDedicatedSystem && (
                  <div className="pt-4 border-t border-white/10 mt-4 space-y-3">
                    <p className="text-xs text-white/30 text-center uppercase tracking-widest font-bold">Other Options</p>
                    <button 
                      onClick={() => { handleCopy(); setShowToast(true); setTimeout(() => setShowToast(false), 2000); }}
                      className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Text for WhatsApp/Email</span>
                    </button>
                  </div>
                )}
            </div>

          </div>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-50 bg-white text-[#000428] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 font-bold border-2 border-blue-400"
          >
            <Check className="w-6 h-6 text-green-600" />
            <div className="flex flex-col">
               <span>Complaint details copied!</span>
               <span className="text-xs font-normal opacity-70">Paste into the official portal to finalize.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};