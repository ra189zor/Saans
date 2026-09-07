import { useI18n } from '../i18n/index.jsx'

/**
 * "May we keep this recording?" — asked at the moment of capture.
 *
 * Off every time, deliberately. Consent to keeping one cough is not consent to
 * keeping the next one, and a switch that remembers "yes" would quietly turn a
 * single agreement into a standing one.
 *
 * Hidden entirely unless the deployment enables collection, so a clinic that
 * is not collecting never sees a question it cannot act on.
 */
export default function ConsentToggle({ checked, onChange }) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 rounded-xl border border-hairline bg-surface px-5 py-4 text-start transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:px-6"
    >
      <span className="min-w-0">
        <span className="block text-sm leading-snug font-medium text-fg md:text-base">
          {t('consent.label')}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-faint md:text-sm">
          {t('consent.detail')}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-150 ${
          checked ? 'bg-teal' : 'bg-faint'
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full bg-fg transition-transform duration-150 ${
            checked ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}
