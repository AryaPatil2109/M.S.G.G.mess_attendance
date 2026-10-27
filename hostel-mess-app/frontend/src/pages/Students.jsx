import { useMemo, useState } from 'react'
import { api } from '../api.js'
import Layout from '../components/Layout.jsx'
import { Icon } from '../icons.jsx'
import {
  Avatar, Button, Card, Empty, Field, Loader, Modal, SearchBox, Segmented,
  fmtDate, useConfirm, useData, useToast,
} from '../ui.jsx'

const EMPTY = { username: '', name: '', room: '', biometric_id: '', admission_date: '', password: 'pass123' }

export default function Students() {
  const toast = useToast()
  const confirm = useConfirm()
  const { data, reload } = useData(() => api.get('/api/rector/students'))
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('active')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(null)

  const students = data?.students || []
  const counts = {
    active: students.filter((s) => s.active).length,
    left: students.filter((s) => !s.active).length,
    all: students.length,
  }
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return students.filter(
      (st) =>
        (tab === 'all' || (tab === 'active' ? st.active : !st.active)) &&
        (!s || `${st.name} ${st.username} ${st.room || ''} ${st.biometric_id || ''}`.toLowerCase().includes(s)),
    )
  }, [students, q, tab])

  const act = async (key, fn) => {
    setBusy(key)
    try {
      const r = await fn()
      if (r?.message) toast(r.message)
      await reload()
      return true
    } catch (e) {
      toast(e.message, 'error')
      return false
    } finally {
      setBusy(null)
    }
  }

  const toggle = async (st) => {
    if (st.active) {
      const ok = await confirm({
        title: `Deactivate ${st.name}?`,
        message: 'Use this when a student leaves the hostel permanently. She will no longer be counted for meals and cannot log in. You can activate her again later.',
        confirmText: 'Deactivate',
        tone: 'danger',
      })
      if (!ok) return
    }
    const ok = await act(`t${st.id}`, () => api.post(`/api/rector/students/${st.id}/toggle`))
    if (ok) toast(st.active ? `${st.name} deactivated` : `${st.name} is active again`)
  }

  const reset = async (st) => {
    const ok = await confirm({ title: 'Reset password?', message: `${st.name}'s password will be reset to “pass123”.`, confirmText: 'Reset password' })
    if (ok) act(`r${st.id}`, () => api.post(`/api/rector/students/${st.id}/reset`))
  }

  const add = async (e) => {
    e.preventDefault()
    const ok = await act('add', () => api.post('/api/rector/students', form))
    if (ok) {
      setAdding(false)
      setForm(EMPTY)
      // Automatically trigger download of updated students.csv for rector's records
      try {
        const a = document.createElement('a')
        a.href = `/api/rector/students/export.csv?t=${Date.now()}`
        a.download = 'students.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (err) {
        console.warn('Auto-download CSV failed:', err)
      }
    }
  }

  return (
    <Layout
      title="Students"
      subtitle="Find, add or deactivate hostel students"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <a className="btn btn-default" href="/api/rector/students/export.csv" title="Download students.csv">
            <Icon name="download" size={14} /> <span>Download CSV</span>
          </a>
          <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
            Add student
          </Button>
        </div>
      }
    >
      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Search by name, username, room or biometric ID…" />
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'active', label: 'Active', count: counts.active },
              { value: 'left', label: 'Left hostel', count: counts.left },
              { value: 'all', label: 'All', count: counts.all },
            ]}
          />
        </div>

        {!data ? (
          <Loader />
        ) : rows.length === 0 ? (
          <Empty icon="search" title="No students found" text={q ? `Nothing matches “${q}”.` : 'No students in this list.'} />
        ) : (
          <div className="table-wrap table-scroll tall">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Room</th>
                  <th>Admitted</th>
                  <th>Biometric ID</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((st) => (
                  <tr key={st.id} className={st.active ? '' : 'row-muted'}>
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
                    <td className="nowrap">{st.admission_date ? fmtDate(st.admission_date, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>
                      <code>{st.biometric_id || '—'}</code>
                    </td>
                    <td>
                      {st.active ? (
                        <span className="pill pill-in"><Icon name="check" size={13} /> Active</span>
                      ) : (
                        <span className="pill pill-muted"><Icon name="userX" size={13} /> Left hostel</span>
                      )}
                    </td>
                    <td className="right">
                      <div className="row-actions">
                        <Button size="sm" variant="ghost" icon="reset" onClick={() => reset(st)} loading={busy === `r${st.id}`}>
                          Reset password
                        </Button>
                        {st.active ? (
                          <Button size="sm" variant="danger-soft" icon="userX" onClick={() => toggle(st)} loading={busy === `t${st.id}`}>
                            Deactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="success-soft" icon="userCheck" onClick={() => toggle(st)} loading={busy === `t${st.id}`}>
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a new student"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" icon="plus" type="submit" form="add-student" loading={busy === 'add'}>
              Add student
            </Button>
          </>
        }
      >
        <form id="add-student" className="form-grid" onSubmit={add}>
          <Field label="Full name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sakshi Patil" required autoFocus />
          </Field>
          <Field label="Username" hint="Used to log in (lowercase)">
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. s111" required autoCapitalize="none" />
          </Field>
          <Field label="Room">
            <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. 106" />
          </Field>
          <Field label="Admission date">
            <input type="date" value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} />
          </Field>
          <Field label="Biometric ID" hint="Optional, for the gate device">
            <input value={form.biometric_id} onChange={(e) => setForm({ ...form, biometric_id: e.target.value })} placeholder="e.g. FP111" />
          </Field>
          <Field label="Starting password" hint="She can change it after logging in">
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </Field>
        </form>
      </Modal>
    </Layout>
  )
}