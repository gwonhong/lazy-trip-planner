interface Props {
  onPointerDown: (e: React.PointerEvent) => void
}

export default function ResizeDivider({ onPointerDown }: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="w-[5px] flex-shrink-0 cursor-col-resize bg-slate-800 hover:bg-indigo-500/40 transition-colors"
      onPointerDown={onPointerDown}
    />
  )
}
