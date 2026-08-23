ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS enable_image_zoom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_food_disclaimer boolean NOT NULL DEFAULT false;