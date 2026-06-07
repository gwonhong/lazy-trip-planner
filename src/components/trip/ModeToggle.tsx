type Mode = 'search' | 'plan'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex bg-slate-800 rounded-full p-0.5 text-xs">
      {(['search', 'plan'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1 rounded-full font-medium transition-colors ${
            mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {m === 'search' ? '🔍 Search' : '✨ Plan'}
        </button>
      ))}
    </div>
  )
}
