import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
};

/**
 * Grants the admin role to the caller only when no admin exists yet.
 * Runs server-side with elevated privileges after verifying the session.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (existingError) throw new Error("Unable to verify administrators");
    if ((existing ?? []).length > 0) return false;

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("Unable to assign administrator role");

    return true;
  });

/** Returns whether the authenticated caller is an administrator. */
export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) return false;
    return data === true;
  });

/** Lists all accounts with their admin flag. Admins only. */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error("Unable to load users");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));

    return list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "—",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      is_admin: adminIds.has(u.id),
    }));
  });

/** Creates a new account. Admins only. */
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; isAdmin: boolean }) => {
    if (
      !input ||
      typeof input.email !== "string" ||
      typeof input.password !== "string" ||
      typeof input.isAdmin !== "boolean"
    ) {
      throw new Error("Invalid input");
    }
    const email = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Некорректный email");
    if (input.password.length < 8) throw new Error("Пароль должен быть не короче 8 символов");
    return { email, password: input.password, isAdmin: input.isAdmin };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Не удалось создать пользователя");

    if (data.isAdmin) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: created.user.id, role: "admin" }, { onConflict: "user_id,role" });
      if (roleError) throw new Error("Пользователь создан, но роль не назначена");
    }

    return { ok: true };
  });

/** Grants or revokes the admin role for a user. Admins only. */
export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; isAdmin: boolean }) => {
    if (!input || typeof input.userId !== "string" || typeof input.isAdmin !== "boolean") {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.isAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error("Unable to grant administrator role");
      return { ok: true };
    }

    const { data: admins, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (countError) throw new Error("Unable to verify administrators");
    if ((admins ?? []).length <= 1) throw new Error("Нельзя удалить последнего администратора");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error("Unable to revoke administrator role");
    return { ok: true };
  });
