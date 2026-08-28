export default function TopBar({ lang, onLangChange }) {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-4 md:max-w-xl md:px-10 md:py-5">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-base font-semibold tracking-[-0.01em] text-fg md:text-lg">
            Saans
          </span>
          <span
            dir="rtl"
            lang="ur"
            className="font-urdu text-sm text-muted md:text-base"
          >
            سانس
          </span>
        </div>

        <div className="flex items-center gap-1">
          <LangButton
            active={lang === 'en'}
            onClick={() => onLangChange('en')}
            label="EN"
          />
          <span aria-hidden="true" className="text-sm text-faint">
            |
          </span>
          <LangButton
            active={lang === 'ur'}
            onClick={() => onLangChange('ur')}
            label="اردو"
            urdu
          />
        </div>
      </div>
    </header>
  )
}

function LangButton({ active, onClick, label, urdu = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-md px-2.5 py-2 text-sm transition-colors duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-teal',
        urdu ? 'font-urdu' : 'font-medium tracking-wide',
        active ? 'text-fg' : 'text-faint hover:text-muted',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
