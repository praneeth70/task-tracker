import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Areas from './pages/Areas'
import AreaDetail from './pages/AreaDetail'
import Streaks from './pages/Streaks'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [selectedArea, setSelectedArea] = useState(null)

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

  if (page === 'areas') {
    return (
      <Areas
        session={session}
        onBack={() => setPage('dashboard')}
        onOpenArea={(area) => {
          setSelectedArea(area)
          setPage('area')
        }}
      />
    )
  }

  if (page === 'area') {
    return (
      <AreaDetail
        session={session}
        area={selectedArea}
        onBack={() => setPage('areas')}
      />
    )
  }

  if (page === 'streaks') {
    return (
      <Streaks
        session={session}
        onBack={() => setPage('dashboard')}
      />
    )
  }

  return (
    <Dashboard
      session={session}
      onAnalytics={() => setPage('analytics')}
      onAreas={() => setPage('areas')}
      onStreaks={() => setPage('streaks')}
    />
  )
}

export default App