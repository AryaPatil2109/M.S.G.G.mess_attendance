import { useState } from 'react'
import { api } from '../api.js'
import Layout from '../components/Layout.jsx'
import { Icon } from '../icons.jsx'
import { Button, Card, Empty, Loader, fmtDate, useData, useToast } from '../ui.jsx'

export default function Backups() {
  const toast = useToast()
  const { data, reload } = useData(() => api.get('/api/rector/backups'))
  const [busy, setBusy] = useState(false)

  const backupNow = async () => {
    setBusy(true)
    try {
      const r = await api.post('/api/rector/backups')
      toast(r.message)
      await reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout
      title="Backups"
      subtitle="Your data is safe — a rolling one-month backup"
      actions={
        <Button variant="primary" icon="database" onClick={backupNow} loading={busy}>
          Back up now
        </Button>
      }
    >
      {!data ? (
        <Loader />
      ) : (
        <>
          <div className="info-strip">
            <div>
              <span className="kpi-icon"><Icon name="refresh" size={18} /></span>
              <div><b>Every hour</b><span>Automatic backup</span></div>
            </div>
            <div>
              <span className="kpi-icon"><Icon name="calendar" size={18} /></span>
              <div><b>{data.keep} days</b><span>Kept, older ones removed</span></div>
            </div>
            <div>
              <span className="kpi-icon"><Icon name="database" size={18} /></span>
              <div><b>{data.files.length} files</b><span>Available to restore</span></div>
            </div>
          </div>

          <Card title="Backup files" subtitle={data.folder} icon="database" pad={false}>
            {data.files.length === 0 ? (
              <Empty icon="database" title="No backups yet" text="Click “Back up now” or wait for the hourly backup." />
            ) : (
              <ul className="file-list">
                {data.files.map((f) => (
                  <li key={f.name}>
                    <span className="file-icon"><Icon name="database" size={16} /></span>
                    <div>
                      <b>{fmtDate(f.name.slice(7, 17), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>
                      <span>{f.name} · {f.size_kb} KB · last updated {f.modified.slice(11)}</span>
                    </div>
                    <a className="btn btn-ghost btn-sm" href={`/api/rector/backups/${f.name}`}>
                      <Icon name="download" size={14} /> <span>Download</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="alert alert-info">
            <Icon name="info" size={18} />
            <div>
              <b>To restore a backup:</b> stop the backend, run <code>python backup.py restore YYYY-MM-DD</code>, then start it again.
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
