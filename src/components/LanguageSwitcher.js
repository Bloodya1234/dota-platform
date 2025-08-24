'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n.client'; // ✅ Only runs on the client

export default function LanguageSwitcher() {
  const { i18n: i18nInstance } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng); // ✅ This must come from your i18n.ts export
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 rounded text-sm font-semibold ${
          i18nInstance.language === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-300 text-black'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('ru')}
        className={`px-3 py-1 rounded text-sm font-semibold ${
          i18nInstance.language === 'ru'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-300 text-black'
        }`}
      >
        RU
      </button>
    </div>
  );
}
