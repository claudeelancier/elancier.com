export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-[#00D4FF]/80 uppercase">{eyebrow}</p> : null}
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-base text-white/60">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}

export function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="font-heading text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-2 text-white/55">{subtitle}</p> : null}
    </div>
  )
}
