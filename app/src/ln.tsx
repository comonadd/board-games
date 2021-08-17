import React, { useEffect, useState, useContext, createContext } from "react";

interface LocaleModule {
  s: Record<string, string>;
  fmt: Record<string, (...args: any[]) => string>;
}
interface ILContext {
  localeModule: LocaleModule;
}
const LContext = createContext<ILContext>({ localeModule: null });

export const t = (k: string) => {
  const { localeModule } = useContext(LContext);
  const s = localeModule["s"][k] ?? null;
  if (s === null) {
    console.error(`Couldn't find locale string '${k}'`);
    return "N/A";
  }
  return s;
};

export const tfmt = (k: string, ...args: any[]) => {
  const { localeModule } = useContext(LContext);
  const f = localeModule["fmt"][k] ?? null;
  if (f === null) {
    console.error(`Couldn't find formatted locale string '${k}'`);
    return "N/A";
  }
  let i = 0;
  let res = "";
  let argIdx = 0;
  let startIdx = 0;
  while (i < f.length) {
    const ch = f[i];
    if (ch === "\\") {
      // skip current and next characters (this way we avoid interpreting \{ as a formatting slot
      i += 2;
    } else if (ch === "{") {
      if (argIdx >= args.length) {
        console.error(
          `Mismatch trying to format locale string "${k}": expected ${slotsFound} arguments, but only ${args.length} given.`,
        );
        return "N/A";
      }
      // copy the accumulated string before
      const endIdx = i;
      if (startIdx !== endIdx) {
        res += f.substring(startIdx, endIdx);
      }
      // This is a formatting slot.
      // Skip until we meet the closing bracket
      while (i < f.length && f[i] !== "}") ++i;
      if (f[i] !== "}") {
        console.error(`No matching bracket found while formatting locale fmt string '${f}'`);
        return "N/A";
      }
      // Eat the closing bracket
      ++i;
      if (args[argIdx] !== null && args[argIdx] !== undefined && args[argIdx] !== false) {
        res += args[argIdx];
      }
      ++argIdx;
      startIdx = i;
    } else {
      ++i;
    }
  }
  res += f.substring(startIdx, f.length);
  return res;
};

const getBrowserLanguage = () => navigator.language;

export const Localizator = (props: { children: React.Element; lang?: string }) => {
  const [localeModule, setLocaleModule] = useState<LocaleModule | null>(null);
  const [lang, setLang] = useState<string>(props.lang ?? getBrowserLanguage());
  useEffect(() => {
    (async () => {
      const lg = lang.split("-")[0];
      console.info(`Loading language "${lg}"`);
      try {
        const m = await import(`./locales/${lg}.json`);
        setLocaleModule(m.default as any);
      } catch (err) {
        if (lang !== "en-US") {
          console.warn(`Failed to fetch language "${lg}". Defaulting to "en".`);
          setLang("en");
        } else {
          console.error("Failed to fetch locale JSON");
        }
      }
    })();
  }, [lang]);
  if (localeModule === null) return null;
  return (
    <LContext.Provider value={{ localeModule: localeModule! }}>{props.children}</LContext.Provider>
  );
};
