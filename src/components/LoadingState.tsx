export function LoadingState({ label = 'Loading archive…' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="state state--empty">
      <p>{label}</p>
    </div>
  )
}
