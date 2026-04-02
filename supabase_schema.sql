-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop existing policies to avoid conflicts
drop policy if exists "Public profiles are viewable by everyone." on profiles;
drop policy if exists "Users can insert their own profile." on profiles;
drop policy if exists "Users can update own profile." on profiles;

-- Drop all variations of reports policies to ensure clean alter
drop policy if exists "Users can view their own reports." on reports;
drop policy if exists "Users can insert their own reports." on reports;
drop policy if exists "Users can view own reports" on reports;
drop policy if exists "Users can insert own reports" on reports;
drop policy if exists "Enable read access for all users" on reports;

-- DANGER/REBUILD: Forcefully wipe existing manually-created tables so PostgreSQL strictly generates the new columns!
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table if it doesn't exist
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  email text,
  phone text,
  city text,
  district text,
  state text,
  pincode text,
  role text default 'Citizen',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Fix: Ensure 'id' column in profiles is UUID (fixes "operator does not exist: uuid = text")
do $$
begin
  -- Check if 'id' is type text, if so, convert it to uuid
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'id' and data_type = 'text'
  ) then
    alter table public.profiles alter column id type uuid using id::uuid;
  end if;

  -- Add district column if it doesn't exist
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'district'
  ) then
    alter table public.profiles add column district text;
  end if;
end $$;

-- Enable Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create reports table if it doesn't exist
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  report_id text,
  user_id uuid references auth.users(id),
  issue_type text,
  state text,
  latitude float,
  longitude float,
  formatted_address text,
  selected_handle text,
  timestamp timestamptz default now(),
  message_preview text,
  channel_type text,
  status text,
  created_at timestamptz default now()
);

-- Fix: Ensure 'user_id' column in reports is UUID
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'reports' and column_name = 'user_id' and data_type = 'text'
  ) then
    alter table public.reports alter column user_id type uuid using user_id::uuid;
  end if;
end $$;

-- Enable Row Level Security (RLS) for reports
alter table public.reports enable row level security;

-- Create policies for reports
create policy "Users can view their own reports."
  on reports for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own reports."
  on reports for insert
  with check ( auth.uid() = user_id );
