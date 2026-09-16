import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Task({
  task,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  onDragStart,
  onDrop,
  onDragEnd,
  onAreaAssigned,
  locked = false
}) {
  const [editing, setEditing] = useState(false)

  const [title, setTitle] = useState(
    task.title
  )

  const [startTime, setStartTime] = useState(
    task.start_time || ''
  )

  const [endTime, setEndTime] = useState(
    task.end_time || ''
  )

  const [deadline, setDeadline] = useState(
    task.deadline || ''
  )

  const [showAreas, setShowAreas] =
    useState(false)

  const [areas, setAreas] = useState([])
  const [goals, setGoals] = useState([])
  const [milestones, setMilestones] =
    useState([])

  const [selectedArea, setSelectedArea] =
    useState(task.area_id || null)

  const [selectedGoal, setSelectedGoal] =
    useState(task.goal_id || null)

  const [selectedMilestone, setSelectedMilestone] =
    useState(task.milestone_id || null)

  const [loadingAreas, setLoadingAreas] =
    useState(false)

  const [loadingGoals, setLoadingGoals] =
    useState(false)

  const [loadingMilestones, setLoadingMilestones] =
    useState(false)

  useEffect(() => {
    if (!showAreas) return

    loadAreas()
  }, [showAreas])

  async function loadAreas() {
    setLoadingAreas(true)

    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('user_id', task.user_id)
      .order('name')

    if (error) {
      console.error(
        'LOAD AREAS FAILED:',
        error
      )
      setLoadingAreas(false)
      return
    }

    setAreas(data || [])
    setLoadingAreas(false)
  }

  async function loadGoals(areaId) {
    setLoadingGoals(true)

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('area_id', areaId)
      .order('title')

    if (error) {
      console.error(
        'LOAD GOALS FAILED:',
        error
      )
      setGoals([])
      setLoadingGoals(false)
      return
    }

    setGoals(data || [])
    setLoadingGoals(false)
  }

  async function loadMilestones(goalId) {
    setLoadingMilestones(true)

    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('target_date', {
        ascending: true,
        nullsFirst: true
      })

    if (error) {
      console.error(
        'LOAD MILESTONES FAILED:',
        error
      )
      setLoadingMilestones(false)
      return
    }

    setMilestones(data || [])
    setLoadingMilestones(false)
  }

  async function assignHierarchy(
    areaId,
    goalId = null,
    milestoneId = null
  ) {
    const { error } = await supabase
      .from('tasks')
      .update({
        area_id: areaId,
        goal_id: goalId,
        milestone_id: milestoneId
      })
      .eq('id', task.id)

    if (error) {
      console.error(
        'ASSIGN HIERARCHY FAILED:',
        error
      )
      return
    }

    setSelectedArea(areaId)
    setSelectedGoal(goalId)
    setSelectedMilestone(milestoneId)

    if (onAreaAssigned) {
      await onAreaAssigned()
    }
  }

  async function selectArea(areaId) {
    setSelectedArea(areaId)
    setSelectedGoal(null)
    setSelectedMilestone(null)

    setGoals([])
    setMilestones([])

    await assignHierarchy(
      areaId,
      null,
      null
    )

    if (areaId) {
      await loadGoals(areaId)
    }
  }

  async function selectGoal(goalId) {
    setSelectedGoal(goalId)
    setSelectedMilestone(null)

    setMilestones([])

    await assignHierarchy(
      selectedArea,
      goalId,
      null
    )

    if (goalId) {
      await loadMilestones(goalId)
    }
  }

  async function selectMilestone(
    milestoneId
  ) {
    setSelectedMilestone(
      milestoneId
    )

    await assignHierarchy(
      selectedArea,
      selectedGoal,
      milestoneId
    )

    setShowAreas(false)
  }

  async function removeHierarchy() {
    await assignHierarchy(
      null,
      null,
      null
    )

    setGoals([])
    setMilestones([])

    setSelectedArea(null)
    setSelectedGoal(null)
    setSelectedMilestone(null)

    setShowAreas(false)
  }

  function startEditing() {
    if (locked) return

    setTitle(task.title)

    setStartTime(
      task.start_time || ''
    )

    setEndTime(
      task.end_time || ''
    )

    setDeadline(
      task.deadline || ''
    )

    setEditing(true)
  }

  async function saveEdit() {
    const newTitle = title.trim()

    if (!newTitle) {
      setTitle(task.title)
      setEditing(false)
      return
    }

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

    await onEdit(
      task,
      newTitle,
      startTime,
      endTime,
      deadline
    )

    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.target.blur()
    }

    if (e.key === 'Escape') {
      setTitle(task.title)

      setStartTime(
        task.start_time || ''
      )

      setEndTime(
        task.end_time || ''
      )

      setDeadline(
        task.deadline || ''
      )

      setEditing(false)
    }
  }

  function handleDragStart(e) {
    if (
      locked ||
      editing ||
      showAreas
    ) {
      e.preventDefault()
      return
    }

    if (
      e.target.closest(
        'button, input, select'
      )
    ) {
      e.preventDefault()
      return
    }

    onDragStart(task)
  }

  function handleDrop(e) {
    e.preventDefault()
    onDrop(task)
  }

  return (
    <div
      className="task"
      draggable={
        !locked &&
        !editing &&
        !showAreas
      }
      onDragStart={handleDragStart}
      onDragOver={e =>
        e.preventDefault()
      }
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      style={{
        position: 'relative'
      }}
    >

      {/* CHECKBOX */}

      <input
        type="checkbox"
        checked={task.completed}
        onChange={() =>
          onToggle(task)
        }
        disabled={locked}
      />

      {/* TASK */}

      {editing ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
        >

          <input
            className="task-edit-input"
            value={title}
            onChange={e =>
              setTitle(e.target.value)
            }
            onKeyDown={handleKeyDown}
            autoFocus
          />

          <input
            type="time"
            value={startTime}
            onChange={e =>
              setStartTime(
                e.target.value
              )
            }
          />

          <span>→</span>

          <input
            type="time"
            value={endTime}
            onChange={e =>
              setEndTime(
                e.target.value
              )
            }
          />

          <input
            type="date"
            value={deadline}
            onChange={e =>
              setDeadline(
                e.target.value
              )
            }
          />

          <button
            type="button"
            onClick={saveEdit}
          >
            Save
          </button>

          <button
            type="button"
            onClick={() =>
              setEditing(false)
            }
          >
            Cancel
          </button>

        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <span
            className={
              task.completed
                ? 'completed'
                : ''
            }
          >
            {task.title}
          </span>

          {task.start_time && (
            <div
              style={{
                fontSize: '13px',
                color: '#8b9087',
                marginTop: '5px'
              }}
            >
              {task.start_time.slice(0, 5)}
              {task.end_time && ` → ${task.end_time.slice(0, 5)}`}
            </div>
          )}
        </div>
      )}

      {/* ACTIONS */}

      {!editing && !locked && (
        <div className="task-actions">

          {/* FOCUS */}

          <button
            type="button"
            onClick={() =>
              onFocus(task)
            }
            title={
              task.is_focus
                ? 'Remove from focus'
                : 'Add to focus'
            }
          >
            {task.is_focus
              ? '★'
              : '☆'}
          </button>

          {/* HIERARCHY */}

          <button
            type="button"
            onClick={() => {
              setSelectedArea(
                task.area_id || null
              )

              setSelectedGoal(
                task.goal_id || null
              )

              setSelectedMilestone(
                task.milestone_id || null
              )

              setGoals([])
              setMilestones([])

              setShowAreas(
                prev => !prev
              )
            }}
            title="Assign hierarchy"
          >
            📁
          </button>

          {/* EDIT */}

          <button
            type="button"
            onClick={startEditing}
            title="Edit task"
          >
            ✏️
          </button>

          {/* DELETE */}

          <button
            type="button"
            onClick={() =>
              onDelete(task)
            }
            title="Delete task"
          >
            🗑️
          </button>

        </div>
      )}

      {/* HIERARCHY PICKER */}

      {showAreas && (
        <div
          style={{
            position: 'absolute',
            right: '10px',
            top: '65px',
            width: '260px',
            background: '#171917',
            border:
              '1px solid #383c37',
            padding: '14px',
            zIndex: 100
          }}
        >

          {/* AREA */}

          <div
            style={{
              color: '#c8d6b8',
              fontSize: '11px',
              letterSpacing: '0.12em',
              marginBottom: '10px'
            }}
          >
            AREA
          </div>

          {loadingAreas ? (
            <div
              style={{
                color: '#777c75',
                fontSize: '13px',
                padding: '8px'
              }}
            >
              Loading areas...
            </div>
          ) : areas.length === 0 ? (
            <div
              style={{
                color: '#777c75',
                fontSize: '13px',
                padding: '8px'
              }}
            >
              No areas created yet.
            </div>
          ) : (
            areas.map(area => (
              <button
                key={area.id}
                type="button"
                onClick={() =>
                  selectArea(area.id)
                }
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 8px',
                  border: 'none',
                  background:
                    selectedArea ===
                    area.id
                      ? '#222620'
                      : 'transparent',
                  color:
                    selectedArea ===
                    area.id
                      ? '#c8d6b8'
                      : '#d9ddd5',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {selectedArea ===
                area.id
                  ? '●'
                  : '○'}{' '}
                {area.name}
              </button>
            ))
          )}

          {/* GOAL */}

          {selectedArea && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop:
                  '1px solid #292c28'
              }}
            >

              <div
                style={{
                  color: '#c8d6b8',
                  fontSize: '11px',
                  letterSpacing:
                    '0.12em',
                  marginBottom: '10px'
                }}
              >
                GOAL
              </div>

              {loadingGoals ? (
                <div
                  style={{
                    color: '#777c75',
                    fontSize: '13px',
                    padding: '8px'
                  }}
                >
                  Loading goals...
                </div>
              ) : goals.length === 0 ? (
                <div
                  style={{
                    color: '#777c75',
                    fontSize: '13px',
                    padding: '8px'
                  }}
                >
                  No goals in this area.
                </div>
              ) : (
                goals.map(goal => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() =>
                      selectGoal(
                        goal.id
                      )
                    }
                    style={{
                      display:
                        'block',
                      width: '100%',
                      textAlign:
                        'left',
                      padding:
                        '9px 8px',
                      border: 'none',
                      background:
                        selectedGoal ===
                        goal.id
                          ? '#222620'
                          : 'transparent',
                      color:
                        selectedGoal ===
                        goal.id
                          ? '#c8d6b8'
                          : '#d9ddd5',
                      cursor:
                        'pointer',
                      fontSize:
                        '14px'
                    }}
                  >
                    {selectedGoal ===
                    goal.id
                      ? '●'
                      : '○'}{' '}
                    {goal.title}
                  </button>
                ))
              )}

            </div>
          )}

          {/* MILESTONE */}

          {selectedGoal && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop:
                  '1px solid #292c28'
              }}
            >

              <div
                style={{
                  color: '#c8d6b8',
                  fontSize: '11px',
                  letterSpacing:
                    '0.12em',
                  marginBottom: '10px'
                }}
              >
                MILESTONE
              </div>

              {loadingMilestones ? (
                <div
                  style={{
                    color: '#777c75',
                    fontSize: '13px',
                    padding: '8px'
                  }}
                >
                  Loading milestones...
                </div>
              ) : milestones.length ===
                0 ? (
                <div
                  style={{
                    color: '#777c75',
                    fontSize: '13px',
                    padding: '8px'
                  }}
                >
                  No milestones in this goal.
                </div>
              ) : (
                milestones.map(
                  milestone => (
                    <button
                      key={
                        milestone.id
                      }
                      type="button"
                      onClick={() =>
                        selectMilestone(
                          milestone.id
                        )
                      }
                      style={{
                        display:
                          'block',
                        width:
                          '100%',
                        textAlign:
                          'left',
                        padding:
                          '9px 8px',
                        border: 'none',
                        background:
                          selectedMilestone ===
                          milestone.id
                            ? '#222620'
                            : 'transparent',
                        color:
                          selectedMilestone ===
                          milestone.id
                            ? '#c8d6b8'
                            : '#d9ddd5',
                        cursor:
                          'pointer',
                        fontSize:
                          '14px'
                      }}
                    >
                      {selectedMilestone ===
                      milestone.id
                        ? '●'
                        : '○'}{' '}
                      {milestone.title}
                    </button>
                  )
                )
              )}

            </div>
          )}

          {/* REMOVE */}

          {(
            selectedArea ||
            selectedGoal ||
            selectedMilestone
          ) && (
            <button
              type="button"
              onClick={
                removeHierarchy
              }
              style={{
                display: 'block',
                width: '100%',
                marginTop: '14px',
                paddingTop: '12px',
                border: 'none',
                borderTop:
                  '1px solid #292c28',
                background:
                  'transparent',
                color: '#777c75',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove hierarchy
            </button>
          )}

        </div>
      )}

    </div>
  )
}

export default Task