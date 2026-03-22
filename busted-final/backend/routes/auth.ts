import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

const router = Router();

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, name, phone, username, district, state, pincode } = req.body;
  
  try {
    if (supabase) {
      // Prioritize Phone Auth if phone is provided to enable OTP verification
      // If phone is present, we use it as the primary identity.
      // Email is stored in metadata.
      
      let signUpResponse;
      let isPhoneSignup = false;
      
      if (phone) {
         isPhoneSignup = true;
         // Phone signup (requires SMS provider setup in Supabase)
         signUpResponse = await supabase.auth.signUp({
          phone,
          password,
          options: {
            data: { name, username, district, state, pincode, email } // Store email in metadata
          }
        });
      } else {
        // Email signup (default)
        signUpResponse = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone, username, district, state, pincode },
            emailRedirectTo: process.env.APP_URL || 'https://ais-dev-5yjetrkysioul56dpqq6lk-265881881978.asia-southeast1.run.app'
          }
        });
      }

      const { data, error } = signUpResponse;
      
      if (error) throw error;

      // Check if OTP verification is required
      // For phone signup, session is null until OTP is verified.
      const otpRequired = (isPhoneSignup && !data.session);

      // If we have a session (e.g. Email signup with "Enable Manual Confirm" off, or Phone signup if OTP disabled?), 
      // we should create the profile now.
      if (data.session && data.user) {
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
        user: { ...data.user, name }, 
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
  const { phone, token } = req.body;

  try {
    if (supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms'
      });

      if (error) throw error;

      // OTP Verified - Create/Update Profile
      if (data.user) {
        const metadata = data.user.user_metadata || {};
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: metadata.username,
          full_name: metadata.name,
          email: metadata.email,
          phone: data.user.phone, // Use the verified phone from user object
          district: metadata.district,
          state: metadata.state,
          pincode: metadata.pincode,
          role: 'Citizen'
        });
      }

      res.json({ user: data.user, session: data.session });
    } else {
      // Mock Verify
      if (token === '123456') {
         res.json({ user: { id: 'user-verified', phone }, session: { access_token: 'mock-token' } });
      } else {
        res.status(400).json({ error: 'Invalid OTP' });
      }
    }
  } catch (error: any) {
    console.error('Verify OTP error:', error.message);
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
