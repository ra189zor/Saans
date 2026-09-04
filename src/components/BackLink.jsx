import { useI18n } from '../i18n/index.jsx'

/** Small uppercase back control, shared by the triage and age-gate headers. */
export default function BackLink({ onClick, label }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ms-2 flex min-h-11 w-fit items-center gap-1.5 rounded-md px-2 text-xs font-medium tracking-[0.12em] text-faint uppercase transition-colors duration-150 outline-none hover:text-muted focus-visible:ring-2 focus-visible:ring-teal"
    >
      <svg
        className="rtl-flip h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label ?? t('common.back')}
    </button>
  )
}
