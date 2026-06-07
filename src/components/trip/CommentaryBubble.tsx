interface Props { text: string; onDismiss: () => void }

export default function CommentaryBubble({ text, onDismiss }: Props) {
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 mb-2 text-sm text-slate-200 leading-relaxed relative">
      <button onClick={onDismiss} className="absolute top-2 right-3 text-slate-500 hover:text-slate-300 text-xs">✕</button>
      <p className="italic">{text}</p>
    </div>
  )
}
