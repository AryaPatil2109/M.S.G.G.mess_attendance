// Reusable UI building blocks: buttons, cards, pills, toasts, confirm dialog, hooks...
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Icon } from './icons.jsx'

/* ------------------------------------------------------------------ hooks */

// Loads data from the API, optionally re-loading every `interval` ms.
export function useData(loader, { interval } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const ref = useRef(loader)
  ref.current = loader

  const reload = useCallback(async () => {
    try {
      const d = await ref.current()
      setData(d)
      setError(null)
      return d
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    reload()
    if (!interval) return
    const t = setInterval(() => {
      if (!document.hidden) reload()
    }, interval)
    return () => clearInterval(t)
  }, [reload, interval])

  return { data, error, reload }
}

// Current time, refreshed every `ms` milliseconds.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/* ---------------------------------------------------------------- helpers */

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso.replace(' ', 'T'))
  return d.toLocaleDateString('en-IN', opts)
}

export function fmtDateTime(ts) {
  if (!ts) return ''
  const d = new Date(ts.replace(' ', 'T'))
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function fmtTime12(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export function fmtDuration(ms) {
  const mins = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

export const MEAL_ICON = { lunch: 'sun', dinner: 'moon' }

export const STATUS = {
  IN: { label: 'In hostel', icon: 'building', cls: 'in' },
  OUT_DAY: { label: 'Out for the day', icon: 'pin', cls: 'out' },
  HOME: { label: 'Gone home', icon: 'home', cls: 'home' },
}

export const STATE = {
  coming: { label: 'Coming', icon: 'check', cls: 'coming' },
  opted_out: { label: 'Not coming', icon: 'x', cls: 'skip' },
  leave: { label: 'On leave', icon: 'bag', cls: 'leave' },
}

/* ------------------------------------------------------------- components */

export function Button({ variant = 'default', size, icon, loading, children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`btn btn-${variant} ${size ? 'btn-' + size : ''} ${className}`}
      disabled={loading || props.disabled}
    >
      {loading ? <span className="spinner" /> : icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children && <span>{children}</span>}
    </button>
  )
}

export function Card({ title, subtitle, icon, actions, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div className="card-title">
            {icon && (
              <span className="card-icon">
                <Icon name={icon} size={18} />
              </span>
            )}
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'card-body' : ''}>{children}</div>
    </section>
  )
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.IN
  return (
    <span className={`pill pill-${s.cls}`}>
      <Icon name={s.icon} size={13} /> {s.label}
    </span>
  )
}

export function StatePill({ state, compact }) {
  const s = STATE[state] || STATE.coming
  return (
    <span className={`pill pill-${s.cls}`}>
      <Icon name={s.icon} size={13} /> {!compact && s.label}
    </span>
  )
}

const AVATAR_BG = ['#FDE7D7', '#E3E8FB', '#DDF3E6', '#F6E1F0', '#FFF1C9', '#DDEFF6']
export function Avatar({ name = '?', size = 36 }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997
  return (
    <span className="avatar" style={{ width: size, height: size, background: AVATAR_BG[h % AVATAR_BG.length], fontSize: size * 0.38 }}>
      {initials}
    </span>
  )
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="search">
      <Icon name="search" size={16} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="x" size={14} />
        </button>
      )}
    </label>
  )
}

export function Segmented({ value, onChange, options, size }) {
  return (
    <div className={`segmented ${size === 'sm' ? 'segmented-sm' : ''}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          title={o.title}
        >
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
          {o.count !== undefined && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="knob" />
    </button>
  )
}

// Circular progress ring (value out of total).
export function Ring({ value, total, size = 110, stroke = 11, color = 'var(--brand)', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = total ? Math.min(value / total, 1) : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ring-track)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .7s ease' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

export function Empty({ icon = 'info', title, text }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <b>{title}</b>
      {text && <p>{text}</p>}
    </div>
  )
}

export function Loader() {
  return (
    <div className="loader">
      <span className="spinner lg" />
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Modal({ open, onClose, title, children, footer, width = 460 }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

/* ---------------------------------------------------- toasts + confirm */

const ToastCtx = createContext(() => {})
const ConfirmCtx = createContext(async () => true)

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)

  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setDialog({ ...opts, resolve })),
    [],
  )

  const close = (answer) => {
    dialog?.resolve(answer)
    setDialog(null)
  }

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon name={t.type === 'error' ? 'alert' : 'check'} size={16} />
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
        <Modal
          open={!!dialog}
          onClose={() => close(false)}
          title={dialog?.title}
          width={420}
          footer={
            <>
              <Button onClick={() => close(false)}>Cancel</Button>
              <Button variant={dialog?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
                {dialog?.confirmText || 'Confirm'}
              </Button>
            </>
          }
        >
          <p className="muted">{dialog?.message}</p>
        </Modal>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
export const useConfirm = () => useContext(ConfirmCtx)
