// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  console.warn('Supabase env vars are missing – running in static demo mode');
}

// Only create the real client when env vars are present; otherwise export a
// no-op proxy that safely swallows all method chains without crashing.
// This ensures supabase.from(...).select(...), supabase.channel(...),
// supabase.auth.*, supabase.functions.invoke(...), etc. all silently no-op.
function createNoopProxy(): any {
  const noopResult = { data: null, error: null, count: null };
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      // Promise-like: allow await to resolve to { data: null, error: null }
      if (prop === 'then') {
        return (resolve: (v: any) => any) => resolve(noopResult);
      }
      // subscribe() returns a subscription-like object with unsubscribe
      if (prop === 'subscribe') {
        return () => ({ unsubscribe: () => {} });
      }
      // Any other property access returns another proxy to allow chaining
      return new Proxy(function () {}, handler);
    },
    apply() {
      // Any function call returns another proxy to allow chaining
      return new Proxy(function () {}, handler);
    },
  };
  return new Proxy(function () {}, handler);
}

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createNoopProxy() as unknown as SupabaseClient);
