import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function useAnalytics(userId, startDate, endDate) {
  const [tasks, setTasks] = useState([])
  const [focusSessions, setFocusSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (startDate > endDate) {
        setTasks([])
        setFocusSessions([])
        setLoading(false)
        return
      }

      setLoading(true)

      const [
        { data: taskData, error: taskError },
        { data: focusData, error: focusError }
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .gte('task_date', startDate)
          .lte('task_date', endDate)
          .order('task_date'),

        supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', userId)
          .not('duration_seconds', 'is', null)
          .gte('start_time', `${startDate}T00:00:00`)
          .lt('start_time', `${endDate}T23:59:59.999`)
          .order('start_time')
      ])

      if (taskError) {
        console.error('ANALYTICS TASK ERROR:', taskError)
      }

      if (focusError) {
        console.error('ANALYTICS FOCUS ERROR:', focusError)
      }

      setTasks(taskData || [])
      setFocusSessions(focusData || [])
      setLoading(false)
    }

    load()
  }, [userId, startDate, endDate])

  return {
    tasks,
    focusSessions,
    loading
  }
}

export default useAnalytics