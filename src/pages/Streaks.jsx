import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function getToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function changeDate(date, offset) {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + offset)
  const nextYear = next.getFullYear()
  const nextMonth = String(next.getMonth() + 1).padStart(2, '0')
  const nextDay = String(next.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}

function calculateStreak(entries) {
  const completedDates = new Set(
    entries.filter(entry => entry.completed).map(entry => entry.entry_date)
  )

  let current = 0
  let cursor = getToday()

  while (completedDates.has(cursor)) {
    current++
    cursor = changeDate(cursor, -1)
  }

  let best = 0
  const sortedDates = Array.from(completedDates).sort()

  for (const date of sortedDates) {
    let length = 1
    let next = changeDate(date, 1)

    while (completedDates.has(next)) {
      length++
      next = changeDate(next, 1)
    }

    best = Math.max(best, length)
  }

  return { current, best, completedDates }
}

function formatDate(date) {
  const [year, month, day] = date.split('-').map(Number)

  return new Date(year, month - 1, day).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  )
}

function Streaks({ session, onBack }) {
  const [streaks, setStreaks] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    setActionError('')

    const [
      { data: streakData, error: streakError },
      { data: entryData, error: entryError }
    ] = await Promise.all([
      supabase
        .from('streaks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true }),

      supabase
        .from('streak_entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('entry_date', { ascending: true })
    ])

    if (streakError) {
      console.error('LOAD STREAKS FAILED:', streakError)
      setActionError('Could not load your streaks.')
      setLoading(false)
      return
    }

    if (entryError) {
      console.error('LOAD STREAK ENTRIES FAILED:', entryError)
      setActionError('Could not load streak history.')
      setLoading(false)
      return
    }

    setStreaks(streakData || [])
    setEntries(entryData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const entriesByStreak = useMemo(() => {
    const map = new Map()

    for (const entry of entries) {
      if (!map.has(entry.streak_id)) {
        map.set(entry.streak_id, [])
      }

      map.get(entry.streak_id).push(entry)
    }

    return map
  }, [entries])

  async function createStreak(event) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) return

    setSaving(true)
    setActionError('')

    const { error } = await supabase
      .from('streaks')
      .insert({
        user_id: session.user.id,
        name: trimmedName,
        description: description.trim() || null,
        start_date: getToday(),
        active: true
      })

    if (error) {
      console.error('CREATE STREAK FAILED:', error)
      setActionError('Could not create the streak.')
      setSaving(false)
      return
    }

    setName('')
    setDescription('')
    setShowAdd(false)
    setSaving(false)
    await loadData()
  }

  async function checkIn(streakId) {
    setActionError('')

    const { error } = await supabase
      .from('streak_entries')
      .insert({
        streak_id: streakId,
        user_id: session.user.id,
        entry_date: getToday(),
        completed: true
      })

    if (error) {
      if (error.code === '23505') {
        setActionError('You already checked in today.')
      } else {
        console.error('STREAK CHECK-IN FAILED:', error)
        setActionError('Could not record today.')
      }

      return
    }

    await loadData()
  }

  async function resetStreak(streak) {
    const confirmed = window.confirm(
      `Reset "${streak.name}" and start a new streak today? Your previous history will remain.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('streaks')
      .update({ start_date: getToday() })
      .eq('id', streak.id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('RESET STREAK FAILED:', error)
      setActionError('Could not reset the streak.')
      return
    }

    await loadData()
  }

  async function deleteStreak(streak) {
    const confirmed = window.confirm(
      `Delete "${streak.name}" and all of its history?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('streaks')
      .delete()
      .eq('id', streak.id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('DELETE STREAK FAILED:', error)
      setActionError('Could not delete the streak.')
      return
    }

    await loadData()
  }

  if (loading) {
    return (
      <main className="streaks-page">
        <div className="loading">
          Loading streaks...
        </div>
      </main>
    )
  }

  return (
    <main className="streaks-page">
      <button
        type="button"
        className="analytics-back"
        onClick={onBack}
      >
        ← Back to Ledger
      </button>

      <div className="streaks-header">
        <div>
          <p className="eyebrow">STREAKS</p>
          <h1>Keep the chain.</h1>
          <p className="streaks-subtitle">
            Build habits one day at a time.
          </p>
        </div>

        <button
          type="button"
          className="analytics-button streak-add-button"
          onClick={() => setShowAdd(prev => !prev)}
        >
          + Add streak
        </button>
      </div>

      {actionError && (
        <div className="streak-action-error" role="alert">
          {actionError}
          <button
            type="button"
            onClick={() => setActionError('')}
          >
            Dismiss
          </button>
        </div>
      )}

      {showAdd && (
        <form className="streak-form" onSubmit={createStreak}>
          <input
            type="text"
            placeholder="e.g. No Sugar"
            value={name}
            maxLength={100}
            onChange={event => setName(event.target.value)}
            autoFocus
          />

          <input
            type="text"
            placeholder="Optional description"
            value={description}
            maxLength={200}
            onChange={event => setDescription(event.target.value)}
          />

          <button
            type="submit"
            disabled={saving || !name.trim()}
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {streaks.length === 0 ? (
        <section className="streak-empty">
          <p className="eyebrow">NO STREAKS YET</p>
          <h2>Start with one thing.</h2>
          <p>
            Create something you want to do every day.
          </p>
        </section>
      ) : (
        <section className="streak-list">
          {streaks.map(streak => {
            const streakEntries =
              entriesByStreak.get(streak.id) || []

            const {
              current,
              best,
              completedDates
            } = calculateStreak(streakEntries)

            const checkedToday =
              completedDates.has(getToday())

            return (
              <article
                className="streak-card"
                key={streak.id}
              >
                <div className="streak-card-main">
                  <div className="streak-card-heading">
                    <div>
                      <p className="eyebrow">STREAK</p>
                      <h2>{streak.name}</h2>

                      {streak.description && (
                        <p>{streak.description}</p>
                      )}
                    </div>

                    <div className="streak-current">
                      <strong>{current}</strong>
                      <span>
                        {current === 1 ? 'DAY' : 'DAYS'}
                      </span>
                    </div>
                  </div>

                  <div className="streak-stats">
                    <div>
                      <strong>{current}</strong>
                      <span>current</span>
                    </div>

                    <div>
                      <strong>{best}</strong>
                      <span>best</span>
                    </div>

                    <div>
                      <strong>
                        {streakEntries.filter(
                          entry => entry.completed
                        ).length}
                      </strong>
                      <span>total check-ins</span>
                    </div>

                    <div>
                      <strong>
                        {formatDate(streak.start_date)}
                      </strong>
                      <span>started</span>
                    </div>
                  </div>

                  <div className="streak-actions">
                    <button
                      type="button"
                      className={
                        checkedToday
                          ? 'streak-checkin completed'
                          : 'streak-checkin'
                      }
                      disabled={checkedToday}
                      onClick={() => checkIn(streak.id)}
                    >
                      {checkedToday
                        ? '✓ Done today'
                        : '✓ I did it today'}
                    </button>

                    <button
                      type="button"
                      className="streak-secondary"
                      onClick={() => resetStreak(streak)}
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      className="streak-secondary streak-delete"
                      onClick={() => deleteStreak(streak)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}

export default Streaks
