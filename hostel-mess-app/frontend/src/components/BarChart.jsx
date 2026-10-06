// Grouped bar chart drawn with plain SVG (no chart library needed).
import { useEffect, useRef, useState } from 'react'

function niceStep(max) {
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / mag
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag
  return Math.max(1, step)
}

function barPath(x, y, w, y0) {
  const r = Math.min(4, w / 2, y0 - y)
  if (y0 - y <= 0) return ''
  return `M${x},${y0}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y0}Z`
}

export default function BarChart({ data, series, labelFor, height = 280 }) {
  const wrap = useRef(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])

  const m = { t: 14, r: 8, b: 30, l: 34 }
  const iw = Math.max(0, width - m.l - m.r)
  const ih = height - m.t - m.b
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0)))
  const step = niceStep(max)
  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  const y = (v) => m.t + ih - (v / top) * ih
  const band = data.length ? iw / data.length : iw
  const groupW = Math.min(band * 0.74, 46)
  const gap = 2
  const barW = (groupW - gap * (series.length - 1)) / series.length
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, iw / 64)))

  return (
    <div className="chart" ref={wrap}>
      <div className="legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <svg width={width} height={height} role="img" aria-label="Meal counts per day">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
            <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const gx = m.l + i * band + (band - groupW) / 2
          return (
            <g key={i}>
              {hover === i && <rect x={m.l + i * band} y={m.t} width={band} height={ih} className="hover-band" />}
              {series.map((s, j) => (
                <path key={s.key} d={barPath(gx + j * (barW + gap), y(d[s.key] || 0), barW, y(0))} fill={s.color} />
              ))}
              {i % every === 0 && (
                <text x={m.l + i * band + band / 2} y={height - 8} textAnchor="middle" className="tick">
                  {labelFor(d)}
                </text>
              )}
              <rect
                x={m.l + i * band}
                y={m.t}
                width={band}
                height={ih}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          )
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="chart-tip"
          style={{ left: Math.min(Math.max(m.l + hover * band + band / 2, 90), width - 90), top: 34 }}
        >
          <b>{labelFor(data[hover], true)}</b>
          {series.map((s) => (
            <span key={s.key}>
              <i style={{ background: s.color }} /> {s.label} <b>{data[hover][s.key] ?? '—'}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
