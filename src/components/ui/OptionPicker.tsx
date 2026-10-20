import { useState } from 'react'
import { Button } from './Button'
import { Input } from './Field'

export function OptionPicker({
  title,
  placeholder,
  value,
  onChange,
  options,
  className = '',
  searchable = true,
  prefix,
  id,
  disabled,
}: {
  title: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
  searchable?: boolean
  prefix?: string
  id?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const current = options.find((o) => o.value === value)
  const needle = q.trim().toLowerCase()
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options

  function close() {
    setOpen(false)
    setQ('')
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--rule)] bg-[var(--white)] px-3 py-2.5 text-left text-sm disabled:opacity-50"
      >
        <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-[var(--muted)]'}`}>
          {prefix && <span className="mr-1 text-[var(--muted)]">{prefix}</span>}
          {current ? current.label : placeholder}
        </span>
        <span aria-hidden className="text-[var(--muted)]">
          ▾
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center">
          <button
            type="button"
            aria-label="Tutup"
            onClick={close}
            className="absolute inset-0 bg-black/40"
          />
          <div className="sheet-in relative flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-[var(--cream)] shadow-xl md:max-w-lg md:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-3">
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                {title}
              </h2>
              <Button variant="quiet" onClick={close}>
                Tutup
              </Button>
            </div>
            {searchable && (
              <div className="px-5 pt-3">
                <Input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari..."
                  className="w-full"
                />
              </div>
            )}
            <ul className="overflow-y-auto px-5 py-3">
              {shown.length === 0 && (
                <li className="py-4 text-center text-sm text-[var(--muted)]">Tidak ada yang cocok.</li>
              )}
              {shown.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      close()
                    }}
                    className={`w-full break-words rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      o.value === value ? 'bg-[var(--pale)] font-semibold' : 'hover:bg-[var(--pale-soft)]'
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
