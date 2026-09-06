import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/layout/Header'
import TaskList from '../components/tasks/TaskList'
import AddTask from '../components/tasks/AddTask'

function Dashboard({ session, onAnalytics }) {
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const [activeSession, setActiveSession] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [focusedToday, setFocusedToday] = useState(0)
  const [selectedFocusTask, setSelectedFocusTask] = useState('')

  function getToday() {
    const date = new Date()

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function changeDate(date, offset) {
    const [year, month, day] = date.split('-').map(Number)
    const newDate = new Date(year, month - 1, day)

    newDate.setDate(newDate.getDate() + offset)

    const newYear = newDate.getFullYear()
    const newMonth = String(newDate.getMonth() + 1).padStart(2, '0')
    const newDay = String(newDate.getDate()).padStart(2, '0')

    return `${newYear}-${newMonth}-${newDay}`
  }

  function formatDisplayDate(date) {
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)

    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function getDayOfWeek(date) {
    const [year, month, day] = date.split('-').map(Number)

    return new Date(
      year,
      month - 1,
      day
    ).getDay()
  }

  async function loadTasks() {
    setLoading(true)

    const {
      data: existingTasks,
      error
    } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('task_date', selectedDate)
      .order('created_at')

    if (error) {
      console.error('LOAD TASKS FAILED:', error)
      setLoading(false)
      return
    }

    let finalTasks = existingTasks || []

    const today = getToday()

    if (selectedDate >= today) {
      const dayOfWeek = getDayOfWeek(selectedDate)

      const {
        data: recurringTasks,
        error: recurringError
      } = await supabase
        .from('recurring_tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('active', true)
        .contains('days_of_week', [dayOfWeek])

      if (recurringError) {
        console.error(
          'LOAD RECURRING TASKS FAILED:',
          recurringError
        )
      } else if (recurringTasks?.length) {
        const existingRecurringIds = new Set(
          finalTasks
            .filter(task => task.recurring_task_id)
            .map(task => task.recurring_task_id)
        )

        const missingTasks = recurringTasks
          .filter(
            recurringTask =>
              !existingRecurringIds.has(
                recurringTask.id
              )
          )
          .map(recurringTask => ({
            user_id: session.user.id,
            recurring_task_id: recurringTask.id,
            title: recurringTask.title,
            task_date: selectedDate,
            start_time: recurringTask.start_time,
            end_time: recurringTask.end_time
          }))

        if (missingTasks.length) {
          const {
            data: createdTasks,
            error: createError
          } = await supabase
            .from('tasks')
            .insert(missingTasks)
            .select()

          if (createError) {
            console.error(
              'CREATE RECURRING OCCURRENCES FAILED:',
              createError
            )
          } else {
            finalTasks = [
              ...finalTasks,
              ...(createdTasks || [])
            ]
          }
        }
      }
    }

    setTasks(finalTasks)
    setLoading(false)
  }

  async function loadFocusData() {
    const {
      data: active,
      error: activeError
    } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .is('end_time', null)
      .order('start_time', {
        ascending: false
      })
      .limit(1)

    if (activeError) {
      console.error(
        'ACTIVE SESSION FAILED:',
        activeError
      )
      return
    }

    let currentSession =
      active?.[0] || null

    if (currentSession) {
      const start = new Date(
        currentSession.start_time
      )

      const today = getToday()

      const startDate =
        `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`

      if (startDate !== today) {
        const midnight = new Date(start)

        midnight.setHours(
          24,
          0,
          0,
          0
        )

        const duration = Math.max(
          0,
          Math.floor(
            (
              midnight.getTime() -
              start.getTime()
            ) / 1000
          )
        )

        const { error } = await supabase
          .from('focus_sessions')
          .update({
            end_time:
              midnight.toISOString(),
            duration_seconds:
              duration
          })
          .eq(
            'id',
            currentSession.id
          )

        if (error) {
          console.error(
            'AUTO STOP FAILED:',
            error
          )
        }

        currentSession = null
      }
    }

    setActiveSession(currentSession)

    if (currentSession) {
      setElapsed(
        Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              new Date(
                currentSession.start_time
              ).getTime()
            ) / 1000
          )
        )
      )
    } else {
      setElapsed(0)
    }

    const today = getToday()

    const {
      data: sessions,
      error: sessionsError
    } = await supabase
      .from('focus_sessions')
      .select('duration_seconds')
      .eq(
        'user_id',
        session.user.id
      )
      .gte(
        'start_time',
        `${today}T00:00:00`
      )
      .lt(
        'start_time',
        `${changeDate(today, 1)}T00:00:00`
      )
      .not(
        'duration_seconds',
        'is',
        null
      )

    if (sessionsError) {
      console.error(
        'FOCUS TOTAL FAILED:',
        sessionsError
      )
      return
    }

    const total = (
      sessions || []
    ).reduce(
      (sum, item) =>
        sum +
        (item.duration_seconds || 0),
      0
    )

    setFocusedToday(total)
  }

  useEffect(() => {
    loadTasks()
  }, [selectedDate])

  useEffect(() => {
    loadFocusData()
  }, [])

  useEffect(() => {
    if (!activeSession) return

    const timer = setInterval(() => {
      setElapsed(
        Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              new Date(
                activeSession.start_time
              ).getTime()
            ) / 1000
          )
        )
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [activeSession])

  function formatDuration(seconds) {
    const hours = Math.floor(
      seconds / 3600
    )

    const minutes = Math.floor(
      (seconds % 3600) / 60
    )

    const secs = seconds % 60

    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].join(':')
  }

  async function startFocus() {
    if (activeSession) return

    const {
      data,
      error
    } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: session.user.id,
        task_id:
          selectedFocusTask || null,
        start_time:
          new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error(
        'START FOCUS FAILED:',
        error
      )
      return
    }

    setActiveSession(data)
    setElapsed(0)
  }

  async function stopFocus() {
    if (!activeSession) return

    const endTime = new Date()

    const startTime = new Date(
      activeSession.start_time
    )

    const duration = Math.max(
      0,
      Math.floor(
        (
          endTime.getTime() -
          startTime.getTime()
        ) / 1000
      )
    )

    const { error } = await supabase
      .from('focus_sessions')
      .update({
        end_time:
          endTime.toISOString(),
        duration_seconds:
          duration
      })
      .eq(
        'id',
        activeSession.id
      )

    if (error) {
      console.error(
        'STOP FOCUS FAILED:',
        error
      )
      return
    }

    setActiveSession(null)
    setElapsed(0)
    setSelectedFocusTask('')
    setFocusedToday(
      prev => prev + duration
    )
  }

  async function toggleTask(task) {
    const { error } = await supabase
      .from('tasks')
      .update({
        completed: !task.completed,
        completed_at:
          !task.completed
            ? new Date().toISOString()
            : null
      })
      .eq('id', task.id)

    if (error) {
      console.error(
        'UPDATE FAILED:',
        error
      )
      return
    }

    await loadTasks()
  }

  async function editTask(
    task,
    newTitle,
    startTime,
    endTime
  ) {
    if (
      startTime &&
      endTime &&
      endTime <= startTime
    ) {
      window.alert(
        'Finish time must be after start time.'
      )
      return
    }

    if (!task.recurring_task_id) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: newTitle,
          start_time:
            startTime || null,
          end_time:
            endTime || null
        })
        .eq('id', task.id)

      if (error) {
        console.error(
          'EDIT FAILED:',
          error
        )
        return
      }

      await loadTasks()
      return
    }

    const choice = window.prompt(
      'Recurring task edit:\n\n1 = This occurrence only\n2 = This & future occurrences\n\nEnter 1 or 2.'
    )

    if (choice !== '1' && choice !== '2') {
      return
    }

    if (choice === '1') {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: newTitle,
          start_time:
            startTime || null,
          end_time:
            endTime || null
        })
        .eq('id', task.id)

      if (error) {
        console.error(
          'EDIT OCCURRENCE FAILED:',
          error
        )
        return
      }

      await loadTasks()
      return
    }

    const {
      data: recurringTask,
      error: recurringFetchError
    } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq(
        'id',
        task.recurring_task_id
      )
      .single()

    if (recurringFetchError) {
      console.error(
        'LOAD RECURRING TASK FAILED:',
        recurringFetchError
      )
      return
    }

    const { error: ruleError } =
      await supabase
        .from('recurring_tasks')
        .update({
          title: newTitle,
          start_time:
            startTime || null,
          end_time:
            endTime || null
        })
        .eq(
          'id',
          task.recurring_task_id
        )

    if (ruleError) {
      console.error(
        'UPDATE RECURRING RULE FAILED:',
        ruleError
      )
      return
    }

    const { error: futureError } =
      await supabase
        .from('tasks')
        .update({
          title: newTitle,
          start_time:
            startTime || null,
          end_time:
            endTime || null
        })
        .eq(
          'recurring_task_id',
          task.recurring_task_id
        )
        .gte(
          'task_date',
          task.task_date
        )
        .eq(
          'completed',
          false
        )

    if (futureError) {
      console.error(
        'UPDATE FUTURE OCCURRENCES FAILED:',
        futureError
      )
      return
    }

    console.log(
      'Updated recurring task:',
      recurringTask.id
    )

    await loadTasks()
  }

  async function deleteTask(task) {
    if (task.recurring_task_id) {
      const confirmed =
        window.confirm(
          `"${task.title}" is a recurring task.\n\nOK = Stop recurring and delete this occurrence.\nCancel = Keep it.`
        )

      if (!confirmed) return

      const {
        error: recurringError
      } = await supabase
        .from('recurring_tasks')
        .update({
          active: false
        })
        .eq(
          'id',
          task.recurring_task_id
        )

      if (recurringError) {
        console.error(
          'STOP RECURRING FAILED:',
          recurringError
        )
        return
      }

      const {
        error: deleteFutureError
      } = await supabase
        .from('tasks')
        .delete()
        .eq(
          'recurring_task_id',
          task.recurring_task_id
        )
        .gt(
          'task_date',
          getToday()
        )

      if (deleteFutureError) {
        console.error(
          'DELETE FUTURE OCCURRENCES FAILED:',
          deleteFutureError
        )
        return
      }

      const {
        error: deleteError
      } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)

      if (deleteError) {
        console.error(
          'DELETE FAILED:',
          deleteError
        )
        return
      }

      await loadTasks()
      return
    }

    const confirmed =
      window.confirm(
        `Delete "${task.title}"?`
      )

    if (!confirmed) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)

    if (error) {
      console.error(
        'DELETE FAILED:',
        error
      )
      return
    }

    await loadTasks()
  }

  async function toggleFocus(task) {
    if (task.is_focus) {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_focus: false
        })
        .eq('id', task.id)

      if (error) {
        console.error(
          'FOCUS UPDATE FAILED:',
          error
        )
        return
      }

      await loadTasks()
      return
    }

    const focusCount = tasks.filter(
      task => task.is_focus
    ).length

    if (focusCount >= 3) {
      window.alert(
        'You can only have 3 focus tasks.'
      )
      return
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        is_focus: true
      })
      .eq('id', task.id)

    if (error) {
      console.error(
        'FOCUS UPDATE FAILED:',
        error
      )
      return
    }

    await loadTasks()
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  function handleDateChange(event) {
    setSelectedDate(
      event.target.value
    )
  }

  function previousDay() {
    setSelectedDate(
      changeDate(
        selectedDate,
        -1
      )
    )
  }

  function nextDay() {
    setSelectedDate(
      changeDate(
        selectedDate,
        1
      )
    )
  }

  if (loading) {
    return (
      <div className="loading">
        Loading your ledger...
      </div>
    )
  }

  const isEditable =
    selectedDate >= getToday()

  const completedTasks =
    tasks.filter(
      task => task.completed
    ).length

  const totalTasks =
    tasks.length

  const progress =
    totalTasks === 0
      ? 0
      : Math.round(
          (
            completedTasks /
            totalTasks
          ) * 100
        )

  return (
    <>
      <Header
        email={session.user.email}
        onLogout={logout}
      />

      <main className="dashboard">

        <button
          className="analytics-button"
          onClick={onAnalytics}
        >
          Analytics
        </button>

        <div className="date-navigation">

          <button
            className="date-arrow"
            onClick={previousDay}
          >
            ←
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
          />

          <button
            className="date-arrow"
            onClick={nextDay}
          >
            →
          </button>

        </div>

        <section className="today-section">

          <p className="eyebrow">
            {formatDisplayDate(
              selectedDate
            )}
          </p>

          <div className="day-heading">

            <h1>Execute.</h1>

            <div
              className="progress-ring"
              style={{
                '--progress':
                  `${progress}%`
              }}
            >
              <div className="progress-inner">
                <strong>
                  {completedTasks}
                </strong>

                <span>
                  /{totalTasks}
                </span>
              </div>
            </div>

          </div>

          <TaskList
            tasks={[
              ...tasks.filter(
                task => task.is_focus
              ),
              ...tasks.filter(
                task => !task.is_focus
              )
            ]}
            onToggle={toggleTask}
            onEdit={editTask}
            onDelete={deleteTask}
            onFocus={toggleFocus}
            locked={!isEditable}
          />

        </section>

        <section className="focus-section">

          <p className="eyebrow">
            FOCUS
          </p>

          <div className="focus-timer">

            <strong>
              {formatDuration(
                elapsed
              )}
            </strong>

            {activeSession ? (
              <button
                type="button"
                onClick={stopFocus}
              >
                Stop
              </button>
            ) : (
              <>
                <select
                  value={
                    selectedFocusTask
                  }
                  onChange={e =>
                    setSelectedFocusTask(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    No specific task
                  </option>

                  {tasks
                    .filter(
                      task =>
                        !task.completed
                    )
                    .map(task => (
                      <option
                        key={task.id}
                        value={task.id}
                      >
                        {task.title}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={startFocus}
                >
                  Start
                </button>
              </>
            )}

          </div>

          <p className="focused-today">
            Today's focused time:{' '}
            <strong>
              {formatDuration(
                focusedToday
              )}
            </strong>
          </p>

        </section>

        <section className="tomorrow-section">

          <h2>Plan this day.</h2>

          <AddTask
            userId={session.user.id}
            taskDate={selectedDate}
            onTaskAdded={loadTasks}
          />

        </section>

      </main>
    </>
  )
}

export default Dashboard