import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function AddTask({ userId, taskDate, onTaskAdded }) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title.trim() || loading) return

    if (startTime && endTime && endTime <= startTime) {
      window.alert('Finish time must be after start time.')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: title.trim(),
        task_date: taskDate,
        start_time: startTime || null,
        end_time: endTime || null
      })

    setLoading(false)

    if (error) {
      console.error('ADD TASK FAILED:', error)
      return
    }

    setTitle('')
    setStartTime('')
    setEndTime('')
    onTaskAdded()
  }

  return (
    <form className="add-task" onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to get done?"
        autoComplete="off"
        disabled={loading}
      />

      <input
        className="task-time"
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        disabled={loading}
        title="Start time"
      />

      <span className="time-separator">→</span>

      <input
        className="task-time"
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        disabled={loading}
        title="Finish time"
      />

      <button type="submit" disabled={loading || !title.trim()}>
        {loading ? '...' : 'Enter ↵'}
      </button>
    </form>
  )
}

export default AddTask