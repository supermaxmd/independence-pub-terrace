import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type SiteSettings = {
  brand_title: string;
  kicker_ru: string;
  kicker_ro: string;
  kicker_en: string;
  tagline_ru: string;
  tagline_ro: string;
  tagline_en: string;
  footer_ru: string;
  footer_ro: string;
  footer_en: string;
  font_display: string;
  font_body: string;
  show_hero_image: boolean;
  show_search: boolean;
  public_url: string;
  hero_image_url: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_title: "Independence Pub",
  kicker_ru: "Chișinău",
  kicker_ro: "Chișinău",
  kicker_en: "Chișinău",
  tagline_ru: "Паб · кухня · разливное пиво",
  tagline_ro: "Pub · bucătărie · bere draft",
  tagline_en: "Pub · kitchen · draft beer",
  footer_ru: "",
  footer_ro: "",
  footer_en: "",
  font_display: "Bebas Neue",
  font_body: "Manrope",
  show_hero_image: true,
  show_search: true,
  public_url: "https://independence-pub.lovable.app/",
  hero_image_url: "",
};

export const FONT_OPTIONS = [
  "Bebas Neue",
  "Anton",
  "Oswald",
  "Playfair Display",
  "Cormorant Garamond",
  "Montserrat",
  "Manrope",
  "Inter",
  "Lora",
  "Roboto Slab",
] as const;

export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
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

    const { data } = await supabase.from("site_settings").select("*").eq("id", "default").maybeSingle();
    if (!data) return DEFAULT_SETTINGS;
    const merged = { ...DEFAULT_SETTINGS, ...(data as Partial<SiteSettings>) };

    if (merged.hero_image_url && !merged.hero_image_url.startsWith("http")) {
      const { data: signed } = await supabase.storage
        .from("menu")
        .createSignedUrl(merged.hero_image_url, 60 * 60 * 6);
      merged.hero_image_url = signed?.signedUrl ?? "";
    }

    return merged;
  },
);
