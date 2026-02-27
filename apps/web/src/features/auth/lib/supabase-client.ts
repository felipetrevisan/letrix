import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;
export const LETRIX_SCHEMA = "letrix";

const getSupabaseConfig = () => {
  const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (projectId ? `https://${projectId}.supabase.co` : undefined);
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey };
};

export const isSupabaseConfigured = () => {
  return !!getSupabaseConfig();
};

export const getSupabaseBrowserClient = () => {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return browserClient;
};

export const getLetrixBrowserClient = () => {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  return (supabase as any).schema(LETRIX_SCHEMA);
};
