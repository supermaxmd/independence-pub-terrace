import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type MenuVariant = {
  id: string;
  item_id: string;
  label_ru: string;
  label_ro: string;
  price: number;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name_ru: string;
  name_ro: string;
  description_ru: string | null;
  description_ro: string | null;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
  variants: MenuVariant[];
};

export type MenuSubcategory = {
  id: string;
  category_id: string;
  name_ru: string;
  name_ro: string;
  sort_order: number;
};

export type MenuCategory = {
  id: string;
  slug: string;
  name_ru: string;
  name_ro: string;
  sort_order: number;
  subcategories: MenuSubcategory[];
  items: MenuItem[];
};

export const getMenu = createServerFn({ method: "GET" }).handler(async (): Promise<MenuCategory[]> => {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const [cats, subs, items, variants] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name_ru, name_ro, sort_order")
      .eq("is_visible", true)
      .order("sort_order"),
    supabase
      .from("subcategories")
      .select("id, category_id, name_ru, name_ro, sort_order")
      .eq("is_visible", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, category_id, subcategory_id, name_ru, name_ro, description_ru, description_ro, image_url, sort_order, is_available",
      )
      .order("sort_order"),
    supabase
      .from("item_variants")
      .select("id, item_id, label_ru, label_ro, price, sort_order")
      .order("sort_order"),
  ]);

  const rawItems = items.data ?? [];

  const storagePaths = rawItems
    .map((i) => i.image_url)
    .filter((u): u is string => !!u && !u.startsWith("http"));

  const signed = new Map<string, string>();
  if (storagePaths.length > 0) {
    const { data } = await supabase.storage.from("menu").createSignedUrls(storagePaths, 60 * 60 * 6);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
    }
  }

  const variantsByItem = new Map<string, MenuVariant[]>();
  for (const v of variants.data ?? []) {
    const list = variantsByItem.get(v.item_id) ?? [];
    list.push({ ...v, price: Number(v.price) });
    variantsByItem.set(v.item_id, list);
  }

  return (cats.data ?? []).map((c) => ({
    ...c,
    subcategories: (subs.data ?? []).filter((s) => s.category_id === c.id),
    items: rawItems
      .filter((i) => i.category_id === c.id)
      .map((i) => ({
        ...i,
        image_url: i.image_url
          ? i.image_url.startsWith("http")
            ? i.image_url
            : (signed.get(i.image_url) ?? null)
          : null,
        variants: variantsByItem.get(i.id) ?? [],
      })),
  }));
});
