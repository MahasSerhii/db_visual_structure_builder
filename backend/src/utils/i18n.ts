// Language Enum
export type Language = 'en' | 'ua' | 'cz' | 'fr' | 'bg' | 'de' | 'es';

// Translation Dictionary (Lazy loaded or static based on implementation, here static for simplicity)
import { en } from '../locales/en';
import { ua } from '../locales/ua';
import { cz } from '../locales/cz';
import { fr } from '../locales/fr';
import { bg } from '../locales/bg';
import { de } from '../locales/de';
import { es } from '../locales/es';

const translations: Record<Language, Record<string, string>> = {
    en,
    ua,
    cz,
    fr,
    bg,
    de,
    es
};

import { Request } from 'express';

export const getLanguageFromRequest = (req: Request): string => {
    const header = req.headers['accept-language'];
    if (!header) return 'en';
    
    const headerStr = Array.isArray(header) ? header[0] : header;
    
    // Split key-values "en-US,en;q=0.9" -> ["en-US", "en"] -> ["en", "en"]
    const languages = headerStr.split(',').map((lang: string) => lang.split(';')[0].trim().substring(0, 2).toLowerCase());
    
    // Find first supported language
    for (const rawLang of languages) {
        let lang = rawLang;
        // Map browser codes to project internal codes
        if (lang === 'uk') lang = 'ua';
        if (lang === 'cs') lang = 'cz';

        if (translations[lang as Language]) {
            console.log(`[i18n] Detected lang '${lang}' from header '${header}'`);
            return lang;
        }
    }
    
    console.log(`[i18n] Fallback to 'en' from header '${header}'`);
    return 'en';
};

export const t = (lang: string | undefined, key: string, params: Record<string, string | number> = {}): string => {
    const safeLang = (lang && translations[lang as Language]) ? (lang as Language) : 'en';
    const dict = translations[safeLang] || translations['en'];
    
    let text = dict[key] || '';
    
    // If not found in requested language, try English
    if (!text && safeLang !== 'en') {
        text = translations['en'][key] || key;
    }
    
    // If still not found, return the key
    if (!text) return key;

    // Interpolation {param}
    return text.replace(/{(\w+)}/g, (_, k) => {
        return params[k] !== undefined ? String(params[k]) : `{${k}}`;
    });
};
