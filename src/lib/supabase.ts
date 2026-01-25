import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocyjkukwgftezyspqjxr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeWprdWt3Z2Z0ZXp5c3BxanhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjQwOTgsImV4cCI6MjA4NDk0MDA5OH0.KXLUgBNFtfkKnmP3ReniJHSUIf0IRdYo-MnvEEPUMSo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);