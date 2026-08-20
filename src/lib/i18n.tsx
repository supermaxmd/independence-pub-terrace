import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ru" | "ro" | "en";

const dict = {
  ru: {
    menu: "Меню",
    tagline: "Паб · кухня · разливное пиво",
    qr: "QR-код",
    qrTitle: "QR-код меню",
    qrHint: "Наведите камеру телефона, чтобы открыть меню",
    download: "Скачать PNG",
    search: "Поиск по меню",
    empty: "В этом разделе пока пусто",
    nothingFound: "Ничего не найдено",
    admin: "Админ-панель",
    signIn: "Войти",
    signOut: "Выйти",
    email: "Email",
    password: "Пароль",
    unavailable: "Нет в наличии",
    all: "Все разделы",
    currency: "лей",
  },
  ro: {
    menu: "Meniu",
    tagline: "Pub · bucătărie · bere draft",
    qr: "Cod QR",
    qrTitle: "Cod QR pentru meniu",
    qrHint: "Scanează cu camera telefonului pentru a deschide meniul",
    download: "Descarcă PNG",
    search: "Caută în meniu",
    empty: "Această secțiune este goală deocamdată",
    nothingFound: "Nimic găsit",
    admin: "Panou de administrare",
    signIn: "Autentificare",
    signOut: "Ieșire",
    email: "Email",
    password: "Parolă",
    unavailable: "Indisponibil",
    all: "Toate secțiunile",
    currency: "lei",
  },
  en: {
    menu: "Menu",
    tagline: "Pub · kitchen · draft beer",
    qr: "QR code",
    qrTitle: "Menu QR code",
    qrHint: "Point your phone camera to open the menu",
    download: "Download PNG",
    search: "Search the menu",
    empty: "This section is empty for now",
    nothingFound: "Nothing found",
    admin: "Admin panel",
    signIn: "Sign in",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    unavailable: "Unavailable",
    all: "All sections",
    currency: "lei",
  },
} as const;

export type TKey = keyof (typeof dict)["ru"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };

const LangContext = createContext<Ctx>({ lang: "ru", setLang: () => {}, t: (k) => dict.ru[k] });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    const saved = window.localStorage.getItem("pub-lang");
    if (saved === "ru" || saved === "ro" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("pub-lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function pick(
  lang: Lang,
  ru: string | null,
  ro: string | null,
  en?: string | null,
): string {
  if (lang === "en") return (en || ru || ro) ?? "";
  if (lang === "ro") return (ro || ru || en) ?? "";
  return (ru || ro || en) ?? "";
}

export function formatPrice(price: number, lang: Lang): string {
  const value = Number(price);
  const str = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${str} ${lang === "ru" ? "лей" : "lei"}`;
}
