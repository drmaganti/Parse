import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || anon;

const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

export const supabasePublic = createClient(url, anon, options);
export const supabaseServer = createClient(url, service, options);
