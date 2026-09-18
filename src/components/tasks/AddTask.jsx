import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function AddTask({
  userId,
  taskDate,
  onTaskAdded
}) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [weight, setWeight] = useState(1)
  const [loading, setLoading] = useState(false)

  function validateTask() {
    if (!title.trim()) return false

    if (
      startTime &&
      endTime &&
      endTime <= startTime
    ) {
      window.alert(
        'Finish time must be after start time.'
      )
      return false
    }

    const numericWeight = Number(weight)

    if (
      !Number.isInteger(numericWeight) ||
      numericWeight < 1 ||
      numericWeight > 4
    ) {
      window.alert(
        'Weight must be between 1 and 4.'
      )
      return false
    }

    return true
  }

  function resetForm() {
    setTitle('')
    setStartTime('')
    setEndTime('')
    setWeight(1)
  }

  async function createTask() {
    if (!validateTask() || loading) return

    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: title.trim(),
        task_date: taskDate,
        start_time: startTime || null,
        end_time: endTime || null,
        weight: Number(weight)
      })

    if (error) {
      console.error(
        'ADD TASK FAILED:',
        error
      )
      setLoading(false)
      return
    }

    resetForm()
    setLoading(false)

    await onTaskAdded()
  }

  async function createRecurringTask() {
    if (!validateTask() || loading) return

    setLoading(true)

    const date = new Date(
      `${taskDate}T00:00:00`
    )

    const dayOfWeek = date.getDay()

    const {
      data: recurringTask,
      error: recurringError
    } = await supabase
      .from('recurring_tasks')
      .insert({
        user_id: userId,
        title: title.trim(),
        days_of_week: [dayOfWeek],
        start_date: taskDate,
        start_time: startTime || null,
        end_time: endTime || null,
        weight: Number(weight)
      })
      .select()
      .single()

    if (recurringError) {
      console.error(
        'ADD RECURRING TASK FAILED:',
        recurringError
      )
      setLoading(false)
      return
    }

    const { error: taskError } =
      await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          recurring_task_id:
            recurringTask.id,
          title: title.trim(),
          task_date: taskDate,
          start_time:
            startTime || null,
          end_time:
            endTime || null,
          weight: Number(weight)
        })

    if (taskError) {
      console.error(
        'ADD RECURRING OCCURRENCE FAILED:',
        taskError
      )

      await supabase
        .from('recurring_tasks')
        .delete()
        .eq(
          'id',
          recurringTask.id
        )

      setLoading(false)
      return
    }

    resetForm()
    setLoading(false)

    await onTaskAdded()
  }

  function handleKeyDown(e) {
    if (
      e.key !== 'Enter' ||
      loading
    ) {
      return
    }

    e.preventDefault()

    if (e.shiftKey) {
      createRecurringTask()
    } else {
      createTask()
    }
  }

  return (
    <form
      className="add-task"
      onSubmit={e => {
        e.preventDefault()
        createTask()
      }}
    >
      <input
        value={title}
        onChange={e =>
          setTitle(e.target.value)
        }
        onKeyDown={handleKeyDown}
        placeholder="What needs to get done?"
        autoComplete="off"
        disabled={loading}
      />

      <input
        className="task-time"
        type="time"
        value={startTime}
        onChange={e =>
          setStartTime(e.target.value)
        }
        disabled={loading}
        title="Start time"
      />

      <span className="time-separator">
        →
      </span>

      <input
        className="task-time"
        type="time"
        value={endTime}
        onChange={e =>
          setEndTime(e.target.value)
        }
        disabled={loading}
        title="Finish time"
      />

      <select
        className="task-weight"
        value={weight}
        onChange={e =>
          setWeight(Number(e.target.value))
        }
        disabled={loading}
        title="Task weight"
        aria-label="Task weight"
      >
        <option value={1}>1 · Normal</option>
        <option value={2}>2 · Work / Gym</option>
        <option value={3}>3 · Study</option>
        <option value={4}>4 · Project</option>
      </select>

      <button
        type="submit"
        disabled={
          loading ||
          !title.trim()
        }
      >
        {loading
          ? '...'
          : 'Enter ↵'}
      </button>
    </form>
  )
}

export default AddTask