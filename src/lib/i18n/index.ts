import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';

const savedLang = typeof window !== 'undefined'
  ? localStorage.getItem('inspectamx_lang') || 'es'
  : 'es';

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

export function toggleLanguage(): void {
  const newLang = i18n.language === 'es' ? 'en' : 'es';
  i18n.changeLanguage(newLang);
  localStorage.setItem('inspectamx_lang', newLang);
}

export default i18n;
