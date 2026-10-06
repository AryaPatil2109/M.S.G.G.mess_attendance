import { useState } from 'react'
import { api } from '../api.js'
import Layout from '../components/Layout.jsx'
import { Icon } from '../icons.jsx'
import {
  Button, Card, Empty, Field, Loader, MEAL_ICON, STATE, StatusPill, Switch,
  cap, fmtDate, fmtDateTime, fmtDuration, fmtTime12, useConfirm, useData, useNow, useToast,
} from '../ui.jsx'

function greeting(d) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Student() {
  const toast = useToast()
  const confirm = useConfirm()
  const now = useNow(30000)
  const { data, reload } = useData(() => api.get('/api/student'), { interval: 60000 })
  const [busy, setBusy] = useState(null)
  const [leave, setLeave] = useState({ from_day: '', to_day: '', reason: '' })

  if (!data) {
    return (
      <Layout title="My meals">
        <Loader />
      </Layout>
    )
  }

  const { me, plan, leaves, settings, today, max_day } = data
  const firstName = me.name.split(' ')[0]

  const run = async (key, fn, fallbackMsg) => {
    setBusy(key)
    try {
      const r = await fn()
      toast(r.message || fallbackMsg)
      await reload()
      return true
    } catch (e) {
      toast(e.message, 'error')
      return false
    } finally {
      setBusy(null)
    }
  }

  const setMeal = (day, meal, coming) =>
    run(`${day}-${meal}`, () => api.post('/api/student/meal', { day, meal, choice: coming ? 'yes' : 'no' }),
      coming ? `${cap(meal)}: marked as coming` : `${cap(meal)}: marked as not coming`)

  const gate = async (action) => {
    if (action === 'HOME') {
      const ok = await confirm({
        title: 'Going home?',
        message: 'All your meals will be cancelled until you tap “I’m back”. The rector will see that you have gone home.',
        confirmText: 'Yes, I’m going home',
      })
      if (!ok) return
    }
    run('gate', () => api.post('/api/student/gate', { action }))
  }

  const saveLeave = async (e) => {
    e.preventDefault()
    const ok = await run('leave', () => api.post('/api/student/leave', leave))
    if (ok) setLeave({ from_day: '', to_day: '', reason: '' })
  }

  const cancelLeave = async (l) => {
    const ok = await confirm({ title: 'Cancel this leave?', message: 'Your meals for these days will be counted again.', confirmText: 'Cancel leave', tone: 'danger' })
    if (ok) run(`leave-${l.id}`, () => api.del(`/api/student/leave/${l.id}`))
  }

  const todayPlan = plan[0]

  return (
    <Layout title="My meals" subtitle="Plan your lunch and dinner — the mess count updates instantly">
      {/* ---------- hero / status ---------- */}
      <section className={`hero hero-${me.status.toLowerCase()}`}>
        <div className="hero-text">
          <span className="eyebrow">{greeting(now)}</span>
          <h2>{firstName}</h2>
          <div className="hero-meta">
            <StatusPill status={me.status} />
            {me.room && (
              <span className="chip">
                <Icon name="building" size={13} /> Room {me.room}
              </span>
            )}
            <span className="chip subtle">Updated {fmtDateTime(me.updated_at)}</span>
          </div>
        </div>
        <div className="hero-actions">
          {me.status === 'IN' ? (
            <>
              <Button icon="pin" onClick={() => gate('OUT_DAY')} loading={busy === 'gate'}>
                Going out
              </Button>
              <Button variant="primary" icon="home" onClick={() => gate('HOME')} disabled={busy === 'gate'}>
                Going home
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" icon="login" onClick={() => gate('IN')} loading={busy === 'gate'}>
              I’m back in the hostel
            </Button>
          )}
          <p className="hint">“Going out” (college, market) keeps your meals. “Going home” cancels them until you return.</p>
        </div>
      </section>

      <div className="split">
        <div className="split-main">
      {/* ---------- today ---------- */}
      <div className="grid-2">
        {todayPlan.cells.map((c) => {
          const cutoff = new Date(c.cutoff_at)
          const left = cutoff - now
          const coming = c.state === 'coming'
          const disabled = c.locked || c.state === 'leave' || busy === `${today}-${c.meal}`
          return (
            <section key={c.meal} className={`meal-card meal-${c.meal} state-${STATE[c.state].cls}`}>
              <div className="meal-top">
                <span className="meal-icon">
                  <Icon name={MEAL_ICON[c.meal]} size={22} />
                </span>
                <div>
                  <span className="eyebrow">Today</span>
                  <h3>{cap(c.meal)}</h3>
                </div>
                <Switch checked={coming} disabled={disabled} label={`${c.meal} today`} onChange={(v) => setMeal(today, c.meal, v)} />
              </div>
              <div className="meal-state">
                <Icon name={STATE[c.state].icon} size={18} />
                <b>{c.state === 'leave' ? 'You are on leave' : coming ? 'You’re coming' : 'You’re skipping'}</b>
              </div>
              <div className="meal-foot">
                {c.locked ? (
                  <>
                    <Icon name="lock" size={14} /> Locked at {fmtTime12(settings[`cutoff_${c.meal}`])}
                  </>
                ) : (
                  <>
                    <Icon name="clock" size={14} /> Change within <b>{fmtDuration(left)}</b> · cut-off {fmtTime12(settings[`cutoff_${c.meal}`])}
                  </>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {/* ---------- week planner ---------- */}
      <Card title="Plan your week" subtitle="Default is coming. Tap a meal to skip it." icon="calendar">
        <div className="week">
          {plan.map((d) => (
            <div key={d.day} className={`week-row ${d.day === today ? 'is-today' : ''}`}>
              <div className="week-day">
                <b>{d.day === today || d.label === 'Tomorrow' ? d.label : fmtDate(d.day, { weekday: 'long' })}</b>
                <span>{fmtDate(d.day, { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="week-meals">
                {d.cells.map((c) => {
                  const st = STATE[c.state]
                  const disabled = c.locked || c.state === 'leave'
                  return (
                    <button
                      key={c.meal}
                      className={`meal-chip chip-${st.cls}`}
                      disabled={disabled || busy === `${d.day}-${c.meal}`}
                      onClick={() => setMeal(d.day, c.meal, c.state !== 'coming')}
                      title={c.locked ? 'Cut-off passed' : c.state === 'leave' ? 'On leave' : 'Tap to change'}
                    >
                      <Icon name={MEAL_ICON[c.meal]} size={15} />
                      <span className="mc-name">{cap(c.meal)}</span>
                      <span className="mc-state">
                        <Icon name={c.locked ? 'lock' : st.icon} size={13} /> {st.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

        </div>
        <aside className="split-side">
      {/* ---------- leave ---------- */}
      <Card title="Going home for a few days?" subtitle="Plan a leave and your meals are cancelled automatically" icon="bag">
        <form className="form-row" onSubmit={saveLeave}>
          <Field label="From">
            <input type="date" min={today} value={leave.from_day} onChange={(e) => setLeave({ ...leave, from_day: e.target.value })} required />
          </Field>
          <Field label="To">
            <input type="date" min={leave.from_day || today} value={leave.to_day} onChange={(e) => setLeave({ ...leave, to_day: e.target.value })} required />
          </Field>
          <Field label="Reason (optional)">
            <input value={leave.reason} placeholder="e.g. Diwali vacation" onChange={(e) => setLeave({ ...leave, reason: e.target.value })} />
          </Field>
          <Button variant="primary" icon="plus" loading={busy === 'leave'}>
            Save leave
          </Button>
        </form>

        {leaves.length === 0 ? (
          <Empty icon="calendar" title="No upcoming leave" text="Planned leaves will appear here." />
        ) : (
          <ul className="leave-list">
            {leaves.map((l) => (
              <li key={l.id}>
                <span className="leave-icon">
                  <Icon name="bag" size={16} />
                </span>
                <div>
                  <b>
                    {fmtDate(l.from_day)} → {l.to_day ? fmtDate(l.to_day) : 'until you return'}
                  </b>
                  <span className="muted">{l.reason || 'No reason given'}</span>
                </div>
                <Button size="sm" variant="ghost" icon="trash" onClick={() => cancelLeave(l)} loading={busy === `leave-${l.id}`}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">You can plan up to {fmtDate(max_day)} for meals; leave can be planned any time ahead.</p>
      </Card>
        </aside>
      </div>
    </Layout>
  )
}