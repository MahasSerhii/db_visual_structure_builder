import { translations as localesTranslations } from '../locales';
import { Language, Translation } from './types';

export const translations: Record<Language, Translation> = localesTranslations;

export const getTranslation = (lang: Language, key: string): string => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
};
