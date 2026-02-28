import { createClient } from "@supabase/supabase-js";
import { LETRIX_SCHEMA } from "@/features/auth/lib/supabase-client";

const getSupabaseServerConfig = () => {
  const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (projectId ? `https://${projectId}.supabase.co` : undefined);
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return { supabaseUrl, supabaseServiceRoleKey };
};

export const getSupabaseServerClient = () => {
  const config = getSupabaseServerConfig();

  if (!config) {
    return null;
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const getLetrixServerClient = () => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  return (supabase as any).schema(LETRIX_SCHEMA);
};
