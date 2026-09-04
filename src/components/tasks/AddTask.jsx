import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function AddTask({ userId, taskDate, onTaskAdded }) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title.trim()) return

    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: title.trim(),
        task_date: taskDate
      })

    setLoading(false)

    if (error) {
      console.error(error)
      return
    }

    setTitle('')
    onTaskAdded()
  }

  return (
    <form className="add-task" onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to get done?"
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add'}
      </button>
    </form>
  )
}

export default AddTask