import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/layout/Header'
import TaskList from '../components/tasks/TaskList'
import AddTask from '../components/tasks/AddTask'

function Dashboard({ session, onAnalytics }) {
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

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
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    })
  }

  async function loadTasks() {
    setLoading(true)

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('task_date', selectedDate)
      .order('created_at')

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [selectedDate])

  async function toggleTask(task) {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        completed: !task.completed,
        completed_at: !task.completed
          ? new Date().toISOString()
          : null
      })
      .eq('id', task.id)
      .select()

    console.log('UPDATE RESULT:', data)
    console.log('UPDATE ERROR:', error)

    if (error) {
      console.error('UPDATE FAILED:', error)
      return
    }

    loadTasks()
  }

  async function editTask(task, newTitle) {
    const { error } = await supabase
      .from('tasks')
      .update({
        title: newTitle
      })
      .eq('id', task.id)

    if (error) {
      console.error('EDIT FAILED:', error)
      return
    }

    await loadTasks()
  }

  async function deleteTask(task) {
    const confirmed = window.confirm(
      `Delete "${task.title}"?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)

    if (error) {
      console.error('DELETE FAILED:', error)
      return
    }

    await loadTasks()
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  function handleDateChange(event) {
    setSelectedDate(event.target.value)
  }

  function previousDay() {
    setSelectedDate(changeDate(selectedDate, -1))
  }

  function nextDay() {
    setSelectedDate(changeDate(selectedDate, 1))
  }

  if (loading) {
    return <div className="loading">Loading your ledger...</div>
  }

  const isToday = selectedDate === getToday()
  const isEditable = selectedDate >= getToday()
  
  const completedTasks = tasks.filter(task => task.completed).length
  const totalTasks = tasks.length
  const progress = totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * 100)

  return (
    <>
      <Header
        email={session.user.email}
        onLogout={logout}
      />

      <main className="dashboard">

        {/* ANALYTICS */}

        <button
          className="analytics-button"
          onClick={onAnalytics}
        >
          Analytics
        </button>

        {/* DATE NAVIGATION */}

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


        {/* SELECTED DAY */}

        <section className="today-section">

          <p className="eyebrow">
            {isToday ? 'TODAY' : formatDisplayDate(selectedDate)}
          </p>

          <div className="day-heading">
            <h1>Execute.</h1>

            <div
              className="progress-ring"
              style={{
                '--progress': `${progress}%`
              }}
            >
              <div className="progress-inner">
                <strong>{completedTasks}</strong>
                <span>/{totalTasks}</span>
              </div>
            </div>
          </div>

          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onEdit={editTask}
            onDelete={deleteTask}
            locked={!isEditable}
          />

        </section>


        {/* ADD TASK */}

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