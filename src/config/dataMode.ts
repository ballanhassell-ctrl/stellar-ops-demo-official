/**
 * Data Mode Configuration
 *
 * Uses env-based mode selection so demo and live builds can be generated
 * without editing source files.
 *
 * Supported values for VITE_APP_MODE:
 * - 'demo'   => static sample data mode
 * - 'live'   => Supabase-backed mode
 *
 * Backwards compatibility:
 * - VITE_USE_STATIC_DATA=true will also enable static mode.
 */

const appMode = (import.meta.env.VITE_APP_MODE as string | undefined)?.toLowerCase();
const staticDataFlag = (import.meta.env.VITE_USE_STATIC_DATA as string | undefined)?.toLowerCase();

export const USE_STATIC_DATA = appMode === 'demo' || staticDataFlag === 'true';

export const getDataMode = () => {
  return USE_STATIC_DATA ? 'static' : 'live';
};

export const isStaticDataMode = () => USE_STATIC_DATA;
