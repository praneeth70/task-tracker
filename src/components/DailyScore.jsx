function DailyScore({
  tasks,
  focusSeconds,
  carryoverCount
}) {
  const totalWeight = tasks.reduce(
    (sum, task) =>
      sum + (Number(task.weight) || 1),
    0
  )

  const completedWeight = tasks
    .filter(task => task.completed)
    .reduce(
      (sum, task) =>
        sum + (Number(task.weight) || 1),
      0
    )

  /*
   * -----------------------------------------
   * TASK COMPLETION — 60 POINTS
   * -----------------------------------------
   */

  const completionRate =
    totalWeight === 0
      ? 0
      : completedWeight / totalWeight

  const completionPoints =
    completionRate * 60

  /*
   * -----------------------------------------
   * FOCUS — 25 POINTS
   * 2 hours = full focus score
   * -----------------------------------------
   */

  const focusTargetSeconds =
    2 * 60 * 60

  const focusRate =
    Math.min(
      focusSeconds / focusTargetSeconds,
      1
    )

  const focusPoints =
    focusRate * 25

  /*
   * -----------------------------------------
   * DEADLINES — 15 POINTS
   * -----------------------------------------
   */

  const tasksWithDeadlines =
    tasks.filter(
      task => task.deadline
    )

  let deadlineRate = 1

  if (tasksWithDeadlines.length > 0) {
    const successfulDeadlines =
      tasksWithDeadlines.filter(
        task => {
          if (!task.completed) {
            return false
          }

          const taskDate =
            task.task_date

          return (
            taskDate <= task.deadline
          )
        }
      ).length

    deadlineRate =
      successfulDeadlines /
      tasksWithDeadlines.length
  }

  const deadlinePoints =
    deadlineRate * 15

  /*
   * -----------------------------------------
   * FINAL SCORE
   * -----------------------------------------
   */

  const rawScore =
    completionPoints +
    focusPoints +
    deadlinePoints

  const score =
    totalWeight === 0
      ? 0
      : Math.round(rawScore)

  /*
   * -----------------------------------------
   * FOCUS DISPLAY
   * -----------------------------------------
   */

  const focusMinutes =
    Math.floor(
      focusSeconds / 60
    )

  const focusHours =
    Math.floor(
      focusMinutes / 60
    )

  const remainingMinutes =
    focusMinutes % 60

  const focusDisplay =
    focusHours > 0
      ? `${focusHours}h ${remainingMinutes}m`
      : `${remainingMinutes}m`

  /*
   * -----------------------------------------
   * DEADLINE DISPLAY
   * -----------------------------------------
   */

  const deadlineCount =
    tasksWithDeadlines.length

  const completedDeadlineCount =
    tasksWithDeadlines.filter(
      task =>
        task.completed &&
        task.task_date <= task.deadline
    ).length

  /*
   * -----------------------------------------
   * SCORE MESSAGE
   * -----------------------------------------
   */

  let message =
    'Start executing.'

  if (score >= 90) {
    message =
      'Excellent execution.'
  } else if (score >= 75) {
    message =
      'Strong day.'
  } else if (score >= 60) {
    message =
      'Solid progress.'
  } else if (score >= 40) {
    message =
      'You made progress. Keep going.'
  }

  return (
    <section className="daily-score">

      <div className="daily-score-header">

        <div>
          <p className="eyebrow">
            DAILY SCORE
          </p>

          <h2>
            How did you perform?
          </h2>

          <p className="daily-score-message">
            {message}
          </p>
        </div>

        <div className="daily-score-number">
          <strong>
            {score}
          </strong>

          <span>
            /100
          </span>
        </div>

      </div>

      <div className="daily-score-bar">
        <div
          className="daily-score-bar-fill"
          style={{
            width: `${score}%`
          }}
        />
      </div>

      <div className="daily-score-breakdown">

        <div className="daily-score-metric">
          <div>
            <strong>
              {Math.round(
                completionRate * 100
              )}%
            </strong>

            <span>
              TASK EXECUTION
            </span>
          </div>

          <small>
            {Math.round(
              completionPoints
            )}/60
          </small>
        </div>

        <div className="daily-score-metric">
          <div>
            <strong>
              {focusDisplay}
            </strong>

            <span>
              FOCUS TIME
            </span>
          </div>

          <small>
            {Math.round(
              focusPoints
            )}/25
          </small>
        </div>

        <div className="daily-score-metric">
          <div>
            <strong>
              {deadlineCount === 0
                ? '—'
                : `${completedDeadlineCount}/${deadlineCount}`}
            </strong>

            <span>
              DEADLINES
            </span>
          </div>

          <small>
            {Math.round(
              deadlinePoints
            )}/15
          </small>
        </div>

        <div className="daily-score-metric">
          <div>
            <strong>
              {carryoverCount}
            </strong>

            <span>
              CARRYOVER
            </span>
          </div>

          <small>
            unfinished
          </small>
        </div>

      </div>

      <p className="daily-score-explanation">
        Score = weighted task execution
        + focus time
        + deadline performance.
        Carryover is shown separately so
        unfinished work isn't penalized twice.
      </p>

    </section>
  )
}

export default DailyScore