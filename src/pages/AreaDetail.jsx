import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function AreaDetail({ session, area, onBack }) {
  const [tasks, setTasks] = useState([])
  const [focusTimes, setFocusTimes] = useState({})
  const [goals, setGoals] = useState([])
  const [milestones, setMilestones] = useState({})
  const [loading, setLoading] = useState(true)

  const [showGoalForm, setShowGoalForm] =
    useState(false)

  const [goalTitle, setGoalTitle] =
    useState('')

  const [goalDescription, setGoalDescription] =
    useState('')

  const [goalDeadline, setGoalDeadline] =
    useState('')

  const [savingGoal, setSavingGoal] =
    useState(false)

  const [editingGoalId, setEditingGoalId] =
    useState(null)

  const [editGoalTitle, setEditGoalTitle] =
    useState('')

  const [editGoalDescription, setEditGoalDescription] =
    useState('')

  const [editGoalDeadline, setEditGoalDeadline] =
    useState('')

  const [savingGoalEdit, setSavingGoalEdit] =
    useState(false)

  const [milestoneForm, setMilestoneForm] =
    useState(null)

  const [milestoneTitle, setMilestoneTitle] =
    useState('')

  const [milestoneDeadline, setMilestoneDeadline] =
    useState('')

  const [savingMilestone, setSavingMilestone] =
    useState(false)

  const [editingMilestoneId, setEditingMilestoneId] =
    useState(null)

  const [editMilestoneTitle, setEditMilestoneTitle] =
    useState('')

  const [editMilestoneDeadline, setEditMilestoneDeadline] =
    useState('')

  const [editMilestoneCurrentValue, setEditMilestoneCurrentValue] =
    useState('')

  const [editMilestoneTargetValue, setEditMilestoneTargetValue] =
    useState('')

  const [editMilestoneUnit, setEditMilestoneUnit] =
    useState('')

  const [savingMilestoneEdit, setSavingMilestoneEdit] =
    useState(false)

  useEffect(() => {
    loadAreaHistory()
  }, [area.id])

  async function loadAreaHistory() {
    setLoading(true)

    const [
      { data: taskData, error: taskError },
      { data: goalData, error: goalError }
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('area_id', area.id)
        .order('task_date', {
          ascending: true
        })
        .order('position', {
          ascending: true,
          nullsFirst: false
        })
        .order('created_at', {
          ascending: true
        }),

      supabase
        .from('goals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('area_id', area.id)
        .order('target_date', {
          ascending: true,
          nullsFirst: true
        })
        .order('created_at', {
          ascending: true
        })
    ])

    if (taskError) {
      console.error(
        'LOAD AREA TASKS FAILED:',
        taskError
      )
      setLoading(false)
      return
    }

    if (goalError) {
      console.error(
        'LOAD AREA GOALS FAILED:',
        goalError
      )
      setLoading(false)
      return
    }

    const loadedTasks = taskData || []
    const loadedGoals = goalData || []

    setTasks(loadedTasks)
    setGoals(loadedGoals)

    if (loadedGoals.length > 0) {
      const goalIds = loadedGoals.map(
        goal => goal.id
      )

      const {
        data: milestoneData,
        error: milestoneError
      } = await supabase
        .from('milestones')
        .select('*')
        .in('goal_id', goalIds)
        .order('target_date', {
          ascending: true,
          nullsFirst: true
        })

      if (milestoneError) {
        console.error(
          'LOAD MILESTONES FAILED:',
          milestoneError
        )
      } else {
        const grouped = {}

        ;(milestoneData || []).forEach(
          milestone => {
            if (!grouped[milestone.goal_id]) {
              grouped[milestone.goal_id] = []
            }

            grouped[milestone.goal_id].push(
              milestone
            )
          }
        )

        setMilestones(grouped)
      }
    } else {
      setMilestones({})
    }

    if (!loadedTasks.length) {
      setFocusTimes({})
      setLoading(false)
      return
    }

    const taskIds = loadedTasks.map(
      task => task.id
    )

    const {
      data: sessions,
      error: sessionError
    } = await supabase
      .from('focus_sessions')
      .select(
        'task_id, duration_seconds'
      )
      .eq('user_id', session.user.id)
      .in('task_id', taskIds)
      .not(
        'duration_seconds',
        'is',
        null
      )

    if (sessionError) {
      console.error(
        'LOAD AREA FOCUS TIME FAILED:',
        sessionError
      )
      setLoading(false)
      return
    }

    const totals = {}

    ;(sessions || []).forEach(session => {
      if (!session.task_id) return

      totals[session.task_id] =
        (totals[session.task_id] || 0) +
        (session.duration_seconds || 0)
    })

    setFocusTimes(totals)
    setLoading(false)
  }

  async function createGoal(e) {
    e.preventDefault()

    const title = goalTitle.trim()

    if (!title) return

    setSavingGoal(true)

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: session.user.id,
        area_id: area.id,
        title,
        description:
          goalDescription.trim() || null,
        status: 'active',
        target_date:
          goalDeadline || null
      })
      .select()
      .single()

    if (error) {
      console.error(
        'CREATE GOAL FAILED:',
        error
      )
      setSavingGoal(false)
      return
    }

    setGoals(prev => [
      ...prev,
      data
    ])

    setMilestones(prev => ({
      ...prev,
      [data.id]: []
    }))

    setGoalTitle('')
    setGoalDescription('')
    setGoalDeadline('')
    setShowGoalForm(false)
    setSavingGoal(false)
  }

  function startEditingGoal(goal) {
    setEditingGoalId(goal.id)
    setEditGoalTitle(goal.title || '')
    setEditGoalDescription(goal.description || '')
    setEditGoalDeadline(goal.target_date || '')
  }

  function cancelEditingGoal() {
    setEditingGoalId(null)
    setEditGoalTitle('')
    setEditGoalDescription('')
    setEditGoalDeadline('')
  }

  async function updateGoal(e, goalId) {
    e.preventDefault()

    const title = editGoalTitle.trim()
    if (!title) return

    setSavingGoalEdit(true)

    const { data, error } = await supabase
      .from('goals')
      .update({
        title,
        description: editGoalDescription.trim() || null,
        target_date: editGoalDeadline || null
      })
      .eq('id', goalId)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('UPDATE GOAL FAILED:', error)
      setSavingGoalEdit(false)
      return
    }

    setGoals(prev =>
      prev.map(goal =>
        goal.id === goalId ? data : goal
      )
    )

    cancelEditingGoal()
    setSavingGoalEdit(false)
  }

  async function updateGoalStatus(goalId, status) {
    const { data, error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('UPDATE GOAL STATUS FAILED:', error)
      return
    }

    setGoals(prev =>
      prev.map(goal =>
        goal.id === goalId ? data : goal
      )
    )
  }

  async function createMilestone(e, goalId) {
    e.preventDefault()

    const title = milestoneTitle.trim()

    if (!title) {
      window.alert('Enter a milestone title.')
      return
    }

    setSavingMilestone(true)

    const { data, error } = await supabase
      .from('milestones')
      .insert({
        user_id: session.user.id,
        goal_id: goalId,
        title,
        target_date: milestoneDeadline || null
      })
      .select()
      .single()

    if (error) {
      console.error('CREATE MILESTONE FAILED:', error)

      window.alert(
        `Could not create milestone:\n\n${error.message}`
      )

      setSavingMilestone(false)
      return
    }

    setMilestoneTitle('')
    setMilestoneDeadline('')
    setMilestoneForm(null)
    setSavingMilestone(false)

    await loadAreaHistory()
  }

  function startEditingMilestone(milestone) {
    setEditingMilestoneId(milestone.id)
    setEditMilestoneTitle(milestone.title || '')
    setEditMilestoneDeadline(milestone.target_date || '')
    setEditMilestoneCurrentValue(
      milestone.current_value ?? ''
    )
    setEditMilestoneTargetValue(
      milestone.target_value ?? ''
    )
    setEditMilestoneUnit(milestone.unit || '')
  }

  function cancelEditingMilestone() {
    setEditingMilestoneId(null)
    setEditMilestoneTitle('')
    setEditMilestoneDeadline('')
    setEditMilestoneCurrentValue('')
    setEditMilestoneTargetValue('')
    setEditMilestoneUnit('')
  }

  async function updateMilestone(e, milestone) {
    e.preventDefault()

    const title = editMilestoneTitle.trim()

    if (!title) return

    setSavingMilestoneEdit(true)

    const currentValue = editMilestoneCurrentValue === ''
      ? null
      : Number(editMilestoneCurrentValue)

    const targetValue = editMilestoneTargetValue === ''
      ? null
      : Number(editMilestoneTargetValue)

    if (
      (currentValue !== null && !Number.isFinite(currentValue)) ||
      (targetValue !== null && !Number.isFinite(targetValue))
    ) {
      setSavingMilestoneEdit(false)
      return
    }

    const { data, error } = await supabase
      .from('milestones')
      .update({
        title,
        target_date: editMilestoneDeadline || null,
        current_value: currentValue,
        target_value: targetValue,
        unit: editMilestoneUnit.trim() || null
      })
      .eq('id', milestone.id)
      .eq('goal_id', milestone.goal_id)
      .select()
      .single()

    if (error) {
      console.error(
        'UPDATE MILESTONE FAILED:',
        error
      )
      setSavingMilestoneEdit(false)
      return
    }

    setMilestones(prev => ({
      ...prev,
      [milestone.goal_id]: (prev[milestone.goal_id] || []).map(item =>
        item.id === milestone.id ? data : item
      )
    }))

    cancelEditingMilestone()
    setSavingMilestoneEdit(false)
  }

  async function updateMilestoneStatus(milestone, status) {
    const { data, error } = await supabase
      .from('milestones')
      .update({ status })
      .eq('id', milestone.id)
      .eq('goal_id', milestone.goal_id)
      .select()
      .single()

    if (error) {
      console.error(
        'UPDATE MILESTONE STATUS FAILED:',
        error
      )
      return
    }

    setMilestones(prev => ({
      ...prev,
      [milestone.goal_id]: (prev[milestone.goal_id] || []).map(item =>
        item.id === milestone.id ? data : item
      )
    }))
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

  function formatDate(date) {
    if (!date) return ''

    const [year, month, day] =
      date.split('-')

    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    )

    return d.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    )
  }

  function getTotalFocusTime() {
    return Object.values(
      focusTimes
    ).reduce(
      (total, seconds) =>
        total + seconds,
      0
    )
  }

  function getGoalFocusTime(goalId) {
    return tasks
      .filter(task => task.goal_id === goalId)
      .reduce(
        (total, task) =>
          total + (focusTimes[task.id] || 0),
        0
      )
  }

  function getMilestoneFocusTime(milestoneId) {
    return tasks
      .filter(task => task.milestone_id === milestoneId)
      .reduce(
        (total, task) =>
          total + (focusTimes[task.id] || 0),
        0
      )
  }

  function getTaskProgress(items) {
    if (!items.length) return null

    const completed = items.filter(
      task => task.completed
    ).length

    return {
      completed,
      total: items.length,
      percentage: Math.round(
        (completed / items.length) * 100
      )
    }
  }

  function getMilestoneValueProgress(milestone) {
    const current = Number(milestone.current_value)
    const target = Number(milestone.target_value)

    if (
      !Number.isFinite(current) ||
      !Number.isFinite(target) ||
      target <= 0
    ) {
      return null
    }

    return Math.min(
      100,
      Math.max(0, Math.round((current / target) * 100))
    )
  }

  const completedTasks =
    tasks.filter(
      task => task.completed
    ).length

  const pendingTasks =
    tasks.length - completedTasks

  const totalFocusTime =
    getTotalFocusTime()

  return (
    <main className="dashboard">

      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#c8d6b8',
          cursor: 'pointer',
          fontSize: '16px',
          padding: 0,
          marginBottom: '35px'
        }}
      >
        ← Areas
      </button>

      <p className="eyebrow">
        AREA
      </p>

      <h1>{area.name}</h1>

      {area.description && (
        <p>{area.description}</p>
      )}

      {loading ? (
        <p
          style={{
            marginTop: '50px'
          }}
        >
          Loading history...
        </p>
      ) : (
        <>

          {/* STATS */}

          <section
            style={{
              display: 'flex',
              gap: '60px',
              marginTop: '50px',
              marginBottom: '55px',
              flexWrap: 'wrap'
            }}
          >

            <div>
              <p className="eyebrow">
                FOCUSED TIME
              </p>

              <strong
                style={{
                  fontSize: '28px',
                  color: '#e9e9e7'
                }}
              >
                {formatDuration(
                  totalFocusTime
                )}
              </strong>
            </div>

            <div>
              <p className="eyebrow">
                COMPLETED
              </p>

              <strong
                style={{
                  fontSize: '28px',
                  color: '#e9e9e7'
                }}
              >
                {completedTasks}
              </strong>
            </div>

            <div>
              <p className="eyebrow">
                PENDING
              </p>

              <strong
                style={{
                  fontSize: '28px',
                  color: '#e9e9e7'
                }}
              >
                {pendingTasks}
              </strong>
            </div>

          </section>

          {/* GOALS */}

          <section
            style={{
              marginBottom: '60px'
            }}
          >

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}
            >

              <p
                className="eyebrow"
                style={{
                  margin: 0
                }}
              >
                GOALS
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowGoalForm(
                    prev => !prev
                  )
                }
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#c8d6b8',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {showGoalForm
                  ? 'Cancel'
                  : '+ Add goal'}
              </button>

            </div>

            {showGoalForm && (
              <form
                onSubmit={createGoal}
                style={{
                  border:
                    '1px solid #292c28',
                  padding: '20px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: '12px'
                }}
              >

                <input
                  type="text"
                  placeholder="Goal title"
                  value={goalTitle}
                  onChange={e =>
                    setGoalTitle(
                      e.target.value
                    )
                  }
                  autoFocus
                />

                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={
                    goalDescription
                  }
                  onChange={e =>
                    setGoalDescription(
                      e.target.value
                    )
                  }
                />

                <label
                  style={{
                    display: 'flex',
                    flexDirection:
                      'column',
                    gap: '7px'
                  }}
                >
                  <span className="eyebrow">
                    DEADLINE
                  </span>

                  <input
                    type="date"
                    value={
                      goalDeadline
                    }
                    onChange={e =>
                      setGoalDeadline(
                        e.target.value
                      )
                    }
                  />
                </label>

                <button
                  type="submit"
                  disabled={savingGoal}
                >
                  {savingGoal
                    ? 'Saving...'
                    : 'Create goal'}
                </button>

              </form>
            )}

            {goals.length === 0 ? (
              <p
                style={{
                  color: '#777c75',
                  marginTop: '20px'
                }}
              >
                No goals in this area yet.
              </p>
            ) : (
              <div>

                {goals.map(goal => {

                  const goalMilestones =
                    milestones[
                      goal.id
                    ] || []

                  const goalTasks = tasks.filter(
                    task => task.goal_id === goal.id
                  )

                  const goalTaskProgress =
                    getTaskProgress(goalTasks)

                  const goalFocusTime =
                    getGoalFocusTime(goal.id)

                  return (
                    <div
                      key={goal.id}
                      style={{
                        borderTop:
                          '1px solid #292c28',
                        padding:
                          '20px 6px'
                      }}
                    >

                      <div
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'flex-start',
                          gap: '20px'
                        }}
                      >

                        <div style={{ flex: 1 }}>

                          {editingGoalId === goal.id ? (
                            <form
                              onSubmit={e => updateGoal(e, goal.id)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                maxWidth: '620px'
                              }}
                            >
                              <input
                                type="text"
                                value={editGoalTitle}
                                onChange={e => setEditGoalTitle(e.target.value)}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Description (optional)"
                                value={editGoalDescription}
                                onChange={e => setEditGoalDescription(e.target.value)}
                              />
                              <label
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '7px'
                                }}
                              >
                                <span className="eyebrow">DEADLINE</span>
                                <input
                                  type="date"
                                  value={editGoalDeadline}
                                  onChange={e => setEditGoalDeadline(e.target.value)}
                                />
                              </label>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={savingGoalEdit}>
                                  {savingGoalEdit ? 'Saving...' : 'Save'}
                                </button>
                                <button type="button" onClick={cancelEditingGoal}>
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div
                                style={{
                                  color: goal.status === 'completed' ? '#8d928a' : '#e9e9e7',
                                  fontSize: '16px'
                                }}
                              >
                                {goal.title}
                              </div>
                              {goal.description && (
                                <div
                                  style={{
                                    color: '#777c75',
                                    fontSize: '13px',
                                    marginTop: '6px'
                                  }}
                                >
                                  {goal.description}
                                </div>
                              )}
                              {goal.target_date && (
                                <div
                                  style={{
                                    color: '#666b63',
                                    fontSize: '12px',
                                    marginTop: '7px'
                                  }}
                                >
                                  Deadline: {formatDate(goal.target_date)}
                                </div>
                              )}
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '14px',
                                  flexWrap: 'wrap',
                                  color: '#8d928a',
                                  fontSize: '12px',
                                  marginTop: '10px'
                                }}
                              >
                                <span>Status {goal.status || 'active'}</span>
                                <span>Focused {formatDuration(goalFocusTime)}</span>
                                {goalTaskProgress && (
                                  <span>
                                    Tasks {goalTaskProgress.completed}/{goalTaskProgress.total} ({goalTaskProgress.percentage}%)
                                  </span>
                                )}
                              </div>
                              {goalTaskProgress && (
                                <div
                                  style={{
                                    height: '4px',
                                    background: '#292c28',
                                    marginTop: '10px',
                                    maxWidth: '420px'
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${goalTaskProgress.percentage}%`,
                                      height: '100%',
                                      background: '#c8d6b8'
                                    }}
                                  />
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                {['active', 'paused', 'completed'].map(status => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateGoalStatus(goal.id, status)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      color: goal.status === status ? '#c8d6b8' : '#666b63',
                                      cursor: 'pointer',
                                      fontSize: '11px'
                                    }}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}

                        </div>

                        {editingGoalId !== goal.id && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              flexShrink: 0
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => startEditingGoal(goal)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#777c75',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMilestoneForm(milestoneForm === goal.id ? null : goal.id)
                                setMilestoneTitle('')
                                setMilestoneDeadline('')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#c8d6b8',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              {milestoneForm === goal.id ? 'Cancel' : '+ Add milestone'}
                            </button>
                          </div>
                        )}

                      </div>

                      {/* MILESTONE FORM */}

                      {milestoneForm ===
                        goal.id && (
                        <form
                          onSubmit={e =>
                            createMilestone(
                              e,
                              goal.id
                            )
                          }
                          style={{
                            marginTop:
                              '16px',
                            padding:
                              '16px',
                            border:
                              '1px solid #292c28',
                            display:
                              'flex',
                            flexDirection:
                              'column',
                            gap: '10px'
                          }}
                        >

                          <input
                            type="text"
                            placeholder="Milestone title"
                            value={
                              milestoneTitle
                            }
                            onChange={e =>
                              setMilestoneTitle(
                                e.target.value
                              )
                            }
                            autoFocus
                          />

                          <label
                            style={{
                              display:
                                'flex',
                              flexDirection:
                                'column',
                              gap: '6px'
                            }}
                          >
                            <span className="eyebrow">
                              DEADLINE
                            </span>

                            <input
                              type="date"
                              value={
                                milestoneDeadline
                              }
                              onChange={e =>
                                setMilestoneDeadline(
                                  e.target.value
                                )
                              }
                            />
                          </label>

                          <button
                            type="submit"
                            disabled={
                              savingMilestone
                            }
                          >
                            {savingMilestone
                              ? 'Saving...'
                              : 'Create milestone'}
                          </button>

                        </form>
                      )}

                      {/* MILESTONES */}

                      <div
                        style={{
                          marginTop:
                            '18px',
                          marginLeft:
                            '18px'
                        }}
                      >

                        <p
                          className="eyebrow"
                          style={{
                            marginBottom:
                              '10px'
                          }}
                        >
                          MILESTONES
                        </p>

                        {goalMilestones.length ===
                        0 ? (
                          <span
                            style={{
                              color:
                                '#666b63',
                              fontSize:
                                '12px'
                            }}
                          >
                            No milestones yet.
                          </span>
                        ) : (
                          goalMilestones.map(
                            milestone => {
                              const milestoneTasks =
                                tasks.filter(
                                  task =>
                                    task.milestone_id === milestone.id
                                )

                              const milestoneTaskProgress =
                                getTaskProgress(milestoneTasks)

                              const milestoneFocusTime =
                                getMilestoneFocusTime(milestone.id)

                              const valueProgress =
                                getMilestoneValueProgress(milestone)

                              return (
                                <div
                                  key={milestone.id}
                                  style={{
                                    padding: '10px 0',
                                    color: '#c9cdc5',
                                    fontSize: '14px'
                                  }}
                                >
                                  {editingMilestoneId === milestone.id ? (
                                    <form
                                      onSubmit={e =>
                                        updateMilestone(e, milestone)
                                      }
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '9px',
                                        maxWidth: '620px'
                                      }}
                                    >
                                      <input
                                        type="text"
                                        value={editMilestoneTitle}
                                        onChange={e =>
                                          setEditMilestoneTitle(e.target.value)
                                        }
                                        autoFocus
                                      />

                                      <label
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '6px'
                                        }}
                                      >
                                        <span className="eyebrow">DEADLINE</span>
                                        <input
                                          type="date"
                                          value={editMilestoneDeadline}
                                          onChange={e =>
                                            setEditMilestoneDeadline(e.target.value)
                                          }
                                        />
                                      </label>

                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '9px'
                                        }}
                                      >
                                        <input
                                          type="number"
                                          step="any"
                                          placeholder="Current value"
                                          value={editMilestoneCurrentValue}
                                          onChange={e =>
                                            setEditMilestoneCurrentValue(e.target.value)
                                          }
                                        />
                                        <input
                                          type="number"
                                          step="any"
                                          placeholder="Target value"
                                          value={editMilestoneTargetValue}
                                          onChange={e =>
                                            setEditMilestoneTargetValue(e.target.value)
                                          }
                                        />
                                        <input
                                          type="text"
                                          placeholder="Unit"
                                          value={editMilestoneUnit}
                                          onChange={e =>
                                            setEditMilestoneUnit(e.target.value)
                                          }
                                        />
                                      </div>

                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '10px'
                                        }}
                                      >
                                        <button
                                          type="submit"
                                          disabled={savingMilestoneEdit}
                                        >
                                          {savingMilestoneEdit ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={cancelEditingMilestone}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: '15px'
                                        }}
                                      >
                                        <div>
                                          <span
                                            style={{
                                              color: milestone.status === 'completed'
                                                ? '#c8d6b8'
                                                : '#c9cdc5'
                                            }}
                                          >
                                            {milestone.status === 'completed' ? '✓' : '○'}{' '}
                                            {milestone.title}
                                          </span>

                                          {milestone.target_date && (
                                            <span
                                              style={{
                                                color: '#666b63',
                                                fontSize: '11px',
                                                marginLeft: '10px'
                                              }}
                                            >
                                              {formatDate(milestone.target_date)}
                                            </span>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            startEditingMilestone(milestone)
                                          }
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#777c75',
                                            cursor: 'pointer',
                                            fontSize: '11px'
                                          }}
                                        >
                                          Edit
                                        </button>
                                      </div>

                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '12px',
                                          flexWrap: 'wrap',
                                          color: '#777c75',
                                          fontSize: '11px',
                                          marginTop: '6px',
                                          marginLeft: '22px'
                                        }}
                                      >
                                        <span>
                                          Focused {formatDuration(milestoneFocusTime)}
                                        </span>

                                        {milestoneTaskProgress && (
                                          <span>
                                            Tasks {milestoneTaskProgress.completed}/{milestoneTaskProgress.total} ({milestoneTaskProgress.percentage}%)
                                          </span>
                                        )}

                                        {valueProgress !== null && (
                                          <span>
                                            Progress {milestone.current_value}/{milestone.target_value}{milestone.unit ? ` ${milestone.unit}` : ''} ({valueProgress}%)
                                          </span>
                                        )}

                                        {valueProgress === null && milestone.status && (
                                          <span>
                                            Status {milestone.status}
                                          </span>
                                        )}
                                      </div>

                                      {valueProgress !== null && (
                                        <div
                                          style={{
                                            height: '3px',
                                            background: '#292c28',
                                            marginTop: '8px',
                                            marginLeft: '22px',
                                            maxWidth: '360px'
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: `${valueProgress}%`,
                                              height: '100%',
                                              background: '#c8d6b8'
                                            }}
                                          />
                                        </div>
                                      )}

                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '10px',
                                          marginTop: '8px',
                                          marginLeft: '22px'
                                        }}
                                      >
                                        {['active', 'paused', 'completed'].map(status => (
                                          <button
                                            key={status}
                                            type="button"
                                            onClick={() =>
                                              updateMilestoneStatus(milestone, status)
                                            }
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              padding: 0,
                                              color: milestone.status === status
                                                ? '#c8d6b8'
                                                : '#666b63',
                                              cursor: 'pointer',
                                              fontSize: '10px'
                                            }}
                                          >
                                            {status}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )
                            })
                        )}

                      </div>

                    </div>
                  )
                })}

              </div>
            )}

          </section>

          {/* WORK HISTORY */}

          <section>

            <p className="eyebrow">
              WORK HISTORY
            </p>

            {tasks.length === 0 ? (
              <p
                style={{
                  color: '#777c75',
                  marginTop: '20px'
                }}
              >
                No work assigned to this
                area yet.
              </p>
            ) : (
              <div>

                {tasks.map(task => {

                  const focusTime =
                    focusTimes[
                      task.id
                    ] || 0

                  return (
                    <div
                      key={task.id}
                      style={{
                        borderTop:
                          '1px solid #292c28',
                        padding:
                          '20px 6px',
                        display: 'flex',
                        alignItems:
                          'center',
                        gap: '20px'
                      }}
                    >

                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          border:
                            '1px solid #596052',
                          display: 'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          color: '#c8d6b8',
                          fontSize: '12px',
                          flexShrink: 0
                        }}
                      >
                        {task.completed
                          ? '✓'
                          : ''}
                      </div>

                      <div
                        style={{
                          flex: 1
                        }}
                      >

                        <div
                          style={{
                            color:
                              task.completed
                                ? '#8d928a'
                                : '#e9e9e7',
                            fontSize: '16px'
                          }}
                        >
                          {task.title}
                        </div>

                        <div
                          style={{
                            color: '#666b63',
                            fontSize: '12px',
                            marginTop: '6px'
                          }}
                        >
                          {formatDate(
                            task.task_date
                          )}
                        </div>

                      </div>

                      <div
                        style={{
                          color:
                            focusTime > 0
                              ? '#c8d6b8'
                              : '#666b63',
                          fontSize: '13px',
                          minWidth: '75px',
                          textAlign: 'right'
                        }}
                      >
                        {focusTime > 0
                          ? formatDuration(
                              focusTime
                            )
                          : '—'}
                      </div>

                    </div>
                  )
                })}

              </div>
            )}

          </section>

        </>
      )}

    </main>
  )
}

export default AreaDetail