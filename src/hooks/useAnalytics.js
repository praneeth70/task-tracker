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

      /*
       * We intentionally fetch complete focus sessions.
       *
       * start_time is needed for:
       * - focus days
       * - focus streaks
       * - daily focus charts
       * - monthly focus charts
       *
       * task_id is needed later for:
       * - task-wise focus time
       * - milestone rollups
       * - goal rollups
       * - area rollups
       */
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
          .order('task_date', { ascending: true })
          .order('position', {
            ascending: true,
            nullsFirst: false
          })
          .order('created_at', {
            ascending: true
          }),

        supabase
          .from('focus_sessions')
          .select(
            'id, task_id, start_time, end_time, duration_seconds'
          )
          .eq('user_id', userId)
          .not(
            'duration_seconds',
            'is',
            null
          )
          .gte(
            'start_time',
            `${startDate}T00:00:00`
          )
          .lt(
            'start_time',
            `${endDate}T23:59:59.999`
          )
          .order('start_time', {
            ascending: true
          })
      ])

      if (taskError) {
        console.error(
          'ANALYTICS TASK ERROR:',
          taskError
        )
      }

      if (focusError) {
        console.error(
          'ANALYTICS FOCUS ERROR:',
          focusError
        )
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