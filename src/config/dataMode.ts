/**
 * Data Mode Configuration
 *
 * Toggle between live Supabase data and static sample data for presentations.
 *
 * When Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are
 * missing, static data mode is enabled automatically so the app works as a
 * standalone demo without any backend.
 *
 * To force static sample data even when Supabase is configured:
 * 1. Change FORCE_STATIC_DATA to true
 * 2. Restart the development server
 */

import { supabaseConfigured } from '../lib/supabaseClient';

const FORCE_STATIC_DATA = false;

export const USE_STATIC_DATA = FORCE_STATIC_DATA || !supabaseConfigured;

export const getDataMode = () => {
  return USE_STATIC_DATA ? 'static' : 'live';
};

export const isStaticDataMode = () => USE_STATIC_DATA;
