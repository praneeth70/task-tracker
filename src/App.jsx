import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!session) {
    return <AuthPage />
  }

  if (page === 'analytics') {
    return (
      <Analytics
        session={session}
        onBack={() => setPage('dashboard')}
      />
    )
  }

  return (
    <Dashboard
      session={session}
      onAnalytics={() => setPage('analytics')}
    />
  )
}

export default App