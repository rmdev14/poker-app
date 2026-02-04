import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ScreenLayout from '../components/ScreenLayout'
import './AdminLoginScreen.css'

function AdminLoginScreen() {
  const navigate = useNavigate()
  const { signIn, isAdmin } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (isAdmin) {
      navigate('/')
    }
  }, [isAdmin, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password || loading) return

    try {
      setLoading(true)
      setError(null)
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenLayout title="Admin Login" backPath="/">
      <div className="login-content">
        <div className="login-card">
          <div className="login-icon">🔐</div>
          <p className="login-subtitle">Sign in to manage game data</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-field">
              <label htmlFor="email" className="field-label">Email</label>
              <input
                id="email"
                type="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>

            <div className="form-field">
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                type="password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="login-error">{error}</div>
            )}

            <button
              type="submit"
              className={`login-btn ${(!email || !password) ? 'disabled' : ''}`}
              disabled={!email || !password || loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </ScreenLayout>
  )
}

export default AdminLoginScreen
