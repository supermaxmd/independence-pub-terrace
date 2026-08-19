import type { SupabaseClient } from "@supabase/supabase-js";

/** Throws unless the calling user has the admin role. */
export async function assertAdmin(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Unable to verify administrator role");
  if (data !== true) throw new Error("Forbidden");
}
