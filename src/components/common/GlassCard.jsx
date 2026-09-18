export function GlassCard({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag className={`glass-card rounded-[24px] ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function StatCard({ label, value, hint, icon: Icon, gold }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/55">{label}</p>
          <p className={`mt-2 font-numeric text-3xl font-semibold ${gold ? 'gold-text' : 'text-white'}`}>{value}</p>
          {hint ? <p className="mt-2 text-xs text-white/40">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/6 text-[#00D4FF]">
            <Icon size={20} />
          </span>
        ) : null}
      </div>
    </GlassCard>
  )
}
