import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

function formatDate(date) {
  if (!date) return ''

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getDaysLeft(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const deadline = new Date(`${date}T00:00:00`)

  return Math.ceil(
    (deadline - today) / 86400000
  )
}

function formatMinutes(minutes) {
  if (!minutes) return '0m'

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours > 0) {
    return mins > 0
      ? `${hours}h ${mins}m`
      : `${hours}h`
  }

  return `${mins}m`
}

function getPace(
  progress,
  deadline,
  createdAt,
  status
) {
  if (status === 'completed') {
    return 'DONE'
  }

  const start = new Date(createdAt)
  start.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const end = new Date(
    `${deadline}T00:00:00`
  )

  const totalDays = Math.max(
    1,
    Math.ceil(
      (end - start) / 86400000
    )
  )

  const elapsedDays = Math.min(
    totalDays,
    Math.max(
      0,
      Math.ceil(
        (today - start) / 86400000
      )
    )
  )

  const expected = Math.min(
    100,
    Math.round(
      (elapsedDays / totalDays) *
        100
    )
  )

  if (getDaysLeft(deadline) < 0) {
    return progress >= 100
      ? 'DONE'
      : 'OVERDUE'
  }

  if (progress - expected < -15) {
    return 'BEHIND'
  }

  if (progress - expected > 15) {
    return 'AHEAD'
  }

  return 'ON TRACK'
}

