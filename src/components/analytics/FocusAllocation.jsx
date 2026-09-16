import {
  calculateFocusByTask,
  formatDuration
} from '../../utils/analytics'

function FocusAllocation({
  tasks,
  focusSessions
}) {
  const allocation =
    calculateFocusByTask(
      focusSessions,
      tasks
    )

  if (allocation.length === 0) {
    return null
  }

  const totalFocus =
    allocation.reduce(
      (sum, task) =>
        sum + task.seconds,
      0
    )

  return (
    <section className="analytics-consistency">

      <div className="consistency-header">
        <p className="eyebrow">
          TIME ALLOCATION
        </p>

        <span>
          FOCUS BY TASK
        </span>
      </div>

      <div className="focus-allocation">

        {allocation.map(task => {
          const percentage =
            totalFocus === 0
              ? 0
              : Math.round(
                  (task.seconds /
                    totalFocus) *
                    100
                )

          return (
            <div
              className="focus-allocation-row"
              key={task.taskId}
            >

              <div className="focus-allocation-info">

                <strong>
                  {task.title}
                </strong>

                <span>
                  {formatDuration(
                    task.seconds
                  )}{' '}
                  · {percentage}%
                </span>

              </div>

              <div className="focus-allocation-bar">

                <div
                  className="focus-allocation-fill"
                  style={{
                    width: `${percentage}%`
                  }}
                />

              </div>

            </div>
          )
        })}

      </div>

    </section>
  )
}

export default FocusAllocation