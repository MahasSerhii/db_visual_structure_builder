import { en } from './en';
import { ua } from './ua';
import { cz } from './cz';
import { fr } from './fr';
import { bg } from './bg';
import { de } from './de';
import { es } from './es';
import { Language, Translation } from '../utils/types';

export const translations: Record<Language, Translation> = {
    en,
    ua,
    cz,
    fr,
    bg,
    de,
    es
};