function DeadlineIntelligence({ userId }) {
  const [goals, setGoals] = useState([])
  const [milestones, setMilestones] = useState([])
  const [tasks, setTasks] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const [
        { data: goalData, error: goalError },
        {
          data: milestoneData,
          error: milestoneError
        },
        { data: taskData, error: taskError },
        {
          data: sessionData,
          error: sessionError
        }
      ] = await Promise.all([
        supabase
          .from('goals')
          .select(
            'id, title, status, target_date, created_at'
          )
          .eq('user_id', userId)
          .not(
            'target_date',
            'is',
            null
          )
          .order(
            'target_date',
            {
              ascending: true
            }
          ),

        supabase
          .from('milestones')
          .select(
            'id, title, goal_id, status, target_date, created_at'
          )
          .not(
            'target_date',
            'is',
            null
          ),

        supabase
          .from('tasks')
          .select(
            'id, title, goal_id, milestone_id, completed, task_date, deadline, estimated_minutes, weight'
          )
          .eq('user_id', userId)
          .not(
            'deadline',
            'is',
            null
          )
          .order(
            'deadline',
            {
              ascending: true
            }
          ),

        supabase
          .from('focus_sessions')
          .select(
            'task_id, duration_seconds'
          )
          .eq('user_id', userId)
          .not(
            'duration_seconds',
            'is',
            null
          )
      ])

      if (goalError) {
        console.error(
          'DEADLINE GOALS FAILED:',
          goalError
        )
      }

      if (milestoneError) {
        console.error(
          'DEADLINE MILESTONES FAILED:',
          milestoneError
        )
      }

      if (taskError) {
        console.error(
          'DEADLINE TASKS FAILED:',
          taskError
        )
      }

      if (sessionError) {
        console.error(
          'DEADLINE FOCUS FAILED:',
          sessionError
        )
      }

      setGoals(goalData || [])
      setMilestones(
        milestoneData || []
      )
      setTasks(taskData || [])
      setSessions(
        sessionData || []
      )

      setLoading(false)
    }

    load()
  }, [userId])

  const data = useMemo(() => {
    const focusByTask = {}

    for (const session of sessions) {
      if (
        !session.task_id ||
        !session.duration_seconds
      ) {
        continue
      }

      focusByTask[session.task_id] =
        (
          focusByTask[
            session.task_id
          ] || 0
        ) +
        session.duration_seconds
    }

    const goalRows = goals.map(
      goal => {
        const goalTasks =
          tasks.filter(
            task =>
              task.goal_id ===
              goal.id
          )

        const completedTasks =
          goalTasks.filter(
            task =>
              task.completed
          )

        const remainingTasks =
          goalTasks.filter(
            task =>
              !task.completed
          )

        const total =
          goalTasks.length

        const completed =
          completedTasks.length

        /*
         * WEIGHTED GOAL PROGRESS
         *
         * Task count remains actual.
         * Progress uses W1-W4.
         */
        const totalWeight =
          goalTasks.reduce(
            (sum, task) =>
              sum +
              (Number(
                task.weight
              ) || 1),
            0
          )

        const completedWeight =
          completedTasks.reduce(
            (sum, task) =>
              sum +
              (Number(
                task.weight
              ) || 1),
            0
          )

        const progress =
          totalWeight === 0
            ? 0
            : Math.round(
                (completedWeight /
                  totalWeight) *
                  100
              )

        const plannedMinutes =
          goalTasks.reduce(
            (sum, task) =>
              sum +
              (task.estimated_minutes ||
                0),
            0
          )

        const completedPlannedMinutes =
          completedTasks.reduce(
            (sum, task) =>
              sum +
              (task.estimated_minutes ||
                0),
            0
          )

        const remainingPlannedMinutes =
          remainingTasks.reduce(
            (sum, task) =>
              sum +
              (task.estimated_minutes ||
                0),
            0
          )

        const actualFocusSeconds =
          goalTasks.reduce(
            (sum, task) =>
              sum +
              (focusByTask[
                task.id
              ] || 0),
            0
          )

        const daysLeft =
          getDaysLeft(
            goal.target_date
          )

        const dailyRequiredMinutes =
          daysLeft > 0
            ? Math.ceil(
                remainingPlannedMinutes /
                  daysLeft
              )
            : remainingPlannedMinutes

        const pace =
          total === 0
            ? goal.status ===
              'completed'
              ? 'DONE'
              : 'NO TASKS'
            : getPace(
                progress,
                goal.target_date,
                goal.created_at,
                goal.status
              )

        const timeTrackedRatio =
          plannedMinutes > 0
            ? Math.round(
                (actualFocusSeconds /
                  (plannedMinutes *
                    60)) *
                  100
              )
            : null

        return {
          ...goal,

          total,
          completed,

          totalWeight,
          completedWeight,

          progress,

          plannedMinutes,
          completedPlannedMinutes,
          remainingPlannedMinutes,

          actualFocusSeconds,
          timeTrackedRatio,

          dailyRequiredMinutes,
          daysLeft,
          pace
        }
      }
    )

    const milestoneRows =
      milestones
        .filter(
          milestone =>
            goals.some(
              goal =>
                goal.id ===
                milestone.goal_id
            )
        )
        .map(
          milestone => {
            const milestoneTasks =
              tasks.filter(
                task =>
                  task.milestone_id ===
                  milestone.id
              )

            const completedTasks =
              milestoneTasks.filter(
                task =>
                  task.completed
              )

            const completed =
              completedTasks.length

            const total =
              milestoneTasks.length

            /*
             * WEIGHTED MILESTONE PROGRESS
             */
            const totalWeight =
              milestoneTasks.reduce(
                (sum, task) =>
                  sum +
                  (Number(
                    task.weight
                  ) || 1),
                0
              )

            const completedWeight =
              completedTasks.reduce(
                (sum, task) =>
                  sum +
                  (Number(
                    task.weight
                  ) || 1),
                0
              )

            const progress =
              totalWeight === 0
                ? 0
                : Math.round(
                    (completedWeight /
                      totalWeight) *
                      100
                  )

            const daysLeft =
              getDaysLeft(
                milestone.target_date
              )

            const remainingPlannedMinutes =
              milestoneTasks
                .filter(
                  task =>
                    !task.completed
                )
                .reduce(
                  (sum, task) =>
                    sum +
                    (task.estimated_minutes ||
                      0),
                  0
                )

            const dailyRequiredMinutes =
              daysLeft > 0
                ? Math.ceil(
                    remainingPlannedMinutes /
                      daysLeft
                  )
                : remainingPlannedMinutes

            const pace =
              total === 0
                ? milestone.status ===
                  'completed'
                  ? 'DONE'
                  : 'NO TASKS'
                : getPace(
                    progress,
                    milestone.target_date,
                    milestone.created_at,
                    milestone.status
                  )

            return {
              ...milestone,

              completed,
              total,

              totalWeight,
              completedWeight,

              progress,

              remainingPlannedMinutes,
              dailyRequiredMinutes,
              daysLeft,
              pace
            }
          }
        )
        .sort(
          (a, b) =>
            a.daysLeft -
            b.daysLeft
        )

    const taskRows = tasks
      .filter(
        task =>
          !task.completed
      )
      .map(task => ({
        ...task,
        daysLeft:
          getDaysLeft(
            task.deadline
          )
      }))
      .sort(
        (a, b) =>
          a.daysLeft -
          b.daysLeft
      )

    const activeGoals =
      goalRows.filter(
        goal =>
          goal.status !==
          'completed'
      )

    const atRisk =
      activeGoals.filter(
        goal =>
          goal.pace ===
            'BEHIND' ||
          goal.pace ===
            'OVERDUE'
      )

    const dueSoon =
      taskRows.filter(
        task =>
          task.daysLeft >= 0 &&
          task.daysLeft <= 3
      )

    const overdueTasks =
      taskRows.filter(
        task =>
          task.daysLeft < 0
      )

    const totalRemainingMinutes =
      activeGoals.reduce(
        (sum, goal) =>
          sum +
          goal.remainingPlannedMinutes,
        0
      )

    const goalsWithPlans =
      activeGoals.filter(
        goal =>
          goal.remainingPlannedMinutes >
          0
      )

    const totalDailyRequired =
      goalsWithPlans.reduce(
        (sum, goal) =>
          sum +
          goal.dailyRequiredMinutes,
        0
      )

    return {
      goalRows,
      milestoneRows,
      taskRows,
      activeGoals,
      atRisk,
      dueSoon,
      overdueTasks,
      totalRemainingMinutes,
      totalDailyRequired
    }
  }, [
    goals,
    milestones,
    tasks,
    sessions
  ])

  if (loading) {
    return (
      <section
        className="analytics-consistency"
        style={{
          marginTop: '30px'
        }}
      >
        <p className="eyebrow">
          DEADLINE INTELLIGENCE
        </p>

        <p
          style={{
            color: '#777'
          }}
        >
          Loading deadlines...
        </p>
      </section>
    )
  }

  return (
    <section
      className="analytics-consistency"
      style={{
        marginTop: '30px'
      }}
    >
      <div className="consistency-header">
        <div>
          <p className="eyebrow">
            DEADLINE INTELLIGENCE
          </p>

          <h2
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 400
            }}
          >
            Are you on track?
          </h2>
        </div>
      </div>

      <div className="consistency-grid">
        <div>
          <strong>
            {data.activeGoals.length}
          </strong>

          <span>
            ACTIVE GOALS
          </span>
        </div>

        <div>
          <strong>
            {data.atRisk.length}
          </strong>

          <span>
            GOALS AT RISK
          </span>
        </div>

        <div>
          <strong>
            {data.dueSoon.length}
          </strong>

          <span>
            TASKS DUE ≤3D
          </span>
        </div>

        <div>
          <strong>
            {data.overdueTasks.length}
          </strong>

          <span>
            OVERDUE TASKS
          </span>
        </div>
      </div>

      {data.goalRows.length > 0 && (
        <div
          style={sectionStyle}
        >
          <p className="eyebrow">
            GOAL PACE
          </p>

          {data.goalRows.map(
            goal => (
              <div
                key={goal.id}
                style={rowStyle}
              >
                <div
                  style={headerStyle}
                >
                  <div>
                    <div
                      style={titleStyle}
                    >
                      {goal.title}
                    </div>

                    <div
                      style={metaStyle}
                    >
                      Deadline ·{' '}
                      {formatDate(
                        goal.target_date
                      )}
                    </div>
                  </div>

                  <div
                    style={statusStyle(
                      goal.pace
                    )}
                  >
                    {goal.pace}
                  </div>
                </div>

                {goal.pace ===
                'NO TASKS' ? (
                  <div
                    style={
                      emptyStyle
                    }
                  >
                    No tasks assigned
                    to this goal yet.
                  </div>
                ) : (
                  <>
                    <div
                      style={
                        barStyle
                      }
                    >
                      <div
                        style={{
                          height:
                            '100%',
                          width: `${goal.progress}%`,
                          background:
                            '#c8d6b8'
                        }}
                      />
                    </div>

                    <div
                      style={
                        footerStyle
                      }
                    >
                      <span>
                        {goal.completed}/
                        {goal.total}{' '}
                        tasks ·{' '}
                        {
                          goal.progress
                        }%
                      </span>

                      <span>
                        {goal.daysLeft <
                        0
                          ? `${Math.abs(
                              goal.daysLeft
                            )}D OVERDUE`
                          : goal.daysLeft ===
                            0
                            ? 'DUE TODAY'
                            : `${goal.daysLeft}D LEFT`}
                      </span>
                    </div>

                    <div
                      style={
                        workloadStyle
                      }
                    >
                      <span>
                        {formatMinutes(
                          goal.remainingPlannedMinutes
                        )}{' '}
                        planned work
                        remaining
                      </span>

                      <span>
                        {goal.daysLeft >
                        0
                          ? `${formatMinutes(
                              goal.dailyRequiredMinutes
                            )} / day needed`
                          : 'Deadline reached'}
                      </span>
                    </div>

                    {goal.timeTrackedRatio !==
                      null && (
                      <div
                        style={
                          trackedStyle
                        }
                      >
                        Actual focus ·{' '}
                        {formatMinutes(
                          Math.round(
                            goal.actualFocusSeconds /
                              60
                          )
                        )}
                        {' · '}
                        {
                          goal.timeTrackedRatio
                        }
                        % of estimated
                        task time
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          )}
        </div>
      )}

      {data.milestoneRows.length >
        0 && (
        <div
          style={sectionStyle}
        >
          <p className="eyebrow">
            MILESTONE PACE
          </p>

          {data.milestoneRows.map(
            milestone => (
              <div
                key={
                  milestone.id
                }
                style={rowStyle}
              >
                <div
                  style={headerStyle}
                >
                  <div>
                    <div
                      style={titleStyle}
                    >
                      {
                        milestone.title
                      }
                    </div>

                    <div
                      style={metaStyle}
                    >
                      Deadline ·{' '}
                      {formatDate(
                        milestone.target_date
                      )}
                    </div>
                  </div>

                  <div
                    style={statusStyle(
                      milestone.pace
                    )}
                  >
                    {
                      milestone.pace
                    }
                  </div>
                </div>

                {milestone.pace ===
                'NO TASKS' ? (
                  <div
                    style={
                      emptyStyle
                    }
                  >
                    No tasks assigned
                    to this milestone
                    yet.
                  </div>
                ) : (
                  <>
                    <div
                      style={
                        barStyle
                      }
                    >
                      <div
                        style={{
                          height:
                            '100%',
                          width: `${milestone.progress}%`,
                          background:
                            '#8fa17f'
                        }}
                      />
                    </div>

                    <div
                      style={
                        footerStyle
                      }
                    >
                      <span>
                        {
                          milestone.completed
                        }
                        /
                        {
                          milestone.total
                        }{' '}
                        tasks ·{' '}
                        {
                          milestone.progress
                        }%
                      </span>

                      <span>
                        {milestone.daysLeft <
                        0
                          ? `${Math.abs(
                              milestone.daysLeft
                            )}D OVERDUE`
                          : milestone.daysLeft ===
                            0
                            ? 'DUE TODAY'
                            : `${milestone.daysLeft}D LEFT`}
                      </span>
                    </div>

                    <div
                      style={
                        workloadStyle
                      }
                    >
                      <span>
                        {formatMinutes(
                          milestone.remainingPlannedMinutes
                        )}{' '}
                        planned work
                        remaining
                      </span>

                      <span>
                        {milestone.daysLeft >
                        0
                          ? `${formatMinutes(
                              milestone.dailyRequiredMinutes
                            )} / day needed`
                          : 'Deadline reached'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </div>
      )}

      {data.taskRows.length >
        0 && (
        <div
          style={sectionStyle}
        >
          <p className="eyebrow">
            TASK DEADLINES
          </p>

          {data.taskRows
            .slice(0, 12)
            .map(task => (
              <div
                key={task.id}
                style={{
                  padding:
                    '14px 0',
                  borderTop:
                    '1px solid #292929',
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  gap: '20px',
                  alignItems:
                    'center'
                }}
              >
                <div>
                  <div
                    style={{
                      color:
                        '#d8d8d5',
                      fontSize:
                        '13px'
                    }}
                  >
                    {task.title}
                  </div>

                  <div
                    style={
                      metaStyle
                    }
                  >
                    Deadline ·{' '}
                    {formatDate(
                      task.deadline
                    )}

                    {task.estimated_minutes
                      ? ` · ${formatMinutes(
                          task.estimated_minutes
                        )} planned`
                      : ''}
                  </div>
                </div>

                <div
                  style={statusStyle(
                    task.daysLeft <
                      0
                      ? 'OVERDUE'
                      : task.daysLeft <=
                        3
                        ? 'URGENT'
                        : 'NORMAL'
                  )}
                >
                  {task.daysLeft <
                  0
                    ? `${Math.abs(
                        task.daysLeft
                      )}D OVERDUE`
                    : task.daysLeft ===
                      0
                      ? 'DUE TODAY'
                      : task.daysLeft ===
                        1
                        ? '1D LEFT'
                        : `${task.daysLeft}D LEFT`}
                </div>
              </div>
            ))}
        </div>
      )}

      {data.activeGoals.length >
        0 &&
        data.totalRemainingMinutes >
          0 && (
          <div
            style={sectionStyle}
          >
            <p className="eyebrow">
              WORKLOAD REQUIRED
            </p>

            <div className="consistency-grid">
              <div>
                <strong>
                  {formatMinutes(
                    data.totalRemainingMinutes
                  )}
                </strong>

                <span>
                  PLANNED WORK LEFT
                </span>
              </div>

              <div>
                <strong>
                  {formatMinutes(
                    data.totalDailyRequired
                  )}
                </strong>

                <span>
                  FOCUS / DAY NEEDED
                </span>
              </div>
            </div>

            <p
              style={
                noteStyle
              }
            >
              This is based on
              the estimated time
              of unfinished tasks
              attached to active
              goals. Actual focus
              time is tracked
              separately.
            </p>
          </div>
        )}

      {data.goalRows.length ===
        0 &&
        data.milestoneRows
          .length === 0 &&
        data.taskRows.length ===
          0 && (
          <p
            style={{
              color: '#666',
              marginTop: '30px'
            }}
          >
            No deadlines have
            been created yet.
          </p>
        )}
    </section>
  )
}

const sectionStyle = {
  marginTop: '45px',
  borderTop: '1px solid #292929',
  paddingTop: '35px'
}

const rowStyle = {
  borderTop: '1px solid #292929',
  padding: '22px 0 25px'
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '20px',
  alignItems: 'flex-start'
}

const titleStyle = {
  color: '#e9e9e7',
  fontSize: '15px',
  marginBottom: '6px'
}

const metaStyle = {
  color: '#666',
  fontSize: '11px'
}

const barStyle = {
  marginTop: '18px',
  height: '5px',
  background: '#292929'
}

const footerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '20px',
  marginTop: '9px',
  color: '#666',
  fontSize: '11px'
}

const workloadStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '20px',
  marginTop: '13px',
  color: '#777',
  fontSize: '11px'
}

const trackedStyle = {
  marginTop: '9px',
  color: '#555',
  fontSize: '10px'
}

const emptyStyle = {
  marginTop: '16px',
  color: '#666',
  fontSize: '12px'
}

const noteStyle = {
  color: '#555',
  fontSize: '11px',
  lineHeight: 1.6,
  marginTop: '20px'
}

function statusStyle(status) {
  const positive =
    status === 'ON TRACK' ||
    status === 'AHEAD' ||
    status === 'DONE' ||
    status === 'COMPLETED'

  const negative =
    status === 'BEHIND' ||
    status === 'OVERDUE'

  return {
    color: negative
      ? '#aaa'
      : positive
        ? '#c8d6b8'
        : '#777',
    fontSize: '10px',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap'
  }
}

export default DeadlineIntelligence