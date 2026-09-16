import {
  calculateFocusDays,
  calculateFocusTotal,
  calculateAverageFocusPerDay,
  formatDuration
} from '../../utils/analytics'

function SmartAnalytics({
  tasks,
  focusSessions,
  activeDays,
  currentFocusStreak,
  bestFocusStreak
}) {
  const totalTasks = tasks.length

  const completedTasks = tasks.filter(
    task => task.completed
  ).length

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        )

  const focusDays =
    calculateFocusDays(
      focusSessions
    )

  const totalFocus =
    calculateFocusTotal(
      focusSessions
    )

  const averageFocus =
    calculateAverageFocusPerDay(
      focusSessions
    )

  /*
   * No data = no fake insight.
   */
  if (
    totalTasks === 0 &&
    focusSessions.length === 0
  ) {
    return null
  }

  return (
    <section className="analytics-consistency">

      <div className="consistency-header">
        <p className="eyebrow">
          SMART ANALYTICS
        </p>

        <span>
          BEHAVIOR
        </span>
      </div>

      <div className="consistency-grid">

        <div>
          <strong>
            {completionRate}%
          </strong>

          <span>
            task completion
          </span>
        </div>

        <div>
          <strong>
            {focusDays}
          </strong>

          <span>
            focus days
          </span>
        </div>

        <div>
          <strong>
            {formatDuration(
              totalFocus
            )}
          </strong>

          <span>
            focused time
          </span>
        </div>

        <div>
          <strong>
            {formatDuration(
              averageFocus
            )}
          </strong>

          <span>
            avg focus / day
          </span>
        </div>

      </div>

      <div className="smart-insights">

        <p>
          You focused on{' '}
          <strong>
            {focusDays}
          </strong>{' '}
          {focusDays === 1
            ? 'day'
            : 'days'}{' '}
          during this period.
        </p>

        {currentFocusStreak > 0 && (
          <p>
            Your current focus streak is{' '}
            <strong>
              {currentFocusStreak}{' '}
              {currentFocusStreak === 1
                ? 'day'
                : 'days'}
            </strong>.
          </p>
        )}

        {currentFocusStreak === 0 &&
          bestFocusStreak > 0 && (
            <p>
              Your current focus streak is
              inactive. Your best streak in
              this period was{' '}
              <strong>
                {bestFocusStreak}{' '}
                {bestFocusStreak === 1
                  ? 'day'
                  : 'days'}
              </strong>.
            </p>
          )}

        {totalTasks > 0 && (
          <p>
            You completed{' '}
            <strong>
              {completedTasks}
            </strong>{' '}
            of{' '}
            <strong>
              {totalTasks}
            </strong>{' '}
            planned tasks.
          </p>
        )}

        {activeDays > 0 &&
          focusDays > activeDays && (
            <p>
              You focused on more days than
              you had planned tasks.
            </p>
          )}

        {completionRate < 50 &&
          totalFocus > 0 && (
            <p>
              You invested{' '}
              <strong>
                {formatDuration(
                  totalFocus
                )}
              </strong>{' '}
              of focused time, but cleared only{' '}
              <strong>
                {completionRate}%
              </strong>{' '}
              of planned tasks.
            </p>
          )}

        {completionRate >= 80 &&
          totalFocus > 0 && (
            <p>
              Strong execution: you cleared{' '}
              <strong>
                {completionRate}%
              </strong>{' '}
              of your planned tasks while
              recording{' '}
              <strong>
                {formatDuration(
                  totalFocus
                )}
              </strong>{' '}
              of focused time.
            </p>
          )}

      </div>

    </section>
  )
}

export default SmartAnalytics