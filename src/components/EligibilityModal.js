function EligibilityModal({ show, onClose }) {
  const { t } = useTranslation('common'); // ✅ Hook belongs here

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-[#121824] border border-accent text-primary rounded-xl p-6 w-full max-w-lg shadow-neon transition-all duration-300">
        <h2 className="text-xl font-bold mb-4 text-accent text-center">
          {t('eligibility.title')}
        </h2>

        <p className="mb-3 text-sm text-white/90">{t('eligibility.subtitle')}</p>

        <ul className="list-disc list-inside mb-4 space-y-1 text-sm text-white/80">
          <li>{t('eligibility.req_1')}</li>
          <li>{t('eligibility.req_2')}</li>
          <li>{t('eligibility.req_3')}</li>
        </ul>

        <p className="font-semibold mb-2 text-white">{t('eligibility.how_title')}</p>

        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 mb-6">
          <li>{t('eligibility.step_1')}</li>
          <li>{t('eligibility.step_2')}</li>
          <li>{t('eligibility.step_3')}</li>
          <li>{t('eligibility.step_4')}</li>
          <li>{t('eligibility.step_5')}</li>
        </ol>

        <div className="text-right">
          <button
            className="glow-button glow-orange px-4 py-2 font-semibold"
            onClick={onClose}
          >
            {t('eligibility.got_it')}
          </button>
        </div>
      </div>
    </div>
  );
}
