import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
// Try loading .env.local first
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Database features will not work.');
}

// Create a single supabase client for interacting with your database
// If keys are missing, we export null to prevent runtime crashes
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

