import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pincodeLookup = require('india-pincode-lookup');

const router = Router();

// Hybrid Pincode Lookup (Offline Primary, Postal API Fallback)
router.get('/pincode/:pincode', async (req, res) => {
  const { pincode } = req.params;
  try {
    const data = pincodeLookup.lookup(pincode);
    
    // Primary: Fast Offline Lookup
    if (data && data.length > 0) {
      return res.json([{
        Status: 'Success',
        PostOffice: [{
          District: data[0].districtName || data[0].officeName,
          State: data[0].stateName
        }]
      }]);
    }
    
    // Fallback: Official Postal API via Node (Bypasses CORS restrictions)
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const apiData = await response.json();
    
    if (apiData && apiData[0] && apiData[0].Status === 'Success') {
      const postOffice = apiData[0].PostOffice[0];
      return res.json([{
        Status: 'Success',
        PostOffice: [{
          District: postOffice.District,
          State: postOffice.Circle || postOffice.State // Requested Mapping
        }]
      }]);
    }

    return res.json([{ Status: 'Error' }]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pincode' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, name, phone, username, district, state, pincode } = req.body;
  
  try {
    if (supabase) {
      if (!email) throw new Error('Email is required for registration.');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone, username, district, state, pincode }
        }
      });
      
      if (error) throw error;

      // If session is null, it means Email Confirmations are enabled in Supabase!
      const otpRequired = !data.session;

      // ALWAYS create the profile immediately so their details are saved
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username,
          full_name: name,
          email,
          phone, 
          district,
          state,
          pincode,
          role: 'Citizen'
        });
      }

      res.json({ 
        user: { ...data.user, name, isGuest: false }, 
        session: data.session,
        otpRequired
      });
    } else {
      // Mock Signup
      const mockUser = { id: 'user-' + Date.now(), email, name, role: 'Citizen', district, state };
      res.json({ user: mockUser, token: 'mock-jwt-token' });
    }
  } catch (error: any) {
    console.error('Signup error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, token } = req.body;

  try {
    if (supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) throw error;

      res.json({ user: data.user, session: data.session });
    } else {
      // Mock Verify
      if (token === '123456') {
         res.json({ user: { id: 'user-verified', email }, session: { access_token: 'mock-token' } });
      } else {
        res.status(400).json({ error: 'Invalid OTP' });
      }
    }
  } catch (error: any) {
    console.error('Verify OTP error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  try {
    if (supabase) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      res.json({ success: true });
    } else {
      res.json({ success: true });
    }
  } catch (error: any) {
    console.error('Resend OTP error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier can be email, phone, or username
  
  try {
    if (supabase) {
      let data, error;

      // Determine if identifier is email, phone, or username
      const isEmail = identifier.includes('@');
      const isPhone = /^\+?[0-9]{10,15}$/.test(identifier); // Basic phone check

      if (isEmail) {
        // Try standard email login first
        ({ data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password
        }));

        // If email login fails, it might be because the user signed up with Phone 
        // and email is only in metadata/profiles. Try to lookup phone.
        if (error) {
           const { data: profile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('email', identifier)
            .single();
            
           if (profile && profile.phone) {
             ({ data, error } = await supabase.auth.signInWithPassword({
                phone: profile.phone,
                password
              }));
           }
        }
      } else if (isPhone) {
        ({ data, error } = await supabase.auth.signInWithPassword({
          phone: identifier,
          password
        }));
      } else {
        // Username Login
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, phone')
          .eq('username', identifier)
          .single();

        if (profile) {
           // Try email first, then phone
           if (profile.email) {
             ({ data, error } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password
              }));
           }
           
           // If email failed or didn't exist, try phone
           if ((error || !profile.email) && profile.phone) {
              ({ data, error } = await supabase.auth.signInWithPassword({
                phone: profile.phone,
                password
              }));
           }
        } else {
           throw new Error('Username not found.');
        }
      }
      
      if (error) throw error;
      res.json({ user: { ...data.user, name: data.user?.user_metadata?.name }, session: data.session });
    } else {
      // Mock Login
      res.json({ user: { id: 'user-' + Date.now(), email: identifier, name: 'Demo User', role: 'Citizen' }, token: 'mock-jwt-token' });
    }
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      res.json(data);
    } else {
      res.json({ id: userId, name: 'Guest User', role: 'Citizen' });
    }
  } catch (error: any) {
    console.error('Error fetching profile:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export const authRoutes = router;
