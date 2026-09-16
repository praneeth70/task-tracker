import { useState } from 'react'
import Task from './Task'

function TaskList({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  onReorder,
  onAreaAssigned,
  locked = false
}) {
  const [draggedTask, setDraggedTask] = useState(null)

  function handleDragStart(task) {
    if (locked) return
    setDraggedTask(task)
  }

  function handleDrop(targetTask) {
    if (!draggedTask) return
    if (draggedTask.id === targetTask.id) return

    onReorder(draggedTask, targetTask)
    setDraggedTask(null)
  }

  function handleDragEnd() {
    setDraggedTask(null)
  }

  return (
    <div className="task-list">
      {tasks.map(task => (
        <Task
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onFocus={onFocus}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onAreaAssigned={onAreaAssigned}
          locked={locked}
        />
      ))}
    </div>
  )
}

export default TaskList