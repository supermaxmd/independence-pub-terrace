ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_en text NOT NULL DEFAULT '';
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS name_en text NOT NULL DEFAULT '';
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS name_en text NOT NULL DEFAULT '';
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.item_variants ADD COLUMN IF NOT EXISTS label_en text NOT NULL DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS kicker_en text NOT NULL DEFAULT 'Chișinău';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tagline_en text NOT NULL DEFAULT 'Pub · kitchen · draft beer';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS footer_en text NOT NULL DEFAULT '';