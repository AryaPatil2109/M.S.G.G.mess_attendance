import { useState } from 'react'
import { useAuth } from '../auth.jsx'

/* ── inline SVG icons so the login page has zero extra deps ── */
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}
function BuildingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="12"/>
      <path d="M3 10l9-7 9 7"/>
      <line x1="9" y1="22" x2="9" y2="14"/>
      <line x1="15" y1="22" x2="15" y2="14"/>
      <rect x="9" y="14" width="6" height="8"/>
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      {/* Background image with dark overlay */}
      <div style={styles.bg} />
      <div style={styles.overlay} />

      {/* Top Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navBrand}>
          <div style={styles.navIconWrap}>
            <BuildingIcon />
          </div>
          <div style={styles.navBrandText}>
            <span style={styles.navTitle}>Cedar House</span>
            <span style={styles.navSub}>Hostel Management</span>
          </div>
        </div>
        <div style={styles.navTagline}>
          Safe Stay&nbsp;•&nbsp;Better Learning&nbsp;•&nbsp;Brighter Future
        </div>
      </nav>

      {/* Centered Login Card */}
      <main style={styles.main}>
        <form style={styles.card} onSubmit={submit} noValidate>
          {/* Institution icon */}
          <div style={styles.iconWrap}>
            <BuildingIcon />
          </div>

          <h1 style={styles.heading}>Welcome Back</h1>
          <p style={styles.subheading}>Sign in to manage your hostel</p>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {/* Username */}
          <div style={styles.fieldGroup}>
            <div style={styles.fieldIconRow}>
              <span style={styles.fieldIcon}><UserIcon /></span>
              <span style={styles.fieldLabel}>Username</span>
            </div>
            <input
              id="login-username"
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              required
            />
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <div style={styles.fieldIconRow}>
              <span style={styles.fieldIcon}><LockIcon /></span>
              <span style={styles.fieldLabel}>Password</span>
            </div>
            <div style={styles.passwordWrap}>
              <input
                id="login-password"
                style={{ ...styles.input, paddingRight: '48px' }}
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoCapitalize="none"
                required
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            style={loading ? { ...styles.submitBtn, ...styles.submitBtnLoading } : styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              <ArrowRightIcon />
            )}
            {loading ? 'Signing in…' : 'Sign In To Dashboard'}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>© {new Date().getFullYear()} MessMate · Hostel Mess Management</span>
        <span style={styles.footerDivider}>•</span>
        <span>Developed &amp; Maintained by <strong style={{ color: '#fff', fontWeight: 600 }}>Lokare's Infotech</strong></span>
      </footer>
    </div>
  )
}

/* ── Styles ── */
const GREEN = '#1a7a4a'
const GREEN_DARK = '#145f39'
const GREEN_LIGHT = '#e8f5ee'

const styles = {
  root: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    overflowY: 'auto',
  },
  bg: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'url(/hostel_bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(3px) brightness(0.55)',
    transform: 'scale(1.05)',
    zIndex: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 1,
  },
  /* Navbar */
  navbar: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 32px',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navIconWrap: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    background: GREEN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navBrandText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
  },
  navTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: '17px',
    letterSpacing: '0.01em',
  },
  navSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '12px',
    fontWeight: '400',
  },
  navTagline: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: '13px',
    fontWeight: '500',
    letterSpacing: '0.02em',
  },
  /* Main */
  main: {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px 48px',
  },
  /* Card */
  card: {
    background: '#fff',
    borderRadius: '20px',
    padding: '40px 36px 36px',
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)',
  },
  iconWrap: {
    width: '62px',
    height: '62px',
    borderRadius: '16px',
    background: GREEN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: `0 4px 16px ${GREEN}55`,
  },
  heading: {
    margin: '0 0 6px',
    fontSize: '26px',
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: '-0.02em',
    textAlign: 'center',
  },
  subheading: {
    margin: '0 0 24px',
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#dc2626',
    fontSize: '13.5px',
    marginBottom: '16px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  /* Fields */
  fieldGroup: {
    width: '100%',
    marginBottom: '18px',
  },
  fieldIconRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    justifyContent: 'center',
  },
  fieldIcon: {
    color: GREEN,
    display: 'flex',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    background: '#eef4fb',
    border: '2px solid transparent',
    borderRadius: '12px',
    fontSize: '15px',
    color: '#1a1a2e',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: 'inherit',
  },
  passwordWrap: {
    position: 'relative',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: GREEN,
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  },
  /* Submit button */
  submitBtn: {
    width: '100%',
    padding: '15px 24px',
    background: GREEN,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15.5px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '8px',
    letterSpacing: '0.01em',
    transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
    boxShadow: `0 4px 16px ${GREEN}44`,
    fontFamily: 'inherit',
  },
  submitBtnLoading: {
    background: GREEN_DARK,
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: {
    position: 'relative',
    zIndex: 10,
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.8)',
    background: 'rgba(10, 15, 25, 0.6)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
    textAlign: 'center',
  },
  footerDivider: {
    color: 'rgba(255, 255, 255, 0.35)',
  },
}
