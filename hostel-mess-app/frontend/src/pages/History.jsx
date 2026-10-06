import { useMemo, useState } from 'react'
import { api } from '../api.js'
import BarChart from '../components/BarChart.jsx'
import Layout from '../components/Layout.jsx'
import { Icon } from '../icons.jsx'
import { Card, Empty, Loader, SearchBox, Segmented, StatusPill, fmtDate, fmtDateTime, useData } from '../ui.jsx'

const SERIES = [
  { key: 'lunch', label: 'Lunch', color: 'var(--lunch)' },
  { key: 'dinner', label: 'Dinner', color: 'var(--dinner)' },
]

const SOURCE = { 'student-app': 'Student app', rector: 'Rector', 'gate-device': 'Gate device', 'gate-desk': 'Gate desk' }

export default function History() {
  const { data } = useData(() => api.get('/api/rector/history'))
  const [view, setView] = useState('chart')
  const [q, setQ] = useState('')

  const stats = useMemo(() => {
    if (!data?.days.length) return null
    const avg = (k) => {
      const v = data.days.filter((d) => d[k] !== undefined).map((d) => d[k])
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
    }
    const peak = data.days.reduce((best, d) => ((d.lunch || 0) + (d.dinner || 0) > (best.lunch || 0) + (best.dinner || 0) ? d : best))
    const plates = data.days.reduce((a, d) => a + (d.lunch || 0) + (d.dinner || 0), 0)
    return { days: data.days.length, lunch: avg('lunch'), dinner: avg('dinner'), peak, plates }
  }, [data])

  const log = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (data?.log || []).filter((l) => !s || `${l.name} ${l.room || ''}`.toLowerCase().includes(s))
  }, [data, q])

  if (!data) {
    return (
      <Layout title="History">
        <Loader />
      </Layout>
    )
  }

  return (
    <Layout
      title="History"
      subtitle="Final meal counts and gate movements for the last 30 days"
      actions={
        <a className="btn btn-default btn-sm" href="/api/export.csv">
          <Icon name="download" size={14} /> <span>Download CSV</span>
        </a>
      }
    >
      {stats && (
        <div className="kpis">
          <div className="kpi static kpi-total">
            <span className="kpi-icon"><Icon name="calendar" size={18} /></span>
            <span className="kpi-label">Days recorded</span>
            <b className="kpi-value">{stats.days}</b>
          </div>
          <div className="kpi static kpi-lunch">
            <span className="kpi-icon"><Icon name="sun" size={18} /></span>
            <span className="kpi-label">Average lunch</span>
            <b className="kpi-value">{stats.lunch}</b>
          </div>
          <div className="kpi static kpi-dinner">
            <span className="kpi-icon"><Icon name="moon" size={18} /></span>
            <span className="kpi-label">Average dinner</span>
            <b className="kpi-value">{stats.dinner}</b>
          </div>
          <div className="kpi static kpi-in">
            <span className="kpi-icon"><Icon name="utensils" size={18} /></span>
            <span className="kpi-label">Plates served (30 days)</span>
            <b className="kpi-value">{stats.plates}</b>
          </div>
        </div>
      )}

      <Card
        title="Final counts per day"
        subtitle="Frozen at each meal’s cut-off time"
        icon="chart"
        actions={
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: 'Chart', icon: 'chart' },
              { value: 'table', label: 'Table', icon: 'menu' },
            ]}
          />
        }
      >
        {data.days.length === 0 ? (
          <Empty icon="chart" title="No counts yet" text="Counts are saved automatically at each meal’s cut-off time." />
        ) : view === 'chart' ? (
          <BarChart
            data={data.days}
            series={SERIES}
            labelFor={(d, long) => fmtDate(d.day, long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' })}
          />
        ) : (
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="right">Lunch</th>
                  <th className="right">Dinner</th>
                  <th className="right">Active students</th>
                </tr>
              </thead>
              <tbody>
                {[...data.days].reverse().map((d) => (
                  <tr key={d.day}>
                    <td>{fmtDate(d.day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="right num">{d.lunch ?? '—'}</td>
                    <td className="right num">{d.dinner ?? '—'}</td>
                    <td className="right num muted">{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Gate log" subtitle={`${log.length} movements`} icon="pin" pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Search by student name or room…" />
        </div>
        {log.length === 0 ? (
          <Empty icon="pin" title="No movements" text="Check-ins and check-outs will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Room</th>
                  <th>Movement</th>
                  <th>Marked by</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id}>
                    <td className="nowrap muted">{fmtDateTime(l.ts)}</td>
                    <td><b>{l.name}</b></td>
                    <td>{l.room || '—'}</td>
                    <td><StatusPill status={l.action} /></td>
                    <td className="muted">{SOURCE[l.source] || l.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  )
}
