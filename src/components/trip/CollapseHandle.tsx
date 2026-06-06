interface Props {
  collapsed: boolean
  onToggle: () => void
}

export default function CollapseHandle({ collapsed, onToggle }: Props) {
  return (
    <div className="relative z-10 flex items-center" style={{ marginLeft: -10, marginRight: -10 }}>
      <button
        onClick={onToggle}
        className="absolute top-1/2 -translate-y-1/2 w-5 h-9 bg-slate-700 border border-slate-600 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-600 flex items-center justify-center text-xs transition-colors"
        aria-label={collapsed ? 'Expand history' : 'Collapse history'}
      >
        {collapsed ? '‹' : '›'}
      </button>
    </div>
  )
}
