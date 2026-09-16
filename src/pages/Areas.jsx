import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Areas({ session, onBack, onOpenArea }) {
  const [areas, setAreas] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadAreas()
  }, [])

  async function loadAreas() {
    setLoading(true)

    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('LOAD AREAS FAILED:', error)
      setLoading(false)
      return
    }

    setAreas(data || [])
    setLoading(false)
  }

  async function addArea() {
    const trimmedName = name.trim()

    if (!trimmedName || adding) return

    setAdding(true)

    const { data, error } = await supabase
      .from('areas')
      .insert({
        user_id: session.user.id,
        name: trimmedName
      })
      .select()
      .single()

    if (error) {
      console.error('ADD AREA FAILED:', error)
      setAdding(false)
      return
    }

    setAreas(prev => [...prev, data])
    setName('')
    setAdding(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      addArea()
    }
  }

  return (
    <div className="analytics">
      <button
        className="analytics-back"
        onClick={onBack}
      >
        ← Back
      </button>

      <div className="eyebrow">
        AREAS
      </div>

      <h1>
        Organize.
      </h1>

      <div className="add-task">
        <input
          type="text"
          placeholder="Area name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          onClick={addArea}
          disabled={!name.trim() || adding}
        >
          {adding ? 'Adding...' : 'Add Area'}
        </button>
      </div>

      <div className="task-list">
        {loading ? (
          <div className="empty">
            Loading...
          </div>
        ) : areas.length === 0 ? (
          <div className="empty">
            No areas yet.
          </div>
        ) : (
          areas.map(area => (
            <div
              key={area.id}
              className="task"
              onClick={() => onOpenArea(area)}
              style={{ cursor: 'pointer' }}
            >
              <span>
                {area.name}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Areas