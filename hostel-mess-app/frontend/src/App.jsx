import { AuthProvider, HOME_FOR, useAuth } from './auth.jsx'
import { Redirect, Router, useRouter } from './router.jsx'
import { FeedbackProvider, Loader } from './ui.jsx'
import Login from './pages/Login.jsx'
import Student from './pages/Student.jsx'
import RectorDashboard from './pages/RectorDashboard.jsx'
import Students from './pages/Students.jsx'
import Mess from './pages/Mess.jsx'
import History from './pages/History.jsx'
import Settings from './pages/Settings.jsx'
import Backups from './pages/Backups.jsx'
import Account from './pages/Account.jsx'

/* ---------------------------------------------------------------- routes */
const ROUTES = [
  { path: '/student', roles: ['student'], page: Student },
  { path: '/rector', roles: ['rector'], page: RectorDashboard },
  { path: '/rector/students', roles: ['rector'], page: Students },
  { path: '/rector/history', roles: ['rector'], page: History },
  { path: '/rector/settings', roles: ['rector'], page: Settings },
  { path: '/rector/backups', roles: ['rector'], page: Backups },
  { path: '/mess', roles: ['mess', 'rector'], page: Mess },
  { path: '/account', roles: ['student', 'rector', 'mess'], page: Account },
]

function Routes() {
  const { user } = useAuth()
  const { path } = useRouter()

  if (user === undefined) return <Loader />
  if (!user) return path === '/login' ? <Login /> : <Redirect to="/login" />
  if (path === '/login' || path === '/') return <Redirect to={HOME_FOR[user.role]} />

  const route = ROUTES.find((r) => r.path === path.replace(/\/$/, ''))
  if (!route || !route.roles.includes(user.role)) return <Redirect to={HOME_FOR[user.role]} />
  const Page = route.page
  return <Page />
}

export default function App() {
  return (
    <Router>
      <FeedbackProvider>
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </FeedbackProvider>
    </Router>
  )
}
