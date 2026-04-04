import { supabase } from '../supabaseClient';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Captcha } from './Captcha';

interface SignupFormProps {
  onSignupSuccess: (user: { name: string; email: string; isGuest: boolean }) => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess, onSwitchToLogin, onBack }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);

  // New States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);

  // Password Strength Logic
  const passwordCriteria = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Contains number', valid: /[0-9]/.test(password) },
    { label: 'Contains special character', valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const validCriteriaCount = passwordCriteria.filter(c => c.valid).length;
  const strengthPercentage = (validCriteriaCount / 5) * 100;

  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';

  if (validCriteriaCount <= 2) {
    strengthLabel = 'Low';
    strengthColor = 'bg-red-500';
  } else if (validCriteriaCount <= 4) {
    strengthLabel = 'Medium';
    strengthColor = 'bg-yellow-500';
  } else {
    strengthLabel = 'Hard';
    strengthColor = 'bg-green-500';
  }

  const isPasswordStrong = passwordCriteria.every(c => c.valid);

  const getFriendlyError = (errMessage: string) => {
    const errorString = errMessage.toLowerCase();

    if (errorString.includes("token has expired") || errorString.includes("invalid otp") || errorString.includes("invalid auth")) {
      return "The verification code you entered is incorrect or has expired. Please check your email or request a new code.";
    }
    if (errorString.includes("already registered") || errorString.includes("already exists")) {
      return "An account with this email/phone already exists. Please try logging in instead.";
    }
    if (errorString.includes("email is required")) {
      return "Please enter a valid email address.";
    }
    if (errorString.includes("rate limit") || errorString.includes("spam")) {
      return "You've requested too many codes too quickly. Please wait a minute and try again.";
    }

    return errMessage || "An unexpected error occurred. Please try again.";
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 10) {
      setPhone(value);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchPincodeDetails = async () => {
      if (pincode.length === 6) {
        try {
          // Call local backend proxy to bypass CORS
          const response = await fetch(`/api/auth/pincode/${pincode}`, {
            signal: controller.signal
          });

          if (!response.ok) throw new Error('Proxy failed');

          const finalData = await response.json();

          if (isMounted) {
            if (finalData && finalData[0] && finalData[0].Status === 'Success') {
              const postOffice = finalData[0].PostOffice[0];
              setDistrict(postOffice.District);
              setStateName(postOffice.State);
              setPincodeError('');
            } else {
              setDistrict('');
              setStateName('');
              setPincodeError('Unlisted Pincode. Please enter location manually.');
            }
          }
        } catch (err: any) {
          if (isMounted && err.name !== 'AbortError') {
            setDistrict('');
            setStateName('');
            setPincodeError('Unlisted Pincode. Please enter location manually.');
          }
        }
      } else {
        if (isMounted) {
          setDistrict('');
          setStateName('');
          setPincodeError('');
        }
      }
    };

    fetchPincodeDetails();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [pincode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (showOtpInput) {
      handleVerifyOtp();
      return;
    }

    if (!isCaptchaValid) {
      setError("Please complete the captcha correctly.");
      return;
    }

    if (!email) {
      setError("Please provide a valid email address.");
      return;
    }

    if (phone && phone.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!isPasswordStrong) {
      setError("Password does not meet security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!pincode || pincode.length !== 6 || !district || !stateName) {
      setError("Please enter a valid 6-digit Pincode, District, and State.");
      return;
    }

    setIsLoading(true);
    console.log('Attempting signup for:', email || phone);

    // Format phone with +91 if present
    const formattedPhone = phone ? `+91${phone}` : '';
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          phone: formattedPhone,
          username,
          district,
          state: stateName,
          pincode
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      if (data.otpRequired) {
        setShowOtpInput(true);
        setError("Please check your email for the verification code.");
        setIsLoading(false);
      } else {
        onSignupSuccess({ name, email, isGuest: false });
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(getFriendlyError(err.message || 'Failed to create account. Please try again.'));
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      console.log('OTP Verified successfully');
      onSignupSuccess({ name, email, isGuest: false });
    } catch (err: any) {
      console.error('OTP Verification error:', err);
      setError(getFriendlyError(err.message || 'Failed to verify OTP. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to resend code');
      // Briefly show a success message via the error banner since it acts as a notification space
      setError("A new verification code has been sent to your email!");
    } catch (err: any) {
      setError(getFriendlyError(err.message));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none"></div>

        <h2 className="text-3xl font-bold text-white mb-2 text-center">
          {showOtpInput ? 'Verify Email' : 'Create Account'}
        </h2>
        <p className="text-gray-400 text-center mb-8 text-sm">
          {showOtpInput ? `Enter the secure OTP code sent to ${email}` : 'Join the network to report violations.'}
        </p>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {showOtpInput ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">One-Time Password</label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-center tracking-widest text-xl"
                placeholder="Enter Code"
                maxLength={10}
              />
              <div className="flex justify-between items-center mt-3 px-1">
                <p className="text-xs text-gray-500 font-medium">Didn't receive a code?</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isResending ? 'SENDING...' : 'RESEND CODE'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    placeholder="johndoe123"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`w-full bg-white/5 border ${pincodeError ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all`}
                    placeholder="123456"
                    maxLength={6}
                  />
                  {pincodeError && <p className="text-[10px] text-yellow-400 ml-1 leading-tight mt-1">{pincodeError}</p>}
                </div>
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">District</label>
                  <input
                    type="text"
                    required
                    readOnly={!pincodeError}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={`w-full bg-white/5 border ${pincodeError ? 'border-yellow-500/50 text-white cursor-text focus:bg-white/10' : 'border-white/10 text-gray-400 cursor-not-allowed focus:outline-none'} rounded-lg px-4 py-3 transition-all`}
                    placeholder={pincodeError ? "Enter District" : "Auto-detected"}
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">State</label>
                  <input
                    type="text"
                    required
                    readOnly={!pincodeError}
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className={`w-full bg-white/5 border ${pincodeError ? 'border-yellow-500/50 text-white cursor-text focus:bg-white/10' : 'border-white/10 text-gray-400 cursor-not-allowed focus:outline-none'} rounded-lg px-4 py-3 transition-all`}
                    placeholder={pincodeError ? "Enter State" : "Auto-detected"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Confirm</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Tracker */}
              <div className="bg-white/5 rounded-lg p-4 space-y-3 border border-white/10">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Password Security</p>
                  <span className={`text-xs font-bold uppercase ${strengthLabel === 'Hard' ? 'text-green-400' : strengthLabel === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {strengthLabel}
                  </span>
                </div>

                {/* Strength Meter Line */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${strengthColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${strengthPercentage}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {passwordCriteria.map((criteria, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {criteria.valid ? (
                        <Check size={12} className="text-green-400 shrink-0" />
                      ) : (
                        <X size={12} className="text-red-400/70 shrink-0" />
                      )}
                      <span className={`text-xs transition-colors duration-200 ${criteria.valid ? 'text-green-400' : 'text-gray-500'}`}>
                        {criteria.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Captcha */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Security Check</label>
                <Captcha onValidate={setIsCaptchaValid} />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 relative overflow-hidden bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-white/10 hover:bg-white/30 hover:shadow-white/20 transition-all duration-300 transform hover:scale-[1.03] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center group"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {showOtpInput ? "VERIFYING..." : "CREATING ACCOUNT..."}
                </>
              ) : (showOtpInput ? "VERIFY OTP" : "SIGN UP")}
            </span>
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-4 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-400 hover:text-blue-300 font-semibold underline decoration-transparent hover:decoration-blue-300 transition-all"
            >
              Login here
            </button>
          </p>

          <button
            onClick={onBack}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </motion.div>
  );
};