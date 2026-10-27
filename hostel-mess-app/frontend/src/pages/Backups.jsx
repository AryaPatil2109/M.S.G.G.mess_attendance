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
      toast(r.message || 'Backup completed successfully!')

      // Automatically trigger download of the 30-day student data CSV file
      try {
        const downloadUrl = r.csv_url || `/api/rector/backups/students-30days.csv?t=${Date.now()}`
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = r.csv_file || `hostel_students_30days_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (dlErr) {
        console.warn('Auto-download CSV failed:', dlErr)
      }

      await reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const daysList = data?.days || (data?.files ? [{
    day: new Date().toISOString().slice(0, 10),
    modified: 'today',
    db_file: data.files.find(f => !f.name.endsWith('.csv')),
    csv_file: data.files.find(f => f.name.endsWith('.csv')),
  }] : [])

  return (
    <Layout
      title="Backups"
      subtitle="Your data is safe — a rolling one-month backup of students and attendance"
      actions={
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            className="btn btn-default"
            href="/api/rector/backups/students-30days.csv"
            title="Download full 30-day student attendance, mess and gate log CSV"
          >
            <Icon name="download" size={14} /> <span>Download 30-Day Student CSV</span>
          </a>
          <a
            className="btn btn-default"
            href="/api/rector/students/export.csv"
            title="Download students.csv master directory"
          >
            <Icon name="users" size={14} /> <span>Student Directory CSV</span>
          </a>
          <Button variant="primary" icon="database" onClick={backupNow} loading={busy}>
            Back up now
          </Button>
        </div>
      }
    >
      {!data ? (
        <Loader />
      ) : (
        <>
          <div className="info-strip">
            <div>
              <span className="kpi-icon"><Icon name="refresh" size={18} /></span>
              <div><b>Every hour</b><span>Automatic rolling backup</span></div>
            </div>
            <div>
              <span className="kpi-icon"><Icon name="calendar" size={18} /></span>
              <div><b>{data.keep} days</b><span>Retention window</span></div>
            </div>
            <div>
              <span className="kpi-icon"><Icon name="database" size={18} /></span>
              <div><b>{daysList.length} days</b><span>Available DB & CSV backups</span></div>
            </div>
          </div>

          <Card title="Backup files & 30-day student records" subtitle={data.folder} icon="database" pad={false}>
            {daysList.length === 0 ? (
              <Empty icon="database" title="No backups yet" text="Click “Back up now” or wait for the hourly backup." />
            ) : (
              <ul className="file-list">
                {daysList.map((d) => (
                  <li key={d.day}>
                    <span className="file-icon"><Icon name="calendar" size={16} /></span>
                    <div>
                      <b>{fmtDate(d.day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>
                      <span>
                        30-Day Student CSV {d.csv_file ? `(${d.csv_file.size_kb} KB)` : ''} · Database dump {d.db_file ? `(${d.db_file.size_kb} KB)` : ''} · Updated {d.modified?.slice(11) || d.modified || 'today'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        className="btn btn-default btn-sm"
                        href={`/api/rector/backups/${d.csv_file?.name || `hostel_students_30days_${d.day}.csv`}`}
                        title="Download 30-day student attendance and activity CSV"
                      >
                        <Icon name="download" size={14} /> <span>Download CSV</span>
                      </a>
                      {d.db_file && (
                        <a
                          className="btn btn-ghost btn-sm"
                          href={`/api/rector/backups/${d.db_file.name}`}
                          title="Download database dump for restoration"
                        >
                          <Icon name="database" size={14} /> <span>DB File</span>
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="alert alert-info">
            <Icon name="info" size={18} />
            <div>
              <b>To restore a database backup:</b> stop the backend, run <code>python backup.py restore YYYY-MM-DD</code>, then start it again.
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
