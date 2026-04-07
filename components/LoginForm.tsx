import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { Captcha } from './Captcha';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToSignup: () => void;
  onBack: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onSwitchToSignup, onBack }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!isCaptchaValid) {
      setError("Please complete the captcha correctly.");
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Successful login
      onLoginSuccess({
        name: data.user.name || identifier.split('@')[0] || 'User',
        email: data.user.email,
        isGuest: false,
        id: data.user.id
      });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
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
        {/* Decorative elements for Cyber/Police Aesthetic */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none"></div>

        <h2 className="text-3xl font-bold text-white mb-2 text-center">Welcome Back</h2>
        <p className="text-gray-400 text-center mb-8 text-sm">Sign in to manage your reports and tracking.</p>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} method="POST" action="#" className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Email, Username, or Phone</label>
            <input 
              type="text" 
              name="username"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
              placeholder="email@example.com or username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
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

          {/* Captcha */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Security Check</label>
            <Captcha onValidate={setIsCaptchaValid} />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full relative overflow-hidden bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-white/10 hover:bg-white/30 hover:shadow-white/20 transition-all duration-300 transform hover:scale-[1.03] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center group"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  AUTHENTICATING...
                </>
              ) : "LOGIN"}
            </span>
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-4 text-center">
          <p className="text-gray-400 text-sm">
            Not registered yet?{' '}
            <button 
              onClick={onSwitchToSignup}
              className="text-blue-400 hover:text-blue-300 font-semibold underline decoration-transparent hover:decoration-blue-300 transition-all"
            >
              Signup
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