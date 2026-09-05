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

  function startEditing() {
    if (locked) return

    setTitle(task.title)
    setEditing(true)
  }

  async function saveEdit() {
    const newTitle = title.trim()

    if (!newTitle) {
      setTitle(task.title)
      setEditing(false)
      return
    }

    if (newTitle === task.title) {
      setEditing(false)
      return
    }

    await onEdit(task, newTitle)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.target.blur()
    }

    if (e.key === 'Escape') {
      setTitle(task.title)
      setEditing(false)
    }
  }

  return (
    <div className={`task ${task.is_focus ? 'focus-task' : ''}`}>

      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
      />

      {editing ? (
        <input
          className="task-edit-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span className={task.completed ? 'completed' : ''}>
          {task.title}
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