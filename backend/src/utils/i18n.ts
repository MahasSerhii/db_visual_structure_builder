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
