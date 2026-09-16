import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function HierarchyAllocation({
  tasks,
  focusSessions
}) {
  const [areas, setAreas] = useState([])
  const [goals, setGoals] = useState([])
  const [milestones, setMilestones] =
    useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHierarchy()
  }, [])

  async function loadHierarchy() {
    setLoading(true)

    const [
      { data: areaData, error: areaError },
      { data: goalData, error: goalError },
      { data: milestoneData, error: milestoneError }
    ] = await Promise.all([
      supabase
        .from('areas')
        .select('id, name'),

      supabase
        .from('goals')
        .select(
          'id, title, area_id'
        ),

      supabase
        .from('milestones')
        .select(
          'id, title, goal_id'
        )
    ])

    if (areaError) {
      console.error(
        'LOAD ANALYTICS AREAS FAILED:',
        areaError
      )
    }

    if (goalError) {
      console.error(
        'LOAD ANALYTICS GOALS FAILED:',
        goalError
      )
    }

    if (milestoneError) {
      console.error(
        'LOAD ANALYTICS MILESTONES FAILED:',
        milestoneError
      )
    }

    setAreas(areaData || [])
    setGoals(goalData || [])
    setMilestones(
      milestoneData || []
    )

    setLoading(false)
  }

  function formatDuration(seconds) {
    if (!seconds) return '0m'

    const hours = Math.floor(
      seconds / 3600
    )

    const minutes = Math.floor(
      (seconds % 3600) / 60
    )

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }

    return `${minutes}m`
  }

  if (loading) {
    return null
  }

  const taskMap = {}

  tasks.forEach(task => {
    taskMap[task.id] = task
  })

  const taskFocus = {}

  focusSessions.forEach(session => {
    if (
      !session.task_id ||
      !session.duration_seconds ||
      session.duration_seconds <= 0
    ) {
      return
    }

    taskFocus[session.task_id] =
      (taskFocus[session.task_id] || 0) +
      session.duration_seconds
  })

  const areaMap = {}

  areas.forEach(area => {
    areaMap[area.id] = {
      ...area,
      seconds: 0,
      goals: {}
    }
  })

  const goalMap = {}

  goals.forEach(goal => {
    goalMap[goal.id] = {
      ...goal,
      seconds: 0,
      milestones: {}
    }
  })

  const milestoneMap = {}

  milestones.forEach(milestone => {
    milestoneMap[milestone.id] = {
      ...milestone,
      seconds: 0
    }
  })

  let unassignedSeconds = 0

  Object.entries(taskFocus).forEach(
    ([taskId, seconds]) => {
      const task = taskMap[taskId]

      if (!task) return

      const goal = task.goal_id
        ? goalMap[task.goal_id]
        : null

      const milestone =
        task.milestone_id
          ? milestoneMap[
              task.milestone_id
            ]
          : null

      let area = null

      if (task.area_id) {
        area = areaMap[task.area_id]
      }

      if (!area && goal?.area_id) {
        area = areaMap[goal.area_id]
      }

      if (area) {
        area.seconds += seconds
      }

      if (goal) {
        goal.seconds += seconds
      }

      if (milestone) {
        milestone.seconds += seconds
      }

      if (!area && !goal && !milestone) {
        unassignedSeconds += seconds
      }

      if (area && goal) {
        if (!area.goals[goal.id]) {
          area.goals[goal.id] =
            goal
        }
      }

      if (goal && milestone) {
        if (!goal.milestones[
          milestone.id
        ]) {
          goal.milestones[
            milestone.id
          ] = milestone
        }
      }
    }
  )

  const activeAreas = Object.values(
    areaMap
  ).filter(
    area => area.seconds > 0
  )

  const unassignedTasks = Object.entries(
    taskFocus
  )
    .filter(([taskId]) => {
      const task = taskMap[taskId]

      if (!task) return false

      return (
        !task.area_id &&
        !task.goal_id &&
        !task.milestone_id
      )
    })
    .reduce(
      (sum, [, seconds]) =>
        sum + seconds,
      0
    )

  const totalUnassigned =
    unassignedSeconds ||
    unassignedTasks

  if (
    activeAreas.length === 0 &&
    totalUnassigned === 0
  ) {
    return null
  }

  return (
    <section className="analytics-consistency">

      <div className="consistency-header">
        <p className="eyebrow">
          TIME ALLOCATION
        </p>

        <span>
          FOCUS BY HIERARCHY
        </span>
      </div>

      <div
        style={{
          marginTop: '25px'
        }}
      >

        {activeAreas.map(area => {

          const areaGoals =
            Object.values(
              area.goals
            )
              .filter(
                goal =>
                  goal.seconds > 0
              )
              .sort(
                (a, b) =>
                  b.seconds -
                  a.seconds
              )

          return (
            <div
              key={area.id}
              style={{
                marginBottom:
                  '28px'
              }}
            >

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  borderBottom:
                    '1px solid #292c28',
                  paddingBottom:
                    '10px'
                }}
              >
                <strong
                  style={{
                    fontSize: '14px'
                  }}
                >
                  {area.name}
                </strong>

                <span
                  style={{
                    color:
                      '#c8d6b8',
                    fontSize:
                      '13px'
                  }}
                >
                  {formatDuration(
                    area.seconds
                  )}
                </span>
              </div>

              {areaGoals.map(
                goal => {

                  const goalMilestones =
                    Object.values(
                      goal.milestones
                    )
                      .filter(
                        milestone =>
                          milestone.seconds >
                          0
                      )
                      .sort(
                        (a, b) =>
                          b.seconds -
                          a.seconds
                      )

                  return (
                    <div
                      key={goal.id}
                      style={{
                        marginLeft:
                          '20px',
                        marginTop:
                          '14px'
                      }}
                    >

                      <div
                        style={{
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'center'
                        }}
                      >

                        <span
                          style={{
                            color:
                              '#d9ddd5',
                            fontSize:
                              '13px'
                          }}
                        >
                          {goal.title}
                        </span>

                        <span
                          style={{
                            color:
                              '#9ba094',
                            fontSize:
                              '12px'
                          }}
                        >
                          {formatDuration(
                            goal.seconds
                          )}
                        </span>

                      </div>

                      {goalMilestones.map(
                        milestone => (
                          <div
                            key={
                              milestone.id
                            }
                            style={{
                              display:
                                'flex',
                              justifyContent:
                                'space-between',
                              marginLeft:
                                '20px',
                              marginTop:
                                '9px',
                              color:
                                '#777c75',
                              fontSize:
                                '12px'
                            }}
                          >
                            <span>
                              {milestone.title}
                            </span>

                            <span>
                              {formatDuration(
                                milestone.seconds
                              )}
                            </span>
                          </div>
                        )
                      )}

                    </div>
                  )
                }
              )}

            </div>
          )
        })}

        {totalUnassigned > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              borderTop:
                '1px solid #292c28',
              paddingTop:
                '14px',
              color:
                '#777c75',
              fontSize:
                '12px'
            }}
          >
            <span>
              Unassigned
            </span>

            <span>
              {formatDuration(
                totalUnassigned
              )}
            </span>
          </div>
        )}

      </div>

    </section>
  )
}

export default HierarchyAllocation