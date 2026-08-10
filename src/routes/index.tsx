import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Lock } from "lucide-react";

import { getMenu, type MenuCategory, type MenuItem } from "@/lib/menu.functions";
import { getSiteSettings, type SiteSettings } from "@/lib/site.functions";
import { useLang, pick, formatPrice, type Lang } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
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
  const hay = [item.name_ru, item.name_ro, item.description_ru, item.description_ro]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function ItemRow({ item, lang }: { item: MenuItem; lang: Lang }) {
  const name = pick(lang, item.name_ru, item.name_ro);
  const description = pick(lang, item.description_ru, item.description_ro);

  return (
    <li
      className={`flex gap-4 border-b border-border/60 py-4 last:border-b-0 ${
        item.is_available ? "" : "opacity-50"
      }`}
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={name}
          loading="lazy"
          width={88}
          height={88}
          className="h-[88px] w-[88px] shrink-0 rounded-md border border-border object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg leading-tight text-foreground">{name}</h3>
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
                <span className="text-muted-foreground">{pick(lang, v.label_ru, v.label_ro)}</span>{" "}
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
}: {
  category: MenuCategory;
  lang: Lang;
  query: string;
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
    <section id={category.slug} className="scroll-mt-28 py-10">
      <div className="flex items-center gap-4">
        <h2 className="text-display text-3xl text-primary sm:text-4xl">
          {pick(lang, category.name_ru, category.name_ro)}
        </h2>
        <span className="rule-gold h-px flex-1" />
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {lang === "ru" ? "В этом разделе пока пусто" : "Această secțiune este goală"}
        </p>
      ) : null}

      {ungrouped.length > 0 ? (
        <ul className="mt-4">
          {ungrouped.map((i) => (
            <ItemRow key={i.id} item={i} lang={lang} />
          ))}
        </ul>
      ) : null}

      {grouped.map((g) => (
        <div key={g.sub.id} className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {pick(lang, g.sub.name_ru, g.sub.name_ro)}
          </h3>
          <ul className="mt-2">
            {g.items.map((i) => (
              <ItemRow key={i.id} item={i} lang={lang} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function MenuPage() {
  const { categories, settings } = Route.useLoaderData() as {
    categories: MenuCategory[];
    settings: SiteSettings;
  };
  const { lang, setLang, t } = useLang();
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => categories.filter((c) => !query || c.items.some((i) => matches(i, query))),
    [categories, query],
  );

  const fontVars = {
    "--font-display": `"${settings.font_display}", sans-serif`,
    "--font-sans": `"${settings.font_body}", ui-sans-serif, system-ui, sans-serif`,
    fontFamily: `"${settings.font_body}", ui-sans-serif, system-ui, sans-serif`,
  } as React.CSSProperties;

  const footerText = pick(lang, settings.footer_ru, settings.footer_ro);

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
            {pick(lang, settings.kicker_ru, settings.kicker_ro)}
          </span>
          <h1 className="text-display mt-3 text-4xl leading-[1.05] text-foreground min-[420px]:text-5xl sm:text-8xl">
            {settings.brand_title}
          </h1>
          <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
            {pick(lang, settings.tagline_ru, settings.tagline_ro) || t("tagline")}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-border">
              {(["ru", "ro"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-4 py-2 text-sm font-semibold uppercase transition-colors ${
                    lang === l
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {l === "ru" ? "Рус" : "Rom"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-20 border-y border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-5 sm:py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#${c.slug}`}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {pick(lang, c.name_ru, c.name_ro)}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 sm:px-5">
        {settings.show_search ? (
          <div className="relative mt-6 sm:mt-8">
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
            <CategorySection key={c.id} category={c} lang={lang} query={query} />
          ))
        )}
      </div>

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
