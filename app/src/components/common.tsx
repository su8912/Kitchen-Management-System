import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Inbox } from 'lucide-react'
import { useLang } from '@/lib/language-context'
import type { Lang } from '@/lib/i18n'

/** Map lang code → the label-record key: en→'e', gu→'g', hi→'h' */
export function langKey(lang: Lang): 'e' | 'g' | 'h' {
  switch (lang) {
    case 'en': return 'e'
    case 'gu': return 'g'
    case 'hi': return 'h'
  }
}

/**
 * Displays the name from a Named object in the current language.
 * Replaces the old Bilingual component.
 */
export function LocalizedName({
  nameG,
  nameH,
  nameE,
  className,
}: {
  nameG: string
  nameH: string
  nameE: string
  className?: string
}) {
  const { pickName } = useLang()
  return <span className={className}>{pickName({ nameG, nameH, nameE })}</span>
}

/**
 * Gujarati-first, English secondary — how the department already works.
 * Now language-aware: shows the selected language only.
 * Kept for backward compatibility but delegates to LocalizedName logic.
 */
export function Bilingual({
  g,
  e,
  h,
  className,
  inline,
}: {
  g: string
  e?: string
  h?: string
  className?: string
  inline?: boolean
}) {
  const { lang } = useLang()
  const text = lang === 'gu' ? g : lang === 'hi' ? (h ?? g) : (e ?? g)

  if (inline) {
    return <span className={className}>{text}</span>
  }
  return <span className={cn('leading-tight', className)}>{text}</span>
}

export function PageHeader({
  titleG,
  titleE,
  titleH,
  description,
  actions,
}: {
  titleG: string
  titleE: string
  titleH?: string
  description?: string
  actions?: ReactNode
}) {
  const { lang } = useLang()
  const title = lang === 'gu' ? titleG : lang === 'hi' ? (titleH ?? titleG) : titleE

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <Inbox className="mb-1 h-8 w-8 text-muted-foreground/50" />
        <p className="font-medium">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </CardContent>
    </Card>
  )
}

/** Honest about what this build is. */
export function SampleDataNotice({ className }: { className?: string }) {
  const { t } = useLang()
  return (
    <p
      className={cn(
        'rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300',
        className,
      )}
    >
      {t('notice.prototype')}
    </p>
  )
}

export function Field({
  label,
  labelG,
  labelH,
  hint,
  children,
  className,
}: {
  label: string
  labelG?: string
  labelH?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  const { lang } = useLang()
  const displayLabel = lang === 'gu' && labelG ? labelG
    : lang === 'hi' && labelH ? labelH
    : lang === 'hi' && labelG ? labelG
    : label

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium">
        {displayLabel}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Big number, small caption — the stat tile used on dashboards. */
export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'warn' | 'good'
}) {
  return (
    // Plain div, not CardContent — that carries pt-0 for sitting under a
    // CardHeader, which leaves a headerless tile top-flush and bottom-heavy.
    <Card>
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'num mt-1.5 text-2xl font-semibold tabular-nums',
            tone === 'warn' && 'text-amber-600 dark:text-amber-400',
            tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          )}
        >
          {value}
        </p>
        {sub && <p className="mt-1 text-xs leading-snug text-muted-foreground">{sub}</p>}
      </div>
    </Card>
  )
}
