import { createClient } from "@supabase/supabase-js";

// Browser client. Uses the anon key and carries the signed-in user's session,
// so Row Level Security scopes saved_screens to their owner automatically.
// Reads of the public `stocks` cache are allowed for everyone by policy.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
