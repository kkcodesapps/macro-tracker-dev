import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raszwvrlkebdkbtmyjvp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhc3p3dnJsa2ViZGtidG15anZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg4ODI3NzgsImV4cCI6MjA0NDQ1ODc3OH0.vpeIo5sHs94fGV3laMZpoYG53HFcccvHM0R6N42EutU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signOut = () => supabase.auth.signOut();