/**
 * SearchableSelect — a combobox-style select with inline text search.
 *
 * Props
 * ─────
 * options   — array of { value, labelG, labelH, labelE } items
 * value     — currently selected value (or '' / null for "all")
 * onChange  — called with the new value
 * placeholder — text shown when nothing is selected
 * allLabel  — label for the "no filter" option (e.g. "All items") — optional
 */
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/language-context'

export interface SearchOption {
  value: string
  labelG: string   // Gujarati label
  labelH?: string  // Hindi label
  labelE: string   // English label
}

interface Props {
  options: SearchOption[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  allLabel?: string    // if set, shows a "clear / all" option at the top
  className?: string
  id?: string
}

export function SearchableSelect({
  options, value, onChange,
  placeholder = 'Select…',
  allLabel,
  className,
  id,
}: Props) {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [highlighted, setHighlighted] = useState(0)

  const selected = options.find((o) => o.value === value)

  function getLabel(o: SearchOption): string {
    if (lang === 'gu') return o.labelG
    if (lang === 'hi') return o.labelH ?? o.labelG
    return o.labelE
  }

  // Filter by query — matches any language
  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.labelG.toLowerCase().includes(query.toLowerCase()) ||
          o.labelE.toLowerCase().includes(query.toLowerCase()) ||
          (o.labelH && o.labelH.toLowerCase().includes(query.toLowerCase())),
      )
    : options

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlighted(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1 + (allLabel ? 1 : 0))) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (allLabel && highlighted === 0) { select(''); return }
      const offset = allLabel ? 1 : 0
      const item = filtered[highlighted - offset]
      if (item) select(item.value)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-base',
          'ring-offset-background transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'hover:bg-accent/50',
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? (
            <span className="font-medium">{getLabel(selected)}</span>
          ) : (
            allLabel ?? placeholder
          )}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {value && allLabel && (
            <X
              className="h-3.5 w-3.5 hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
            />
          )}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={cn(
          'absolute z-50 mt-1 w-full min-w-[220px] rounded-md border border-input bg-card shadow-lg',
          'animate-in fade-in-0 zoom-in-95',
        )}>
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-input px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlighted(0) }}
              onKeyDown={handleKey}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {allLabel && (
              <li>
                <button
                  type="button"
                  onClick={() => select('')}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent',
                    highlighted === 0 && 'bg-accent',
                    !value && 'font-medium text-primary',
                  )}
                >
                  <Check className={cn('h-4 w-4 shrink-0', value ? 'opacity-0' : 'text-primary')} />
                  <span className="text-muted-foreground">{allLabel}</span>
                </button>
              </li>
            )}

            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">No results</li>
            )}

            {filtered.map((o, idx) => {
              const hIdx = idx + (allLabel ? 1 : 0)
              const isSelected = o.value === value
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => select(o.value)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent',
                      highlighted === hIdx && 'bg-accent',
                      isSelected && 'font-medium text-primary',
                    )}
                  >
                    <Check className={cn('h-4 w-4 shrink-0', !isSelected && 'opacity-0', isSelected && 'text-primary')} />
                    <span>{getLabel(o)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
