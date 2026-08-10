CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'default',
  brand_title text NOT NULL DEFAULT 'Independence Pub',
  kicker_ru text NOT NULL DEFAULT 'Chișinău',
  kicker_ro text NOT NULL DEFAULT 'Chișinău',
  tagline_ru text NOT NULL DEFAULT 'Паб · кухня · разливное пиво',
  tagline_ro text NOT NULL DEFAULT 'Pub · bucătărie · bere draft',
  footer_ru text NOT NULL DEFAULT '',
  footer_ro text NOT NULL DEFAULT '',
  font_display text NOT NULL DEFAULT 'Bebas Neue',
  font_body text NOT NULL DEFAULT 'Manrope',
  show_hero_image boolean NOT NULL DEFAULT true,
  show_search boolean NOT NULL DEFAULT true,
  public_url text NOT NULL DEFAULT 'https://independence-pub.lovable.app/',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings public read" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "site_settings admin write" ON public.site_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (id) VALUES ('default');