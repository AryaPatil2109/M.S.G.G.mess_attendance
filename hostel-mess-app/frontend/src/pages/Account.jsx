import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import Layout from '../components/Layout.jsx'
import { THEMES, applyTheme, getTheme } from '../theme.js'
import { Avatar, Button, Card, Field, useToast } from '../ui.jsx'

const ROLE = { rector: 'Rector', mess: 'Mess manager', student: 'Student' }

export default function Account() {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ old: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [theme, setTheme] = useState(getTheme())

  const pickTheme = (id) => {
    applyTheme(id)
    setTheme(id)
  }

  const save = async (e) => {
    e.preventDefault()
    if (form.new !== form.confirm) return toast('The new passwords do not match.', 'error')
    setSaving(true)
    try {
      const r = await api.post('/api/password', { old: form.old, new: form.new })
      toast(r.message)
      setForm({ old: '', new: '', confirm: '' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Account" subtitle="Your profile and password">
      <div className="account">
        <Card className="profile">
          <Avatar name={user.name} size={72} />
          <h2>{user.name}</h2>
          <p className="muted">
            {ROLE[user.role]} · @{user.username}
            {user.room ? ` · Room ${user.room}` : ''}
          </p>
        </Card>
        <Card title="Change password" icon="key">
          <form className="form-stack" onSubmit={save}>
            <Field label="Current password">
              <input type="password" value={form.old} onChange={(e) => setForm({ ...form, old: e.target.value })} required />
            </Field>
            <Field label="New password" hint="At least 6 characters">
              <input type="password" minLength={6} value={form.new} onChange={(e) => setForm({ ...form, new: e.target.value })} required />
            </Field>
            <Field label="Confirm new password">
              <input type="password" minLength={6} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
            </Field>
            <div className="form-actions">
              <Button variant="primary" icon="check" loading={saving}>
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card title="Appearance" subtitle="Choose the colour theme for this browser" icon="eye">
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className={`theme-opt ${theme === t.id ? 'active' : ''}`} onClick={() => pickTheme(t.id)}>
              <span className="theme-prev" style={{ background: t.bg }}>
                <i className="tp-side" style={{ background: t.side, borderRight: '1px solid rgba(0,0,0,0.08)' }} />
                <span className="tp-main">
                  <i className="tp-bar" style={{ background: t.accent }} />
                  <i className="tp-card" />
                </span>
              </span>
              <span>
                <b>{t.name}</b>
                <small>{t.desc}</small>
              </span>
            </button>
          ))}
        </div>
      </Card>
    </Layout>
  )
}