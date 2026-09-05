import { useState } from 'react'

function Task({
  task,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  locked = false
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [startTime, setStartTime] = useState(task.start_time || '')
  const [endTime, setEndTime] = useState(task.end_time || '')

  function startEditing() {
    if (locked) return

    setTitle(task.title)
    setStartTime(task.start_time || '')
    setEndTime(task.end_time || '')
    setEditing(true)
  }

  async function saveEdit() {
    const newTitle = title.trim()

    if (!newTitle) {
      setTitle(task.title)
      setEditing(false)
      return
    }

    if (startTime && endTime && endTime <= startTime) {
      window.alert('Finish time must be after start time.')
      return
    }

    const changed =
      newTitle !== task.title ||
      startTime !== (task.start_time || '') ||
      endTime !== (task.end_time || '')

    if (!changed) {
      setEditing(false)
      return
    }

    await onEdit(task, newTitle, startTime, endTime)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.target.blur()
    }

    if (e.key === 'Escape') {
      setTitle(task.title)
      setStartTime(task.start_time || '')
      setEndTime(task.end_time || '')
      setEditing(false)
    }
  }

  function formatTime(time) {
    if (!time) return ''

    const [hour, minute] = time.split(':')
    const h = Number(hour)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const displayHour = h % 12 || 12

    return `${displayHour}:${minute} ${suffix}`
  }

  const hasTime = task.start_time || task.end_time

  return (
    <div className={`task ${task.is_focus ? 'focus-task' : ''}`}>

      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
      />

      {editing ? (
        <div className="task-edit-area">

          <input
            className="task-edit-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          <div className="task-edit-times">
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />

            <span>→</span>

            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />

            <button
              type="button"
              onClick={saveEdit}
            >
              Save
            </button>

            <button
              type="button"
              onClick={() => {
                setTitle(task.title)
                setStartTime(task.start_time || '')
                setEndTime(task.end_time || '')
                setEditing(false)
              }}
            >
              Cancel
            </button>
          </div>

        </div>
      ) : (
        <span className={task.completed ? 'completed' : ''}>
          {task.title}
        </span>
      )}

      {!editing && hasTime && (
        <span className="task-time-display">
          {task.start_time && formatTime(task.start_time)}
          {task.start_time && task.end_time && ' → '}
          {task.end_time && formatTime(task.end_time)}
        </span>
      )}

      {!locked && !editing && (
        <div className="task-actions">

          <button
            type="button"
            className={`focus-button ${task.is_focus ? 'active' : ''}`}
            onClick={() => onFocus(task)}
            title={task.is_focus ? 'Remove from focus' : 'Add to focus'}
          >
            {task.is_focus ? '★' : '☆'}
          </button>

          <button
            type="button"
            onClick={startEditing}
            title="Edit task"
          >
            ✏️
          </button>

          <button
            type="button"
            onClick={() => onDelete(task)}
            title="Delete task"
          >
            🗑️
          </button>

        </div>
      )}

    </div>
  )
}

export default Task