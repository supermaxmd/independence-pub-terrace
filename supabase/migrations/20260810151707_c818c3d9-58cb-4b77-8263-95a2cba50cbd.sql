
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ru text NOT NULL,
  name_ro text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name_ru text NOT NULL,
  name_ro text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subcategories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subcategories public read" ON public.subcategories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "subcategories admin write" ON public.subcategories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_subcategories_updated BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL,
  name_ru text NOT NULL,
  name_ro text NOT NULL,
  description_ru text,
  description_ro text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_items public read" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "menu_items admin write" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  label_ru text NOT NULL DEFAULT '',
  label_ro text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.item_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_variants TO authenticated;
GRANT ALL ON public.item_variants TO service_role;
ALTER TABLE public.item_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_variants public read" ON public.item_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "item_variants admin write" ON public.item_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_item_variants_updated BEFORE UPDATE ON public.item_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "menu images public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'menu');
CREATE POLICY "menu images admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "menu images admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'menu' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "menu images admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'menu' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (slug, name_ru, name_ro, sort_order) VALUES
 ('alcohol','Алкоголь','Alcool',10),
 ('cocktails','Коктейли','Cocktailuri',20),
 ('soft-drinks','Безалкогольные напитки','Băuturi răcoritoare',30),
 ('beer-snacks','Закуски к пиву','Gustări la bere',40),
 ('main-dishes','Основные блюда','Feluri principale',50),
 ('sharing','Блюда для компании','Platouri pentru companie',60),
 ('soups','Первые блюда','Supe',70),
 ('burgers','Бургеры','Burgeri',80),
 ('sides','Гарниры','Garnituri',90),
 ('cold-starters','Холодные закуски','Gustări reci',100),
 ('salads','Салаты','Salate',110),
 ('coffee-tea','Кофе и чай','Cafea și ceai',120),
 ('desserts','Десерты','Deserturi',130);

INSERT INTO public.subcategories (category_id, name_ru, name_ro, sort_order)
SELECT id, 'Пиво разливное', 'Bere draft', 10 FROM public.categories WHERE slug = 'alcohol';
INSERT INTO public.subcategories (category_id, name_ru, name_ro, sort_order)
SELECT id, 'Крепкий алкоголь', 'Băuturi tari', 20 FROM public.categories WHERE slug = 'alcohol';

INSERT INTO public.menu_items (category_id, subcategory_id, name_ru, name_ro, description_ru, description_ro, sort_order)
SELECT c.id, s.id, 'Пиво светлое', 'Bere blondă', 'Разливное светлое пиво, свежая бочка', 'Bere blondă draft, butoi proaspăt', 10
FROM public.categories c JOIN public.subcategories s ON s.category_id = c.id AND s.name_ru = 'Пиво разливное'
WHERE c.slug = 'alcohol';

INSERT INTO public.item_variants (item_id, label_ru, label_ro, price, sort_order)
SELECT id, '0.5 л', '0.5 l', 55, 10 FROM public.menu_items WHERE name_ru = 'Пиво светлое';
INSERT INTO public.item_variants (item_id, label_ru, label_ro, price, sort_order)
SELECT id, '0.3 л', '0.3 l', 38, 20 FROM public.menu_items WHERE name_ru = 'Пиво светлое';

INSERT INTO public.menu_items (category_id, name_ru, name_ro, description_ru, description_ro, sort_order)
SELECT id, 'Классический бургер', 'Burger clasic', 'Говяжья котлета, чеддер, соус паба, картофель фри', 'Chiftea de vită, cheddar, sos de pub, cartofi prăjiți', 10
FROM public.categories WHERE slug = 'burgers';
INSERT INTO public.item_variants (item_id, label_ru, label_ro, price, sort_order)
SELECT id, '', '', 145, 10 FROM public.menu_items WHERE name_ru = 'Классический бургер';

INSERT INTO public.menu_items (category_id, name_ru, name_ro, description_ru, description_ro, sort_order)
SELECT id, 'Мясная доска', 'Platou de carne', 'Рёбра, колбаски, крылья, соусы — на компанию', 'Coaste, cârnați, aripioare, sosuri — pentru companie', 10
FROM public.categories WHERE slug = 'sharing';
INSERT INTO public.item_variants (item_id, label_ru, label_ro, price, sort_order)
SELECT id, 'на 2–3 персоны', 'pentru 2–3 persoane', 490, 10 FROM public.menu_items WHERE name_ru = 'Мясная доска';
