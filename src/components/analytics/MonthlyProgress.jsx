import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

function getMonthStart(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function getMonthEnd(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function getNextDay(date) {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

function formatDuration(seconds) {
  if (!seconds) return '0m'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)

  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
}

function MonthlyProgress({ userId }) {
  const [month, setMonth] = useState(getMonthStart())
  const [tasks, setTasks] = useState([])
  const [sessions, setSessions] = useState([])
  const [areas, setAreas] = useState([])
  const [goals, setGoals] = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const startDate = month
      const endDate = getMonthEnd(month)

      const [
        { data: taskData, error: taskError },
        { data: sessionData, error: sessionError },
        { data: areaData, error: areaError },
        { data: goalData, error: goalError }
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .gte('task_date', startDate)
          .lte('task_date', endDate),

        supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', userId)
          .gte('start_time', `${startDate}T00:00:00`)
          .lt('start_time', `${getNextDay(endDate)}T00:00:00`)
          .not('duration_seconds', 'is', null),

        supabase
          .from('areas')
          .select('id, name')
          .eq('user_id', userId),

        supabase
          .from('goals')
          .select('id, title, area_id')
          .eq('user_id', userId)
      ])

      if (taskError) console.error('MONTHLY TASKS FAILED:', taskError)
      if (sessionError) console.error('MONTHLY FOCUS FAILED:', sessionError)
      if (areaError) console.error('MONTHLY AREAS FAILED:', areaError)
      if (goalError) console.error('MONTHLY GOALS FAILED:', goalError)

      const goalIds = (goalData || []).map(goal => goal.id)

      let milestoneData = []
      let milestoneError = null

      if (goalIds.length > 0) {
        const result = await supabase
          .from('milestones')
          .select('id, title, goal_id')
          .in('goal_id', goalIds)

        milestoneData = result.data || []
        milestoneError = result.error
      }

      if (milestoneError) {
        console.error('MONTHLY MILESTONES FAILED:', milestoneError)
      }

      setTasks(taskData || [])
      setSessions(sessionData || [])
      setAreas(areaData || [])
      setGoals(goalData || [])
      setMilestones(milestoneData)
      setLoading(false)
    }

    load()
  }, [userId, month])

  const stats = useMemo(() => {
    const totalTasks = tasks.length

    const completedTasks = tasks.filter(task => task.completed).length

    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100)

    const totalFocus = sessions.reduce(
      (sum, session) => sum + (session.duration_seconds || 0),
      0
    )

    const focusDates = new Set(
      sessions
        .filter(session => session.duration_seconds > 0)
        .map(session => new Date(session.start_time).toLocaleDateString('en-CA'))
    )

    const averageFocus =
      focusDates.size === 0
        ? 0
        : Math.round(totalFocus / focusDates.size)

    const taskMap = new Map(tasks.map(task => [task.id, task.title]))
    const allocation = {}

    for (const session of sessions) {
      if (
        !session.task_id ||
        !session.duration_seconds ||
        !taskMap.has(session.task_id)
      ) {
        continue
      }

      const taskId = session.task_id

      if (!allocation[taskId]) {
        allocation[taskId] = {
          id: taskId,
          title: taskMap.get(taskId),
          seconds: 0
        }
      }

      allocation[taskId].seconds += session.duration_seconds
    }

    const taskAllocation = Object.values(allocation).sort(
      (a, b) => b.seconds - a.seconds
    )

    const maxTaskSeconds = taskAllocation[0]?.seconds || 0

    const dailyFocus = {}

    for (const session of sessions) {
      if (!session.duration_seconds || session.duration_seconds <= 0) continue

      const date = new Date(session.start_time).toLocaleDateString('en-CA')
      dailyFocus[date] = (dailyFocus[date] || 0) + session.duration_seconds
    }

    const goalMap = new Map(goals.map(goal => [goal.id, goal]))
    const milestoneMap = new Map(
      milestones.map(milestone => [milestone.id, milestone])
    )
    const areaMap = new Map(areas.map(area => [area.id, area]))

    const hierarchy = {}
    let unassignedSeconds = 0

    for (const session of sessions) {
      const seconds = session.duration_seconds || 0
      if (!session.task_id || seconds <= 0) {
        if (seconds > 0) unassignedSeconds += seconds
        continue
      }

      const task = tasks.find(item => item.id === session.task_id)

      if (!task) {
        unassignedSeconds += seconds
        continue
      }

      const goal = task.goal_id ? goalMap.get(task.goal_id) : null
      const milestone = task.milestone_id
        ? milestoneMap.get(task.milestone_id)
        : null

      const areaId = task.area_id || goal?.area_id || null
      const area = areaId ? areaMap.get(areaId) : null

      if (!area && !goal && !milestone) {
        unassignedSeconds += seconds
        continue
      }

      if (area || goal) {
        const areaKey = area?.id || '__no_area__'

        if (!hierarchy[areaKey]) {
          hierarchy[areaKey] = {
            id: areaKey,
            name: area ? area.name : 'Unassigned Area',
            seconds: 0,
            goals: {}
          }
        }

        hierarchy[areaKey].seconds += seconds
      }

      if (goal) {
        const areaKey = area?.id || '__no_area__'

        if (!hierarchy[areaKey]) {
          hierarchy[areaKey] = {
            id: areaKey,
            name: area ? area.name : 'Unassigned Area',
            seconds: 0,
            goals: {}
          }
        }

        if (!hierarchy[areaKey].goals[goal.id]) {
          hierarchy[areaKey].goals[goal.id] = {
            id: goal.id,
            title: goal.title,
            seconds: 0,
            milestones: {}
          }
        }

        hierarchy[areaKey].goals[goal.id].seconds += seconds
      }

      if (milestone && goal) {
        const areaKey = area?.id || '__no_area__'

        if (!hierarchy[areaKey]) {
          hierarchy[areaKey] = {
            id: areaKey,
            name: area ? area.name : 'Unassigned Area',
            seconds: 0,
            goals: {}
          }
        }

        if (!hierarchy[areaKey].goals[goal.id]) {
          hierarchy[areaKey].goals[goal.id] = {
            id: goal.id,
            title: goal.title,
            seconds: 0,
            milestones: {}
          }
        }

        if (!hierarchy[areaKey].goals[goal.id].milestones[milestone.id]) {
          hierarchy[areaKey].goals[goal.id].milestones[milestone.id] = {
            id: milestone.id,
            title: milestone.title,
            seconds: 0
          }
        }

        hierarchy[areaKey].goals[goal.id].milestones[milestone.id].seconds += seconds
      }
    }

    const hierarchyData = Object.values(hierarchy)
      .map(area => ({
        ...area,
        goals: Object.values(area.goals)
          .map(goal => ({
            ...goal,
            milestones: Object.values(goal.milestones).sort(
              (a, b) => b.seconds - a.seconds
            )
          }))
          .sort((a, b) => b.seconds - a.seconds)
      }))
      .sort((a, b) => b.seconds - a.seconds)

    return {
      totalTasks,
      completedTasks,
      completionRate,
      totalFocus,
      focusDays: focusDates.size,
      averageFocus,
      taskAllocation,
      maxTaskSeconds,
      dailyFocus,
      hierarchyData,
      unassignedSeconds
    }
  }, [tasks, sessions, areas, goals, milestones])

  const days = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number)
    const totalDays = new Date(year, monthNumber, 0).getDate()

    return Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1
      return `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    })
  }, [month])

  function previousMonth() {
    const [year, monthNumber] = month.split('-').map(Number)
    setMonth(getMonthStart(new Date(year, monthNumber - 2, 1)))
  }

  function nextMonth() {
    const [year, monthNumber] = month.split('-').map(Number)
    setMonth(getMonthStart(new Date(year, monthNumber, 1)))
  }

  if (loading) {
    return (
      <section className="analytics-consistency" style={{ marginTop: '30px' }}>
        <p className="eyebrow">MONTHLY PROGRESS</p>
        <p style={{ color: '#777' }}>Loading monthly data...</p>
      </section>
    )
  }

  return (
    <section className="analytics-consistency" style={{ marginTop: '30px' }}>
      <div className="consistency-header" style={{ alignItems: 'center' }}>
        <div>
          <p className="eyebrow">MONTHLY PROGRESS</p>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 400 }}>
            {formatMonth(month)}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" onClick={previousMonth} style={navButtonStyle}>
            ←
          </button>
          <button type="button" onClick={nextMonth} style={navButtonStyle}>
            →
          </button>
        </div>
      </div>

      <div className="consistency-grid">
        <div>
          <strong>{formatDuration(stats.totalFocus)}</strong>
          <span>FOCUS TIME</span>
        </div>

        <div>
          <strong>{stats.completedTasks}/{stats.totalTasks}</strong>
          <span>TASKS CLEARED</span>
        </div>

        <div>
          <strong>{stats.completionRate}%</strong>
          <span>COMPLETION</span>
        </div>

        <div>
          <strong>{stats.focusDays}</strong>
          <span>FOCUS DAYS</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <p className="eyebrow">FOCUS BY DAY</p>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '6px',
            height: '180px',
            overflowX: 'auto',
            paddingBottom: '10px'
          }}
        >
          {days.map(date => {
            const seconds = stats.dailyFocus[date] || 0
            const maxDaily = Math.max(...Object.values(stats.dailyFocus), 1)

            const height =
              seconds === 0
                ? 3
                : Math.max(8, (seconds / maxDaily) * 150)

            const day = Number(date.slice(-2))

            return (
              <div
                key={date}
                title={`${date}: ${formatDuration(seconds)}`}
                style={{
                  minWidth: '18px',
                  height: '170px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${height}px`,
                    background: '#c8d6b8',
                    opacity: seconds === 0 ? 0.15 : 1
                  }}
                />

                <span
                  style={{
                    marginTop: '8px',
                    color: '#666',
                    fontSize: '10px'
                  }}
                >
                  {day}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={sectionStyle}>
        <p className="eyebrow">WHERE YOUR TIME WENT</p>

        {stats.taskAllocation.length === 0 ? (
          <p style={{ color: '#666' }}>No task-linked focus time this month.</p>
        ) : (
          <div>
            {stats.taskAllocation.map(task => {
              const percentage =
                stats.totalFocus === 0
                  ? 0
                  : Math.round((task.seconds / stats.totalFocus) * 100)

              const width =
                stats.maxTaskSeconds === 0
                  ? 0
                  : (task.seconds / stats.maxTaskSeconds) * 100

              return (
                <div key={task.id} style={{ marginBottom: '25px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '20px',
                      marginBottom: '8px'
                    }}
                  >
                    <span style={{ color: '#e9e9e7', fontSize: '14px' }}>
                      {task.title}
                    </span>

                    <span style={{ color: '#777', fontSize: '13px' }}>
                      {formatDuration(task.seconds)} · {percentage}%
                    </span>
                  </div>

                  <div style={{ height: '4px', background: '#292929' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${width}%`,
                        background: '#c8d6b8'
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <p className="eyebrow">TIME BY HIERARCHY</p>

        {stats.hierarchyData.length === 0 ? (
          <p style={{ color: '#666' }}>
            No hierarchy-linked focus time this month.
          </p>
        ) : (
          <div>
            {stats.hierarchyData.map(area => {
              const areaPercentage =
                stats.totalFocus === 0
                  ? 0
                  : Math.round((area.seconds / stats.totalFocus) * 100)

              return (
                <div key={area.id} style={{ marginBottom: '34px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '20px',
                      marginBottom: '10px'
                    }}
                  >
                    <strong
                      style={{
                        color: '#e9e9e7',
                        fontSize: '15px',
                        fontWeight: 500
                      }}
                    >
                      {area.name}
                    </strong>

                    <span style={{ color: '#777', fontSize: '13px' }}>
                      {formatDuration(area.seconds)} · {areaPercentage}%
                    </span>
                  </div>

                  <div
                    style={{
                      height: '4px',
                      background: '#292929',
                      marginBottom: '16px'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${areaPercentage}%`,
                        background: '#c8d6b8'
                      }}
                    />
                  </div>

                  {area.goals.map(goal => {
                    const goalPercentage =
                      area.seconds === 0
                        ? 0
                        : Math.round((goal.seconds / area.seconds) * 100)

                    return (
                      <div key={goal.id} style={{ marginLeft: '18px', marginBottom: '18px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '20px',
                            marginBottom: '7px'
                          }}
                        >
                          <span style={{ color: '#d8d8d5', fontSize: '13px' }}>
                            {goal.title}
                          </span>

                          <span style={{ color: '#666', fontSize: '12px' }}>
                            {formatDuration(goal.seconds)} · {goalPercentage}%
                          </span>
                        </div>

                        <div
                          style={{
                            height: '3px',
                            background: '#252525',
                            marginBottom: '10px'
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${goalPercentage}%`,
                              background: '#8fa17f'
                            }}
                          />
                        </div>

                        {goal.milestones.map(milestone => {
                          const milestonePercentage =
                            goal.seconds === 0
                              ? 0
                              : Math.round(
                                  (milestone.seconds / goal.seconds) * 100
                                )

                          return (
                            <div
                              key={milestone.id}
                              style={{
                                marginLeft: '18px',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '20px'
                              }}
                            >
                              <span
                                style={{
                                  color: '#888',
                                  fontSize: '12px'
                                }}
                              >
                                {milestone.title}
                              </span>

                              <span
                                style={{
                                  color: '#555',
                                  fontSize: '11px'
                                }}
                              >
                                {formatDuration(milestone.seconds)} · {milestonePercentage}%
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {stats.unassignedSeconds > 0 && (
              <div
                style={{
                  borderTop: '1px solid #292929',
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '20px'
                }}
              >
                <span style={{ color: '#666', fontSize: '12px' }}>
                  Unassigned
                </span>

                <span style={{ color: '#555', fontSize: '11px' }}>
                  {formatDuration(stats.unassignedSeconds)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <p className="eyebrow">MONTHLY RHYTHM</p>

        <div className="consistency-grid">
          <div>
            <strong>{formatDuration(stats.averageFocus)}</strong>
            <span>AVG / FOCUS DAY</span>
          </div>

          <div>
            <strong>{stats.totalTasks - stats.completedTasks}</strong>
            <span>TASKS REMAINING</span>
          </div>
        </div>
      </div>
    </section>
  )
}

const sectionStyle = {
  marginTop: '55px',
  borderTop: '1px solid #292929',
  paddingTop: '45px'
}

const navButtonStyle = {
  background: 'none',
  border: '1px solid #333',
  color: '#c8d6b8',
  width: '38px',
  height: '38px',
  cursor: 'pointer',
  fontSize: '16px'
}

export default MonthlyProgress
