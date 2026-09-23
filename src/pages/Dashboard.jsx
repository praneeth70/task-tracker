import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/layout/Header'
import TaskList from '../components/tasks/TaskList'
import AddTask from '../components/tasks/AddTask'

function Dashboard({ session, onAnalytics, onAreas }) {
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const [activeSession, setActiveSession] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [focusedToday, setFocusedToday] = useState(0)
  const [focusDays, setFocusDays] = useState(0)
  const [selectedFocusTask, setSelectedFocusTask] = useState('')
  const [yesterdayStats, setYesterdayStats] = useState({ total: 0, completed: 0, carryover: 0, percentage: 0 })
  const [yesterdayTasks, setYesterdayTasks] = useState([])
  const [carryingOver, setCarryingOver] = useState(false)
  const [carryoverTasks, setCarryoverTasks] = useState([])

  function getToday() {
    const date = new Date()

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getYearCountdownData() {
    const today = new Date()
    const year = 2026
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)
    const nextYearStart = new Date(year + 1, 0, 1)
    const dayMs = 24 * 60 * 60 * 1000

    if (today <= yearEnd) {
      const daysLeft = Math.ceil(
        (yearEnd - today) / dayMs
      )

      const totalDays = Math.round(
        (yearEnd - yearStart) / dayMs
      ) + 1

      const elapsedDays = Math.floor(
        (today - yearStart) / dayMs
      )

      const progress = Math.min(
        100,
        Math.max(
          0,
          (elapsedDays / totalDays) * 100
        )
      )

      let message = 'DAYS LEFT · 2026'

      if (daysLeft <= 14) {
        message = 'LAST 2 WEEKS · 2026'
      } else if (daysLeft <= 30) {
        message = 'LAST 30 DAYS · 2026'
      } else if (daysLeft <= 60) {
        message = 'LAST 60 DAYS · 2026'
      }

      return {
        value: daysLeft,
        label: message,
        progress
      }
    }

    const daysSince = Math.floor(
      (today - nextYearStart) / dayMs
    ) + 1

    return {
      value: -daysSince,
      label: 'DAYS SINCE 2026 ENDED',
      progress: 100
    }
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

  function showActionError(message, error) {
    console.error(message, error)
    setActionError(message)
  }

  async function loadTasks() {
    setLoading(true)
    setErrorMessage('')

    const {
      data: existingTasks,
      error
    } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('task_date', selectedDate)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('LOAD TASKS FAILED:', error)
      setErrorMessage('Could not load your tasks. Please try again.')
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
            end_time: recurringTask.end_time,
            goal_id: recurringTask.goal_id || null,
            milestone_id: recurringTask.milestone_id || null,
            area_id: recurringTask.area_id || null,
            deadline: recurringTask.deadline || null
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

    const yesterday = changeDate(selectedDate, -1)
    const { data: yesterdayTasks, error: yesterdayError } = await supabase
      .from('tasks')
      .select('id, completed')
      .eq('user_id', session.user.id)
      .eq('task_date', yesterday)

    if (yesterdayError) {
      console.error('YESTERDAY TASKS FAILED:', yesterdayError)
      setYesterdayStats({ total: 0, completed: 0, carryover: 0, percentage: 0 })
    } else {
      const total = yesterdayTasks?.length || 0
      const completed = (yesterdayTasks || []).filter(task => task.completed).length
      const carryover = total - completed
      const percentage = total === 0 ? 0 : Math.round((carryover / total) * 100)
      setYesterdayStats({ total, completed, carryover, percentage })
    }

    setLoading(false)
  }

  async function loadCarryoverTasks() {
    const yesterday = changeDate(getToday(), -1)

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('task_date', yesterday)
      .eq('completed', false)
      .is('carryover_skipped_at', null)
      .order('position', {
        ascending: true,
        nullsFirst: false
      })
      .order('created_at', {
        ascending: true
      })

    if (error) {
      console.error(
        'LOAD CARRYOVER TASKS FAILED:',
        error
      )
      return
    }

    setCarryoverTasks(data || [])
  }

  async function bringCarryoverToToday(task) {
    setActionError('')
    const today = getToday()

    const { data: existing, error: existingError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('task_date', today)
      .eq('rescheduled_from_task_id', task.id)
      .maybeSingle()

    if (existingError) {
      showActionError('Could not check the carryover task. Please try again.', existingError)
      return
    }

    if (existing) {
      setCarryoverTasks(prev =>
        prev.filter(item => item.id !== task.id)
      )
      return
    }

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: session.user.id,
        title: task.title,
        task_date: today,
        priority: task.priority,
        category: task.category,
        estimated_minutes: task.estimated_minutes,
        start_time: task.start_time,
        end_time: task.end_time,
        deadline: task.deadline,
        area_id: task.area_id || null,
        goal_id: task.goal_id || null,
        milestone_id: task.milestone_id || null,
        rescheduled_from_task_id: task.id,
        completed: false,
        is_focus: false
      })

    if (error) {
      showActionError('Could not bring this task to today. Please try again.', error)
      return
    }

    setCarryoverTasks(prev =>
      prev.filter(item => item.id !== task.id)
    )

    await loadTasks()
  }

  async function skipCarryover(taskId) {
    setActionError('')
    const { error } = await supabase
      .from('tasks')
      .update({
        carryover_skipped_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('user_id', session.user.id)

    if (error) {
      showActionError('Could not skip this task. Please try again.', error)
      return
    }

    setCarryoverTasks(prev =>
      prev.filter(task => task.id !== taskId)
    )
  }

  async function rescheduleCarryover(task) {
    setActionError('')
    const date = window.prompt(
      'Enter the new date (YYYY-MM-DD):',
      getToday()
    )

    if (!date) return

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      window.alert('Please enter the date as YYYY-MM-DD.')
      return
    }

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: session.user.id,
        title: task.title,
        task_date: date,
        priority: task.priority,
        category: task.category,
        estimated_minutes: task.estimated_minutes,
        start_time: task.start_time,
        end_time: task.end_time,
        deadline: task.deadline,
        area_id: task.area_id || null,
        goal_id: task.goal_id || null,
        milestone_id: task.milestone_id || null,
        rescheduled_from_task_id: task.id,
        completed: false,
        is_focus: false
      })

    if (error) {
      showActionError('Could not reschedule this task. Please try again.', error)
      return
    }

    setCarryoverTasks(prev =>
      prev.filter(item => item.id !== task.id)
    )

    if (date === selectedDate) {
      await loadTasks()
    }
  }

  async function loadYesterdayStats() {
    const yesterday = changeDate(getToday(), -1)

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('task_date', yesterday)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('LOAD YESTERDAY TASKS FAILED:', error)
      return
    }

    const rows = data || []
    const unfinished = rows.filter(task => !task.completed)

    setYesterdayTasks(unfinished)
    setYesterdayStats({
      total: rows.length,
      completed: rows.length - unfinished.length,
      carryover: unfinished.length,
      percentage: rows.length === 0
        ? 0
        : Math.round((unfinished.length / rows.length) * 100)
    })
  }

  async function carryOverTask(task) {
    if (getToday() !== selectedDate || !task || carryingOver) return

    setCarryingOver(true)

    const { data: existing, error: existingError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('task_date', getToday())
      .eq('rescheduled_from_task_id', task.id)
      .limit(1)

    if (existingError) {
      console.error('CHECK CARRYOVER FAILED:', existingError)
      setCarryingOver(false)
      return
    }

    if (existing?.length) {
      window.alert("This task is already carried over to today.")
      setCarryingOver(false)
      return
    }

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: session.user.id,
        rescheduled_from_task_id: task.id,
        title: task.title,
        task_date: getToday(),
        priority: task.priority,
        category: task.category || null,
        estimated_minutes: task.estimated_minutes || null,
        start_time: task.start_time || null,
        end_time: task.end_time || null,
        deadline: task.deadline || null,
        area_id: task.area_id || null,
        goal_id: task.goal_id || null,
        milestone_id: task.milestone_id || null,
        completed: false,
        is_focus: false,
        recurring_task_id: null
      })

    if (error) {
      console.error('CARRYOVER FAILED:', error)
      window.alert('Could not carry over this task.')
      setCarryingOver(false)
      return
    }

    setYesterdayTasks(prev => prev.filter(item => item.id !== task.id))
    setYesterdayStats(prev => {
      const carryover = Math.max(0, prev.carryover - 1)
      return {
        ...prev,
        carryover,
        percentage: prev.total === 0
          ? 0
          : Math.round((carryover / prev.total) * 100)
      }
    })

    await loadTasks()
    setCarryingOver(false)
  }

  async function carryOverYesterdayTasks() {
    if (getToday() !== selectedDate || yesterdayTasks.length === 0 || carryingOver) return

    setCarryingOver(true)

    const { data: existing, error: existingError } = await supabase
      .from('tasks')
      .select('rescheduled_from_task_id')
      .eq('user_id', session.user.id)
      .eq('task_date', getToday())
      .not('rescheduled_from_task_id', 'is', null)

    if (existingError) {
      console.error('CHECK CARRYOVER FAILED:', existingError)
      setCarryingOver(false)
      return
    }

    const existingIds = new Set(
      (existing || []).map(task => task.rescheduled_from_task_id)
    )

    const missing = yesterdayTasks.filter(
      task => !existingIds.has(task.id)
    )

    if (missing.length === 0) {
      window.alert("Yesterday's unfinished tasks are already carried over.")
      setCarryingOver(false)
      return
    }

    const copies = missing.map(task => ({
      user_id: session.user.id,
      rescheduled_from_task_id: task.id,
      title: task.title,
      task_date: getToday(),
      priority: task.priority,
      category: task.category || null,
      estimated_minutes: task.estimated_minutes || null,
      start_time: task.start_time || null,
      end_time: task.end_time || null,
      deadline: task.deadline || null,
      area_id: task.area_id || null,
      goal_id: task.goal_id || null,
      milestone_id: task.milestone_id || null,
      completed: false,
      is_focus: false,
      recurring_task_id: null
    }))

    const { error } = await supabase
      .from('tasks')
      .insert(copies)

    if (error) {
      console.error('CARRYOVER FAILED:', error)
      window.alert('Could not carry over the unfinished tasks.')
      setCarryingOver(false)
      return
    }

    await loadTasks()
    setCarryingOver(false)
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

      const MAX_SESSION_SECONDS = 2 * 60 * 60

      const elapsedSeconds = Math.floor(
        (Date.now() - start.getTime()) / 1000
      )

      if (elapsedSeconds >= MAX_SESSION_SECONDS) {
        const endTime = new Date(
          start.getTime() + MAX_SESSION_SECONDS * 1000
        )

        const { error } = await supabase
          .from('focus_sessions')
          .update({
            end_time: endTime.toISOString(),
            duration_seconds: MAX_SESSION_SECONDS
          })
          .eq('id', currentSession.id)

        if (error) {
          console.error('AUTO STOP FAILED:', error)
        }

        currentSession = null
      }

      // Existing midnight logic continues here
      if (currentSession) {
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
      .select('start_time, duration_seconds')
      .eq('user_id', session.user.id)
      .not('duration_seconds', 'is', null)

    if (sessionsError) {
      console.error(
        'FOCUS TOTAL FAILED:',
        sessionsError
      )
      return
    }

    const total = (sessions || [])
      .filter(session => {
        const sessionDate =
          new Date(
            session.start_time
          )

        const year =
          sessionDate.getFullYear()

        const month = String(
          sessionDate.getMonth() + 1
        ).padStart(2, '0')

        const day = String(
          sessionDate.getDate()
        ).padStart(2, '0')

        return (
          `${year}-${month}-${day}` ===
          today
        )
      })
      .reduce(
        (sum, item) =>
          sum +
          (item.duration_seconds || 0),
        0
      )

    setFocusedToday(total)

    /*
     * Count unique calendar days
     * on which actual focus time
     * was recorded.
     */
    const focusedDates = new Set()

    ;(sessions || []).forEach(session => {
      if (
        !session.duration_seconds ||
        session.duration_seconds <= 0
      ) {
        return
      }

      const date =
        new Date(session.start_time)

      const year =
        date.getFullYear()

      const month = String(
        date.getMonth() + 1
      ).padStart(2, '0')

      const day = String(
        date.getDate()
      ).padStart(2, '0')

      focusedDates.add(
        `${year}-${month}-${day}`
      )
    })

    /*
     * If a session is currently running,
     * today counts as a focus day too.
     */
    if (currentSession) {
      focusedDates.add(today)
    }

    setFocusDays(focusedDates.size)
  }

  useEffect(() => {
    loadTasks()
  }, [selectedDate])

  useEffect(() => {
    loadFocusData()
    loadYesterdayStats()
  }, [])

  useEffect(() => {
    if (selectedDate === getToday()) {
      loadCarryoverTasks()
    } else {
      setCarryoverTasks([])
    }
  }, [selectedDate])

  useEffect(() => {
    if (!activeSession) return

    const MAX_SESSION_SECONDS = 2 * 60 * 60

    const timer = setInterval(() => {
      const elapsedSeconds = Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            new Date(activeSession.start_time).getTime()
          ) / 1000
        )
      )

      if (elapsedSeconds >= MAX_SESSION_SECONDS) {
        stopFocus()
        return
      }

      setElapsed(elapsedSeconds)
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
    setActionError('')
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
      if (error.code === '23505') {
        await loadFocusData()
        setActionError('A focus session is already running in another tab or window.')
      } else {
        showActionError('Could not start the focus session. Please try again.', error)
      }

      return
    }

    setActiveSession(data)
    setElapsed(0)
  }

  async function stopFocus() {
    setActionError('')
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
      showActionError('Could not stop the focus session. Please try again.', error)
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
    setActionError('')
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
      showActionError('Could not update the task. Please try again.', error)
      return
    }

    await loadTasks()
  }

  async function editTask(
    task,
    newTitle,
    startTime,
    endTime,
    deadline
  ) {
    setActionError('')
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
            endTime || null,
          deadline: deadline || null
        })
        .eq('id', task.id)

      if (error) {
        showActionError('Could not edit the task. Please try again.', error)
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
            endTime || null,
          deadline: deadline || null
        })
        .eq('id', task.id)

      if (error) {
        showActionError('Could not edit this occurrence. Please try again.', error)
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
      showActionError('Could not load the recurring task. Please try again.', recurringFetchError)
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
            endTime || null,
          deadline: deadline || null
        })
        .eq(
          'id',
          task.recurring_task_id
        )

    if (ruleError) {
      showActionError('Could not update the recurring rule. Please try again.', ruleError)
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
            endTime || null,
          deadline: deadline || null
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
      showActionError('Could not update future occurrences. Please try again.', futureError)
      return
    }

    console.log(
      'Updated recurring task:',
      recurringTask.id
    )

    await loadTasks()
  }

  async function deleteTask(task) {
    setActionError('')
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
        showActionError('Could not stop the recurring task. Please try again.', recurringError)
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
        showActionError('Could not delete future occurrences. Please try again.', deleteFutureError)
        return
      }

      const {
        error: deleteError
      } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)

      if (deleteError) {
        showActionError('Could not delete the task. Please try again.', deleteError)
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
    setActionError('')
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
      showActionError('Could not update focus status. Please try again.', error)
      return
    }

    await loadTasks()
  }

  async function reorderTasks(draggedTask, targetTask) {
    setActionError('')
    if (draggedTask.id === targetTask.id) return

    // Keep Focus tasks and normal tasks in their existing groups
    if (draggedTask.is_focus !== targetTask.is_focus) return

    // Use the exact order shown on screen
    const displayedTasks = [
      ...tasks.filter(task => task.is_focus),
      ...tasks.filter(task => !task.is_focus)
    ]

    const draggedIndex = displayedTasks.findIndex(
      task => task.id === draggedTask.id
    )

    const targetIndex = displayedTasks.findIndex(
      task => task.id === targetTask.id
    )

    if (draggedIndex === -1 || targetIndex === -1) return

    const [movedTask] = displayedTasks.splice(draggedIndex, 1)

    displayedTasks.splice(targetIndex, 0, movedTask)

    const updatedTasks = displayedTasks.map((task, index) => ({
      ...task,
      position: index
    }))

    // Update UI immediately
    setTasks(updatedTasks)

    // Save positions
    const results = await Promise.all(
      updatedTasks.map(task =>
        supabase
          .from('tasks')
          .update({ position: task.position })
          .eq('id', task.id)
      )
    )

    const failed = results.find(result => result.error)

    if (failed) {
      showActionError('Could not save task order. Please try again.', failed.error)
    }
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

  if (errorMessage) {
    return (
      <div className="loading">
        <p>{errorMessage}</p>
        <button onClick={loadTasks}>
          Try again
        </button>
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

        <div className="dashboard-top-bar">
          <div className="dashboard-navigation">
            <button
              className="analytics-button"
              onClick={onAnalytics}
            >
              Analytics
            </button>

            <button
              className="analytics-button"
              onClick={onAreas}
            >
              Areas
            </button>
          </div>

          <div className="year-countdown">
            {(() => {
              const yearCountdown = getYearCountdownData()

              return (
                <>
                  <strong>
                    {yearCountdown.value}
                  </strong>

                  <span>
                    {yearCountdown.label}
                  </span>

                  <div className="year-progress">
                    <div
                      className="year-progress-fill"
                      style={{
                        width: `${yearCountdown.progress}%`
                      }}
                    />
                  </div>
                </>
              )
            })()}
          </div>
        </div>

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

        {actionError && (
          <div
            role="alert"
            style={{
              margin: '0 auto 24px',
              maxWidth: '900px',
              padding: '12px 16px',
              border: '1px solid #4a4a4a',
              textAlign: 'center'
            }}
          >
            {actionError}
            <button
              type="button"
              onClick={() => setActionError('')}
              style={{ marginLeft: '12px' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {selectedDate === getToday() &&
          carryoverTasks.length > 0 && (
            <section className="carryover-section">
              <p className="eyebrow">
                CARRYOVER
              </p>

              <h2>
                Yesterday's unfinished work.
              </h2>

              <p>
                You have {carryoverTasks.length} unfinished{' '}
                {carryoverTasks.length === 1 ? 'task' : 'tasks'} from yesterday.
              </p>

              <div className="carryover-list">
                {carryoverTasks.map(task => (
                  <div
                    key={task.id}
                    className="carryover-item"
                  >
                    <strong>
                      {task.title}
                    </strong>

                    <div className="carryover-actions">
                      <button
                        type="button"
                        onClick={() =>
                          bringCarryoverToToday(task)
                        }
                      >
                        Bring to today
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          skipCarryover(task.id)
                        }
                      >
                        Skip
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          rescheduleCarryover(task)
                        }
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
          onReorder={reorderTasks}
          onAreaAssigned={loadTasks}
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

          <p className="focused-today">
            Focus days:{' '}
            <strong>
              {focusDays}
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