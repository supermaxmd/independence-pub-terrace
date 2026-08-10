import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ru" | "ro";

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
} as const;

export type TKey = keyof (typeof dict)["ru"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };

const LangContext = createContext<Ctx>({ lang: "ru", setLang: () => {}, t: (k) => dict.ru[k] });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    const saved = window.localStorage.getItem("pub-lang");
    if (saved === "ru" || saved === "ro") setLangState(saved);
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

export function pick(lang: Lang, ru: string | null, ro: string | null): string {
  return (lang === "ru" ? ru || ro : ro || ru) ?? "";
}

export function formatPrice(price: number, lang: Lang): string {
  const value = Number(price);
  const str = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${str} ${lang === "ru" ? "лей" : "lei"}`;
}
