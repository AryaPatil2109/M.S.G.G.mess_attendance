import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api.js'
import { useRouter } from './router.jsx'

/* ------------------------------------------------------------ auth state */
const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export const HOME_FOR = { student: '/student', rector: '/rector', mess: '/mess' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still checking
  const { navigate } = useRouter()

  useEffect(() => {
    api
      .get('/api/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
    const onExpired = () => {
      setUser(null)
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [navigate])

  const login = useCallback(
    async (username, password) => {
      const r = await api.post('/api/login', { username, password })
      setUser(r.user)
      navigate(HOME_FOR[r.user.role], { replace: true })
    },
    [navigate],
  )

  const logout = useCallback(async () => {
    await api.post('/api/logout').catch(() => {})
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>
}
