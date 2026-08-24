import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Lock, ChevronDown } from "lucide-react";


import { getMenu, type MenuCategory, type MenuItem } from "@/lib/menu.functions";
import { getSiteSettings, type SiteSettings } from "@/lib/site.functions";
import { useLang, pick, formatPrice, type Lang } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import heroImage from "@/assets/pub-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Independence Pub — меню паба / meniul pub-ului" },
      {
        name: "description",
        content:
          "Меню Independence Pub: пиво, коктейли, бургеры, закуски и десерты. Meniul Independence Pub în română și rusă.",
      },
      { property: "og:title", content: "Independence Pub — меню / meniu" },
      {
        property: "og:description",
        content: "Разливное пиво, коктейли, кухня. Bere draft, cocktailuri, bucătărie.",
      },
    ],
  }),
  loader: async () => {
    const [categories, settings] = await Promise.all([getMenu(), getSiteSettings()]);
    return { categories, settings };
  },
  component: MenuPage,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">
      Меню временно недоступно / Meniul este indisponibil
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">
      Меню пустое / Meniul este gol
    </div>
  ),
});

function matches(item: MenuItem, q: string) {
  if (!q) return true;
  const hay = [
    item.name_ru,
    item.name_ro,
    item.name_en,
    item.description_ru,
    item.description_ro,
    item.description_en,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

const DISCLAIMER: Record<Lang, string> = {
  ru: "Изображения блюд могут отличаться от реальной подачи и приведены в ознакомительных целях.",
  ro: "Imaginile preparatelor pot diferi de prezentarea reală și sunt afișate cu titlu informativ.",
  en: "Dish images may differ from the actual serving and are shown for illustrative purposes only.",
};

function ItemRow({
  item,
  lang,
  zoomable,
  onZoom,
}: {
  item: MenuItem;
  lang: Lang;
  zoomable: boolean;
  onZoom: (item: MenuItem) => void;
}) {
  const name = pick(lang, item.name_ru, item.name_ro, item.name_en);
  const description = pick(lang, item.description_ru, item.description_ro, item.description_en);

  return (
    <li
      className={`flex gap-3 border-b border-border/60 py-3.5 last:border-b-0 sm:gap-4 sm:py-4 ${
        item.is_available ? "" : "opacity-50"
      }`}
    >
      {item.image_url ? (
        zoomable ? (
          <button
            type="button"
            onClick={() => onZoom(item)}
            aria-label={name}
            className="shrink-0 cursor-zoom-in"
          >
            <img
              src={item.image_url}
              alt={name}
              loading="lazy"
              width={88}
              height={88}
              className="h-16 w-16 object-contain sm:h-[88px] sm:w-[88px]"
            />
          </button>
        ) : (
          <img
            src={item.image_url}
            alt={name}
            loading="lazy"
            width={88}
            height={88}
            className="h-16 w-16 shrink-0 rounded-md object-contain sm:h-[88px] sm:w-[88px]"
          />
        )
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 text-base leading-tight text-foreground sm:text-lg">{name}</h3>
          {item.variants.length === 1 && !item.variants[0]!.label_ru && !item.variants[0]!.label_ro ? (
            <span className="shrink-0 text-sm font-semibold text-primary">
              {formatPrice(item.variants[0]!.price, lang)}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
        ) : null}
        {item.variants.length > 0 &&
        !(item.variants.length === 1 && !item.variants[0]!.label_ru && !item.variants[0]!.label_ro) ? (
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {item.variants.map((v) => (
              <li key={v.id} className="text-sm">
                <span className="text-muted-foreground">
                  {pick(lang, v.label_ru, v.label_ro, v.label_en)}
                </span>
                <span className="mx-1.5 text-muted-foreground/60">—</span>
                <span className="font-semibold text-primary">{formatPrice(v.price, lang)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function CategorySection({
  category,
  lang,
  query,
  isOpen,
  onToggle,
  onZoom,
}: {
  category: MenuCategory;
  lang: Lang;
  query: string;
  isOpen: boolean;
  onToggle: (slug: string, open: boolean) => void;
  onZoom: (item: MenuItem) => void;
}) {
  const items = category.items.filter((i) => matches(i, query));
  if (query && items.length === 0) return null;

  const grouped = category.subcategories
    .map((s) => ({ sub: s, items: items.filter((i) => i.subcategory_id === s.id) }))
    .filter((g) => g.items.length > 0);
  const ungrouped = items.filter(
    (i) => !i.subcategory_id || !category.subcategories.some((s) => s.id === i.subcategory_id),
  );

  return (
    <details
      id={category.slug}
      open={isOpen}
      onToggle={(e) => onToggle(category.slug, e.currentTarget.open)}
      className="group scroll-mt-20 rounded-lg border border-border/60 bg-card/20 sm:scroll-mt-28"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-display min-w-0 text-2xl text-primary sm:text-4xl">
            {pick(lang, category.name_ru, category.name_ro, category.name_en)}
          </h2>
          <span className="rule-gold h-px w-12 sm:w-20" />
        </div>
        <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          {items.length}
          <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="px-4 pb-5 sm:px-5 sm:pb-6">
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "ru" ? "В этом разделе пока пусто" : "Această secțiune este goală"}
          </p>
        ) : null}

        {ungrouped.length > 0 ? (
          <ul className="mt-2">
            {ungrouped.map((i) => (
              <ItemRow
                key={i.id}
                item={i}
                lang={lang}
                zoomable={category.enable_image_zoom}
                onZoom={onZoom}
              />
            ))}
          </ul>
        ) : null}

        {grouped.map((g) => (
          <details
            key={g.sub.id}
            open={!!query}
            className="group/sub mt-3 rounded-md border border-border/60 bg-card/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 truncate text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {pick(lang, g.sub.name_ru, g.sub.name_ro, g.sub.name_en)}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {g.items.length}
                <ChevronDown className="h-4 w-4 transition-transform group-open/sub:rotate-180" />
              </span>
            </summary>
            <ul className="px-3 pb-2">
              {g.items.map((i) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  lang={lang}
                  zoomable={category.enable_image_zoom}
                  onZoom={onZoom}
                />
              ))}
            </ul>
          </details>
        ))}

        {category.show_food_disclaimer ? (
          <p className="mt-4 text-xs italic leading-snug text-muted-foreground/80">
            {DISCLAIMER[lang]}
          </p>
        ) : null}
      </div>
    </details>
  );
}


function MenuPage() {
  const { categories, settings } = Route.useLoaderData() as {
    categories: MenuCategory[];
    settings: SiteSettings;
  };
  const { lang, setLang, t } = useLang();
  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [zoomItem, setZoomItem] = useState<{ item: MenuItem; disclaimer: boolean } | null>(null);

  const openZoom = (category: MenuCategory) => (item: MenuItem) =>
    setZoomItem({ item, disclaimer: category.show_food_disclaimer });

  const visible = useMemo(
    () => categories.filter((c) => !query || c.items.some((i) => matches(i, query))),
    [categories, query],
  );

  useEffect(() => {
    const handleHash = () => {
      const slug = window.location.hash.replace("#", "");
      if (slug) {
        setOpenCategories((prev) => {
          if (prev.has(slug)) return prev;
          const next = new Set(prev);
          next.add(slug);
          return next;
        });
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    if (query) {
      setOpenCategories(new Set(visible.map((c) => c.slug)));
    }
  }, [query, visible]);

  const handleToggle = (slug: string, open: boolean) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (open) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const fontVars = {
    "--font-display": `"${settings.font_display}", sans-serif`,
    "--font-sans": `"${settings.font_body}", ui-sans-serif, system-ui, sans-serif`,
    fontFamily: `"${settings.font_body}", ui-sans-serif, system-ui, sans-serif`,
  } as React.CSSProperties;

  const footerText = pick(lang, settings.footer_ru, settings.footer_ro, settings.footer_en);

  return (
    <main className="min-h-screen bg-background" style={fontVars}>
      <header className="relative isolate overflow-hidden">
        {settings.show_hero_image ? (
          <>
            <img
              src={heroImage}
              alt={settings.brand_title}
              width={1920}
              height={1080}
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/80 to-background" />
          </>
        ) : null}
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-5 sm:py-28">
          <span className="text-[10px] uppercase tracking-[0.35em] text-primary sm:text-xs sm:tracking-[0.45em]">
            {pick(lang, settings.kicker_ru, settings.kicker_ro, settings.kicker_en)}
          </span>
          <h1 className="text-display mt-3 text-4xl leading-[1.05] text-foreground min-[420px]:text-5xl sm:text-8xl">
            {settings.brand_title}
          </h1>
          <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
            {pick(lang, settings.tagline_ru, settings.tagline_ro, settings.tagline_en) || t("tagline")}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-border">
              {(["ru", "ro", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-4 py-2 text-sm font-semibold uppercase transition-colors ${
                    lang === l
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {l === "ru" ? "Рус" : l === "ro" ? "Rom" : "Eng"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-20 border-y border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-1.5 px-3 py-2 sm:gap-2 sm:px-5 sm:py-3">
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#${c.slug}`}
              onClick={() => {
                setOpenCategories((prev) => {
                  if (prev.has(c.slug)) return prev;
                  const next = new Set(prev);
                  next.add(c.slug);
                  return next;
                });
              }}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium leading-tight text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {pick(lang, c.name_ru, c.name_ro, c.name_en)}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:space-y-6 sm:px-5 sm:py-8">
        {settings.show_search ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="pl-9"
            />
          </div>
        ) : null}

        {visible.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{t("nothingFound")}</p>
        ) : (
          visible.map((c) => (
            <CategorySection
              key={c.id}
              category={c}
              lang={lang}
              query={query}
              isOpen={openCategories.has(c.slug)}
              onToggle={handleToggle}
              onZoom={openZoom(c)}
            />
          ))
        )}
      </div>

      <ItemZoomDialog
        item={zoomItem?.item ?? null}
        lang={lang}
        disclaimer={!!zoomItem?.disclaimer}
        open={!!zoomItem}
        onOpenChange={(o) => !o && setZoomItem(null)}
        style={fontVars}
      />


      <footer className="mt-10 border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:px-5">
          <span className="min-w-0">
            © {new Date().getFullYear()} {settings.brand_title}
            {footerText ? ` · ${footerText}` : ""}
          </span>
          <Link to="/admin" className="inline-flex shrink-0 items-center gap-1.5 hover:text-primary">
            <Lock className="h-3 w-3" />
            {t("admin")}
          </Link>
        </div>
      </footer>
    </main>
  );
}

