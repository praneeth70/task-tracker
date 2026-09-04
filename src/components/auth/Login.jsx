import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (result.error) {
      setMessage(result.error.message)
      return
    }

    if (!isLogin) {
      setMessage('Account created. You can now sign in.')
      setIsLogin(true)
      setPassword('')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-box">

        <div className="brand">
          <span className="brand-mark">L</span>
          <span>THE LEDGER</span>
        </div>

        <div className="intro">
          <p className="eyebrow">
            {isLogin ? 'Welcome back' : 'Start keeping score'}
          </p>

          <h1>
            {isLogin
              ? 'Your actions leave a record.'
              : 'Build the record you want.'}
          </h1>

          <p className="subtitle">
            Plan tomorrow. Execute today. Look back honestly.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : isLogin
                ? 'Sign in'
                : 'Create account'}
          </button>

        </form>

        {message && (
          <p className="message">{message}</p>
        )}

        <button
          className="switch-button"
          onClick={() => {
            setIsLogin(!isLogin)
            setMessage('')
          }}
        >
          {isLogin
            ? 'New here? Create an account'
            : 'Already have an account? Sign in'}
        </button>

      </section>
    </main>
  )
}

export default Login