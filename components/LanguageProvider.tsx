"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANG, LANGUAGES, detectLang, isLang, translate, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "roster-lang";

type Vars = Record<string, string | number>;

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (text: string, vars?: Vars) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (text, vars) => translate(DEFAULT_LANG, text, vars)
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Start in English so server and client markup match, then switch to the saved or browser language.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    setLangState(isLang(saved) ? saved : detectLang(navigator.languages?.length ? navigator.languages : [navigator.language]));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the choice just won't persist.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t: (text, vars) => translate(lang, text, vars) }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSelect() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="language-select">
      <label>
        <span>{t("Language")}</span>
        <select value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
