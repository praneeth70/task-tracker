import Task from './Task'

function TaskList({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  locked = false
}) {
  return (
    <div className="task-list">
      {tasks.map(task => (
        <Task
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          locked={locked}
        />
      ))}
    </div>
  )
}

export default TaskList