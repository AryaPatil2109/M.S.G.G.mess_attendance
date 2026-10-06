import { useMemo, useState } from 'react'
import { api } from '../api.js'
import Layout from '../components/Layout.jsx'
import { Icon } from '../icons.jsx'
import { Link } from '../router.jsx'
import {
  Avatar, Button, Card, Empty, Loader, MEAL_ICON, Ring, SearchBox, Segmented, StatePill,
  cap, fmtDateTime, fmtTime12, useData, useToast,
} from '../ui.jsx'

export function MealStatCard({ b, total }) {
  const frozen = b.final !== null
  return (
    <section className={`stat-meal meal-${b.meal}`}>
      <Ring value={b.show} total={total} size={104} stroke={10} color={b.meal === 'lunch' ? 'var(--lunch)' : 'var(--dinner)'}>
        <b>{b.show}</b>
        <small>of {total}</small>
      </Ring>
      <div className="sm-main">
        <div className="sm-head">
          <span className="meal-icon sm">
            <Icon name={MEAL_ICON[b.meal]} size={18} />
          </span>
          <h3>{cap(b.meal)}</h3>
          {frozen ? (
            <span className="badge badge-final">
              <Icon name="lock" size={12} /> Final
            </span>
          ) : (
            <span className="badge badge-live">
              <span className="live-dot" /> Live
            </span>
          )}
        </div>
        <div className="sm-stats">
          <div>
            <span><span className="dot dot-coming" /> Coming</span>
            <b>{b.show}</b>
          </div>
          <div>
            <span><span className="dot dot-skip" /> Skipping</span>
            <b>{b.opted_out}</b>
          </div>
          <div>
            <span><span className="dot dot-leave" /> On leave</span>
            <b>{b.leave}</b>
          </div>
        </div>
        <div className="sm-foot">
          <Icon name={frozen ? 'lock' : 'clock'} size={14} />
          {frozen ? `Frozen at cut-off ${fmtTime12(b.cutoff)} — sent to the mess` : `Counting live · closes at ${fmtTime12(b.cutoff)}`}
        </div>
      </div>
    </section>
  )
}

const KPI = [
  { key: 'total', label: 'Active students', icon: 'users', cls: 'kpi-total' },
  { key: 'IN', label: 'In hostel', icon: 'building', cls: 'kpi-in' },
  { key: 'OUT_DAY', label: 'Out for the day', icon: 'pin', cls: 'kpi-out' },
  { key: 'HOME', label: 'Gone home', icon: 'home', cls: 'kpi-home' },
]

const STATUS_OPTIONS = [
  { value: 'IN', label: 'In', icon: 'building', title: 'In hostel' },
  { value: 'OUT_DAY', label: 'Out', icon: 'pin', title: 'Out for the day' },
  { value: 'HOME', label: 'Home', icon: 'home', title: 'Gone home' },
]

// in the table the status switch shows short labels only
const ROW_OPTIONS = STATUS_OPTIONS.map(({ value, label, title }) => ({ value, label, title }))

export default function RectorDashboard() {
  const toast = useToast()
  const { data, reload } = useData(() => api.get('/api/rector/dashboard'), { interval: 30000 })
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [busy, setBusy] = useState(null)

  const rows = useMemo(() => {
    if (!data) return []
    const s = q.trim().toLowerCase()
    return data.students.filter(
      (st) =>
        (filter === 'ALL' || st.status === filter) &&
        (!s || `${st.name} ${st.username} ${st.room || ''}`.toLowerCase().includes(s)),
    )
  }, [data, q, filter])

  if (!data) {
    return (
      <Layout title="Dashboard">
        <Loader />
      </Layout>
    )
  }

  const setStatus = async (st, action) => {
    if (action === st.status) return
    setBusy(st.id)
    try {
      await api.post(`/api/rector/presence/${st.id}`, { action })
      toast(`${st.name} marked as ${STATUS_OPTIONS.find((o) => o.value === action).title.toLowerCase()}`)
      await reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const kpiValue = (k) => (k === 'total' ? data.total : data.counts[k])
  const lateCount = data.past_curfew ? data.counts.OUT_DAY : 0

  return (
    <Layout
      title="Dashboard"
      subtitle="Today’s meal count and who is where — updates automatically"
      actions={<Button size="sm" variant="ghost" icon="refresh" onClick={reload} title="Refresh now" />}
    >
      <div className="kpis">
        {KPI.map((k) => (
          <button key={k.key} className={`kpi ${k.cls} ${filter === k.key ? 'selected' : ''}`}
            onClick={() => setFilter(k.key === 'total' ? 'ALL' : k.key)}>
            <span className="kpi-icon">
              <Icon name={k.icon} size={18} />
            </span>
            <span className="kpi-label">{k.label}</span>
            <b className="kpi-value">{kpiValue(k.key)}</b>
          </button>
        ))}
      </div>

      {lateCount > 0 && (
        <div className="alert alert-warn">
          <Icon name="alert" size={18} />
          <div>
            <b>{lateCount} student{lateCount > 1 ? 's are' : ' is'} still out after curfew ({fmtTime12(data.curfew)}).</b>
            <span> They are highlighted in the list below.</span>
          </div>
          <Button size="sm" onClick={() => setFilter('OUT_DAY')}>Show them</Button>
        </div>
      )}

      <div className="grid-2">
        {data.board.map((b) => (
          <MealStatCard key={b.meal} b={b} total={data.total} />
        ))}
      </div>

      <Card
        title="Who is where"
        subtitle={`${rows.length} of ${data.students.length} students`}
        icon="users"
        pad={false}
        actions={
          <Link to="/rector/students" className="link">
            Manage students <Icon name="arrowRight" size={14} />
          </Link>
        }
      >
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Search by name, username or room…" />
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: 'All', count: data.total },
              { value: 'IN', label: 'In', count: data.counts.IN },
              { value: 'OUT_DAY', label: 'Out', count: data.counts.OUT_DAY },
              { value: 'HOME', label: 'Home', count: data.counts.HOME },
            ]}
          />
        </div>

        {rows.length === 0 ? (
          <Empty icon="search" title="No students found" text="Try a different name or filter." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Room</th>
                  <th>Lunch</th>
                  <th>Dinner</th>
                  <th>Last update</th>
                  <th className="right">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((st) => (
                  <tr key={st.id} className={data.past_curfew && st.status === 'OUT_DAY' ? 'row-late' : ''}>
                    <td>
                      <div className="person">
                        <Avatar name={st.name} size={34} />
                        <div>
                          <b>{st.name}</b>
                          <span>{st.username}</span>
                        </div>
                      </div>
                    </td>
                    <td>{st.room || '—'}</td>
                    <td><StatePill state={st.meals.lunch} /></td>
                    <td><StatePill state={st.meals.dinner} /></td>
                    <td className="muted nowrap">{fmtDateTime(st.updated_at)}</td>
                    <td className="right">
                      <div className={busy === st.id ? 'is-busy' : ''}>
                        <Segmented size="sm" value={st.status} onChange={(v) => setStatus(st, v)} options={ROW_OPTIONS} />
                      </div>
                    </td>
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