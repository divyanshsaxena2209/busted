-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DELETE ANY PRE-EXISTING DATABASE TABLES
-- We drop existing tables and their dependencies (like policies) using CASCADE
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. CREATE TABLE FOR SIGNUP DETAILS (profiles)
-- This stores all the details collected during user signup
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  pincode TEXT,
  role TEXT DEFAULT 'Citizen',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- 3. CREATE TABLE FOR REPORTS
-- This logs all reports submitted. Counters and history tab will fetch data from here.
CREATE TABLE public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type TEXT,
  state TEXT,
  latitude FLOAT,
  longitude FLOAT,
  formatted_address TEXT,
  selected_handle TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  message_preview TEXT,
  channel_type TEXT,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies for reports
CREATE POLICY "Users can view their own reports."
  ON public.reports FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own reports."
  ON public.reports FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own reports."
  ON public.reports FOR UPDATE
  USING ( auth.uid() = user_id );

-- Create an index to speed up history fetching and counting
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
