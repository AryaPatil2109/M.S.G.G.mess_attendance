import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Layout from '../components/Layout.jsx'
import { Icon } from '../icons.jsx'
import { Button, Card, Field, Loader, fmtTime12, useData, useToast } from '../ui.jsx'

const ITEMS = [
  { key: 'cutoff_lunch', label: 'Lunch cut-off', icon: 'sun', cls: 'lunch', hint: 'Students can change lunch until this time. Then the count is frozen and sent to the mess.' },
  { key: 'cutoff_dinner', label: 'Dinner cut-off', icon: 'moon', cls: 'dinner', hint: 'Students can change dinner until this time.' },
  { key: 'curfew', label: 'Hostel curfew', icon: 'shield', cls: 'curfew', hint: 'Students still “out for the day” after this time are highlighted on the dashboard.' },
]

const toPct = (hhmm) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  return ((h * 60 + m) / 1440) * 100
}

export default function Settings() {
  const toast = useToast()
  const { data } = useData(() => api.get('/api/rector/settings'))
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) setForm(data.settings)
  }, [data])

  if (!form) {
    return (
      <Layout title="Cut-off times">
        <Loader />
      </Layout>
    )
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await api.put('/api/rector/settings', form)
      toast(r.message)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Cut-off times" subtitle="When meal choices lock and the count is sent to the mess">
      <Card title="Your hostel’s day" subtitle="How the times below fit into a day" icon="clock">
        <div className="timeline">
          <div className="tl-bar">
            {['6 AM', '12 PM', '6 PM'].map((t, i) => (
              <span key={t} className="tl-hour" style={{ left: `${(i + 1) * 25}%` }}>
                {t}
              </span>
            ))}
            {ITEMS.map((it) => (
              <span key={it.key} className={`tl-mark tl-${it.cls} ${toPct(form[it.key]) < 8 ? 'edge-start' : toPct(form[it.key]) > 92 ? 'edge-end' : ''}`} style={{ left: `${toPct(form[it.key])}%` }}>
                <span className="tl-label">
                  <Icon name={it.icon} size={13} /> {fmtTime12(form[it.key])}
                </span>
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Edit times" icon="clock">
        <form onSubmit={save} className="settings-list">
          {ITEMS.map((it) => (
            <div key={it.key} className="setting-row">
              <span className={`setting-icon si-${it.cls}`}>
                <Icon name={it.icon} size={18} />
              </span>
              <div className="setting-text">
                <b>{it.label}</b>
                <span>{it.hint}</span>
              </div>
              <Field label="">
                <input type="time" value={form[it.key]} onChange={(e) => setForm({ ...form, [it.key]: e.target.value })} required />
              </Field>
            </div>
          ))}
          <div className="form-actions">
            <Button variant="primary" icon="check" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </Layout>
  )
}
