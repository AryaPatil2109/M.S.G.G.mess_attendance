import { api } from '../api.js'
import Layout from '../components/Layout.jsx'
import { Icon } from '../icons.jsx'
import { Button, Loader, MEAL_ICON, Ring, cap, fmtDuration, fmtTime12, useData, useNow } from '../ui.jsx'

function cutoffDate(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

export default function Mess() {
  const now = useNow(1000)
  const { data, reload } = useData(() => api.get('/api/mess'), { interval: 15000 })

  const fullscreen = () => {
    const el = document.getElementById('kitchen-board')
    if (document.fullscreenElement) document.exitFullscreen()
    else el?.requestFullscreen?.()
  }

  if (!data) {
    return (
      <Layout title="Mess board">
        <Loader />
      </Layout>
    )
  }

  // the meal the kitchen should focus on right now: first one not frozen yet, else dinner
  const focus = data.board.find((b) => b.final === null)?.meal || 'dinner'

  return (
    <Layout
      title="Mess board"
      subtitle="Plates to prepare today — refreshes every 15 seconds"
      actions={
        <>
          <Button size="sm" variant="ghost" icon="refresh" onClick={reload} title="Refresh now" />
          <a className="btn btn-default btn-sm" href="/api/export.csv">
            <Icon name="download" size={14} /> <span>CSV</span>
          </a>
        </>
      }
    >
      <section id="kitchen-board" className="kitchen">
        <header className="kitchen-head">
          <div>
            <span className="eyebrow light">Kitchen display</span>
            <h2>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          </div>
          <div className="kitchen-clock">{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <button className="icon-btn on-dark" onClick={fullscreen} title="Full screen (for a kitchen TV)">
            <Icon name="maximize" />
          </button>
        </header>

        <div className="kitchen-grid">
          {data.board.map((b) => {
            const frozen = b.final !== null
            const left = cutoffDate(b.cutoff) - now
            return (
              <article key={b.meal} className={`plate plate-${b.meal} ${focus === b.meal ? 'focus' : ''}`}>
                <div className="plate-head">
                  <span className="meal-icon">
                    <Icon name={MEAL_ICON[b.meal]} size={22} />
                  </span>
                  <h3>{cap(b.meal)}</h3>
                  {frozen ? (
                    <span className="badge badge-final dark">
                      <Icon name="lock" size={12} /> Final count
                    </span>
                  ) : (
                    <span className="badge badge-live dark">
                      <span className="live-dot" /> Live
                    </span>
                  )}
                </div>
                <div className="plate-body">
                  <Ring value={b.show} total={data.total} size={190} stroke={14} color={b.meal === 'lunch' ? 'var(--lunch-bright)' : 'var(--dinner-bright)'}>
                    <b className="plate-number">{b.show}</b>
                    <small>plates</small>
                  </Ring>
                </div>
                <div className="plate-foot">
                  <span>
                    <span className="dot dot-skip" /> {b.opted_out} skipping
                  </span>
                  <span>
                    <span className="dot dot-leave" /> {b.leave} on leave
                  </span>
                  <span className="plate-cut">
                    <Icon name={frozen ? 'lock' : 'clock'} size={14} />
                    {frozen ? `Locked at ${fmtTime12(b.cutoff)}` : `Locks in ${fmtDuration(left)} (${fmtTime12(b.cutoff)})`}
                  </span>
                </div>
              </article>
            )
          })}
        </div>

        <footer className="kitchen-foot">
          <span className="eyebrow light">Tomorrow (expected so far)</span>
          <div className="tomorrow">
            {['lunch', 'dinner'].filter((m) => m in data.tomorrow).map((meal) => [meal, data.tomorrow[meal]]).map(([meal, n]) => (
              <span key={meal}>
                <Icon name={MEAL_ICON[meal]} size={16} /> {cap(meal)} <b>{n}</b>
              </span>
            ))}
            <span className="muted-light">of {data.total} active students</span>
          </div>
        </footer>
      </section>
    </Layout>
  )
}
