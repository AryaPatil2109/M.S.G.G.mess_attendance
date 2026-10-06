// A tiny client-side router (no extra library needed).
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const RouterCtx = createContext({ path: '/', navigate: () => {} })

export function Router({ children }) {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to === window.location.pathname) return
    window.history[replace ? 'replaceState' : 'pushState']({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }, [])

  return <RouterCtx.Provider value={{ path, navigate }}>{children}</RouterCtx.Provider>
}

export const useRouter = () => useContext(RouterCtx)

export function Link({ to, children, onClick, ...rest }) {
  const { navigate } = useRouter()
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}

export function Redirect({ to }) {
  const { navigate } = useRouter()
  useEffect(() => navigate(to, { replace: true }), [to, navigate])
  return null
}
