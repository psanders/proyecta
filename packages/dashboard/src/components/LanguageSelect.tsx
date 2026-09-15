/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { LANGUAGES, isLanguage, languageNames, type Language } from "../lib/i18n.js";
import { cn } from "../lib/cn.js";
import { control } from "./ui/Field.js";
import { Icon } from "./ui/Icon.js";

/** Pencil profile › Preferencias Card › Idioma Row: languages listed by their own names. */
export function LanguageSelect({
  value,
  onChange,
  labelId,
  hintId
}: {
  value: Language;
  onChange: (language: Language) => void;
  labelId: string;
  hintId: string;
}) {
  return (
    <div className="relative w-[220px]">
      <select
        aria-labelledby={labelId}
        aria-describedby={hintId}
        value={value}
        onChange={(e) => isLanguage(e.target.value) && onChange(e.target.value)}
        className={cn(control, "appearance-none pr-10")}
      >
        {LANGUAGES.map((language) => (
          <option key={language} value={language} lang={language}>
            {languageNames[language]}
          </option>
        ))}
      </select>
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute top-2.5 right-4 size-5 text-muted-foreground"
      />
    </div>
  );
}
