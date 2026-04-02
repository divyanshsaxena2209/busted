import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Upload, Loader2, ArrowLeft, Twitter, AlertCircle } from 'lucide-react';
import { getOfficialHandle, generateCivicMessage, logComplaintAction } from '../services/complaintService';

interface ReportIssueProps {
  onSubmitSuccess: (data: any) => void;
  onCancel: () => void;
}

const ISSUE_TYPES = [
  "Pothole",
  "Road Damage",
  "Traffic Signal Malfunction",
  "Illegal Parking",
  "Construction Hazard",
  "Accident / Obstruction",
  "Broken Streetlight",
  "Drainage / Flooding",
  "Other"
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export const ReportIssue: React.FC<ReportIssueProps> = ({ onSubmitSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    issueType: ISSUE_TYPES[0],
    location: '', // formatted address
    landmark: '',
    description: '',
    state: 'Delhi',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit" }),
    latitude: 0,
    longitude: 0
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    setError(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Mock Reverse Geocoding (Since we don't have API key)
        // In a real app, fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=YOUR_KEY`)
        const mockAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (Detected Location)`;
        
        setFormData(prev => ({ 
          ...prev, 
          location: mockAddress,
          latitude: lat,
          longitude: lng
        }));
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setError("Unable to retrieve your location. Please enter manually.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleXPost = () => {
    setError(null);

    // 1. Validate Required Fields
    if (!formData.issueType || !formData.location || !formData.state) {
      setError("Please fill in all required fields (Issue Type, Location, State).");
      return;
    }

    // 2. Fetch Official Handle
    // We use the state for handle lookup. City logic could be added if we had a city field, 
    // but for now we default to state-level or traffic police if available.
    // Let's try to extract city from location if possible, or just use state.
    // For this implementation, we'll just pass state.
    const handleRecord = getOfficialHandle(formData.state);

    if (!handleRecord) {
      setError("Official reporting handle unavailable for this state.");
      return;
    }

    // 3. Generate Message
    const civicData = {
      issueType: formData.issueType,
      location: formData.location,
      landmark: formData.landmark,
      date: formData.date,
      time: formData.time,
      state: formData.state,
      description: formData.description,
      latitude: formData.latitude,
      longitude: formData.longitude
    };

    const finalMessage = generateCivicMessage(civicData, handleRecord.handle);
    
    // 4. Log Action
    const logEntry = {
      report_id: `CIV-${Date.now()}`,
      user_id: 'USER-CURRENT',
      issue_type: formData.issueType,
      state: formData.state,
      latitude: formData.latitude,
      longitude: formData.longitude,
      formatted_address: formData.location,
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

    // Notify parent (optional, maybe just to close view or show success state locally before redirect)
    // onSubmitSuccess({}); // We might not want to close immediately, let the redirect happen.
    
    window.location.href = intentUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full px-8 md:px-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-white/10 transition-colors group"
          >
            <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white tracking-tight">Report Civic Issue</h1>
        </div>

        {/* Form Container */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          
          {/* Left Column */}
          <div className="space-y-8">
            {/* Issue Type */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-200 uppercase tracking-wider">Issue Type <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  value={formData.issueType}
                  onChange={(e) => setFormData({...formData, issueType: e.target.value})}
                  className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-all text-lg cursor-pointer hover:bg-white/10"
                >
                  {ISSUE_TYPES.map(type => (
                    <option key={type} value={type} className="bg-gray-900 text-white">{type}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-blue-200 uppercase tracking-wider">Location <span className="text-red-400">*</span></label>
              
              {/* Option A: Auto Detect */}
              <button
                type="button"
                onClick={handleLocation}
                disabled={isLocating}
                className="w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-200 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                <span>Detect My Location</span>
              </button>

              {/* Option B: Manual Entry */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Or enter street/area manually"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-5 py-4 pl-12 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-all"
                />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              </div>

              {/* Landmark */}
              <input
                type="text"
                placeholder="Nearby Landmark (Optional)"
                value={formData.landmark}
                onChange={(e) => setFormData({...formData, landmark: e.target.value})}
                className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            
             {/* Upload Image */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-200 uppercase tracking-wider">Evidence (Optional)</label>
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full bg-white/5 backdrop-blur-md border border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center group-hover:bg-white/10 group-hover:border-blue-400/40 transition-all">
                  {file ? (
                    <div className="flex items-center gap-3 text-green-400">
                      <Twitter className="w-6 h-6" /> {/* Just using an icon, file upload isn't really used in X intent */}
                      <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-white/40 mb-3 group-hover:scale-110 transition-transform" />
                      <span className="text-white/60 font-medium">Click to upload photo</span>
                      <span className="text-white/30 text-xs mt-1">JPG, PNG supported</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-white/30 mt-2 text-center">Note: You will need to manually attach this image in the X composer.</p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8 flex flex-col h-full">
            
            {/* State Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-200 uppercase tracking-wider">State / UT <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-all text-lg cursor-pointer hover:bg-white/10"
                >
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state} className="bg-gray-900 text-white">{state}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 flex-grow flex flex-col">
              <label className="text-sm font-bold text-blue-200 uppercase tracking-wider">Description (Recommended)</label>
              <textarea
                placeholder="Describe the issue in detail..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full flex-grow min-h-[150px] bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
              />
            </div>

             {/* Submit Action Area */}
            <div className="mt-auto pt-4">
               {error && (
                 <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-200 text-sm mb-4">
                   <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                   <span>{error}</span>
                 </div>
               )}

               <button
                type="button"
                onClick={handleXPost}
                className="w-full py-5 rounded-xl bg-white text-black font-bold text-xl tracking-widest hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-3"
              >
                <Twitter className="w-6 h-6 fill-black" />
                POST ISSUE ON X
              </button>
              <p className="text-center text-white/30 text-xs mt-4">
                You will be redirected to X to publish this report. Busted does not post automatically without your confirmation.
              </p>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};