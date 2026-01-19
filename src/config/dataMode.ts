/**
 * Data Mode Configuration
 *
 * Toggle between live Supabase data and static sample data for presentations.
 *
 * To enable static sample data:
 * 1. Change USE_STATIC_DATA to true
 * 2. Restart the development server
 *
 * To return to live Supabase data:
 * 1. Change USE_STATIC_DATA to false
 * 2. Restart the development server
 */

export const USE_STATIC_DATA = true; // Set to false to use live Supabase data

export const getDataMode = () => {
  return USE_STATIC_DATA ? 'static' : 'live';
};

export const isStaticDataMode = () => USE_STATIC_DATA;
