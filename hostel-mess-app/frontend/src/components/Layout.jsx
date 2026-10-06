import { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { Icon, Logo } from '../icons.jsx'
import { Link, useRouter } from '../router.jsx'
import { Avatar, useNow } from '../ui.jsx'

const NAV = {
  rector: [
    { to: '/rector', label: 'Dashboard', icon: 'dashboard' },
    { to: '/rector/students', label: 'Students', icon: 'users' },
    { to: '/mess', label: 'Mess board', icon: 'utensils' },
    { to: '/rector/history', label: 'History', icon: 'chart' },
    { to: '/rector/settings', label: 'Cut-off times', icon: 'clock' },
    { to: '/rector/backups', label: 'Backups', icon: 'database' },
  ],
  mess: [{ to: '/mess', label: 'Mess board', icon: 'utensils' }],
  student: [{ to: '/student', label: 'My meals', icon: 'utensils' }],
}
const ROLE_LABEL = { rector: 'Rector', mess: 'Mess manager', student: 'Student' }

function Clock() {
  const now = useNow(15000)
  return (
    <div className="clock">
      <Icon name="calendar" size={15} />
      <span>{now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      <b>{now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</b>
    </div>
  )
}

export default function Layout({ title, subtitle, actions, children, wide }) {
  const { user, logout } = useAuth()
  const { path } = useRouter()
  const [open, setOpen] = useState(false)
  const items = [...NAV[user.role], { to: '/account', label: 'Account', icon: 'key' }]

  useEffect(() => {
    document.title = `${title} · MessMate`
  }, [title])

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <Logo size={38} />
          <div>
            <b>MessMate</b>
            <small>Hostel mess attendance</small>
          </div>
        </div>
        <nav className="nav">
          <span className="nav-caption">Menu</span>
          {items.map((n) => (
            <Link key={n.to} to={n.to} className={`nav-item ${path === n.to ? 'active' : ''}`} onClick={() => setOpen(false)}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <Avatar name={user.name} size={38} />
          <div className="me">
            <b>{user.name}</b>
            <small>
              {ROLE_LABEL[user.role]}
              {user.room ? ` · Room ${user.room}` : ''}
            </small>
          </div>
          <button className="icon-btn on-dark" onClick={logout} title="Log out" aria-label="Log out">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <div className="tb-title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="tb-right">
            {actions}
            <Clock />
          </div>
        </header>
        <div className={`content ${wide ? 'wide' : ''}`}>{children}</div>
      </main>
    </div>
  )
}
