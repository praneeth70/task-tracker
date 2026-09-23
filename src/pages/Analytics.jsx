import { useState } from 'react'

import useAnalytics from '../hooks/useAnalytics'

import {
  getToday,
  addDays,
  daysBetween,
  buildDailyData,
  calculateStreaks,
  calculateFocusTotal,
  calculateFocusStats,
  calculateFocusDays,
  calculateFocusStreaks,
  calculateAverageFocusPerDay,
  formatDuration,
  formatSessionDuration
} from '../utils/analytics'

import AnalyticsStats from '../components/analytics/AnalyticsStats'
import CompletionChart from '../components/analytics/CompletionChart'
import FocusChart from '../components/analytics/FocusChart'
import FocusStats from '../components/analytics/FocusStats'
import FocusAllocation from '../components/analytics/FocusAllocation'
import HierarchyAllocation from '../components/analytics/HierarchyAllocation'
import SmartAnalytics from '../components/analytics/SmartAnalytics'
import PlanningChart from '../components/analytics/PlanningChart'
import MonthlyProgress from '../components/analytics/MonthlyProgress'
import GoalPacing from '../components/analytics/GoalPacing'

function Analytics({ session, onBack }) {
  const today = getToday()

  const [startDate, setStartDate] = useState(
    addDays(today, -6)
  )

  const [endDate, setEndDate] = useState(today)

  const {
    tasks,
    focusSessions,
    loading
  } = useAnalytics(
    session.user.id,
    startDate,
    endDate
  )

  if (loading) {
    return (
      <div className="loading">
        Loading analytics...
      </div>
    )
  }

  const total = tasks.length

  const completed = tasks.filter(
    task => task.completed
  ).length

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

  const percentage =
    totalWeight === 0
      ? 0
      : Math.round(
          (completedWeight / totalWeight) * 100
        )

  const dailyData = buildDailyData(
    tasks,
    startDate,
    endDate
  )

  const activeDays = dailyData.filter(
    day => day.total > 0
  ).length

  const averageCompletion =
    activeDays === 0
      ? 0
      : Math.round(
          dailyData
            .filter(day => day.total > 0)
            .reduce(
              (sum, day) =>
                sum + day.completion,
              0
            ) / activeDays
        )

  /*
   * TASK COMPLETION STREAK
   */
  const {
    currentStreak,
    bestStreak
  } = calculateStreaks(dailyData)

  /*
   * FOCUS ANALYTICS
   */
  const focusSeconds =
    calculateFocusTotal(focusSessions)

  const {
    totalSeconds,
    averageSeconds,
    sessionCount,
    longestSeconds
  } = calculateFocusStats(focusSessions)

  const focusDays =
    calculateFocusDays(focusSessions)

  const {
    currentStreak: currentFocusStreak,
    bestStreak: bestFocusStreak
  } = calculateFocusStreaks(
    focusSessions
  )

  const averageFocusPerDay =
    calculateAverageFocusPerDay(
      focusSessions
    )

  const focusChartData = dailyData.map(day => {
    const sessions =
      focusSessions.filter(session => {
        const sessionDate =
          new Date(
            session.start_time
          ).toLocaleDateString(
            'en-CA'
          )

        return (
          sessionDate === day.date
        )
      })

    const seconds =
      calculateFocusTotal(sessions)

    return {
      label: day.label,
      date: day.date,
      minutes: Math.round(
        seconds / 60
      )
    }
  })

  const planningChartData =
    dailyData.map(day => ({
      label: day.label,
      date: day.date,
      total: day.total,
      completed: day.completed
    }))

  const numberOfDays =
    startDate <= endDate
      ? daysBetween(
          startDate,
          endDate
        ) + 1
      : 0

  return (
    <main className="analytics">

      <div className="analytics-header">

        <div>
          <button
            className="analytics-back"
            onClick={onBack}
          >
            ← Back to Ledger
          </button>

          <p className="eyebrow">
            ANALYTICS
          </p>

          <h1>
            Your performance.
          </h1>
        </div>

        <div className="analytics-dates">

          <label>
            <span>FROM</span>

            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e =>
                setStartDate(
                  e.target.value
                )
              }
            />
          </label>

          <label>
            <span>TO</span>

            <input
              type="date"
              value={endDate}
              max={today}
              min={startDate}
              onChange={e =>
                setEndDate(
                  e.target.value
                )
              }
            />
          </label>

        </div>

      </div>

      <AnalyticsStats
        percentage={percentage}
        completed={completed}
        total={total}
        totalWeight={totalWeight}
        completedWeight={completedWeight}
        focusTime={formatDuration(
          focusSeconds
        )}
        activeDays={activeDays}
      />

      <section className="analytics-consistency">

        <div className="consistency-header">
          <p className="eyebrow">
            CONSISTENCY
          </p>

          <span>
            {startDate} → {endDate}
          </span>
        </div>

        <div className="consistency-grid">

          <div>
            <strong>
              {currentFocusStreak}
            </strong>

            <span>
              focus streak
            </span>
          </div>

          <div>
            <strong>
              {bestFocusStreak}
            </strong>

            <span>
              best focus streak
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
                averageFocusPerDay
              )}
            </strong>

            <span>
              avg focus / day
            </span>
          </div>

        </div>

      </section>

      <CompletionChart
        data={dailyData}
        numberOfDays={numberOfDays}
      />

      <FocusChart
        data={focusChartData}
      />

      <FocusStats
        totalFocus={formatDuration(
          totalSeconds
        )}
        averageSession={formatSessionDuration(
          averageSeconds
        )}
        sessionCount={sessionCount}
        longestSession={formatSessionDuration(
          longestSeconds
        )}
      />

      <FocusAllocation
        tasks={tasks}
        focusSessions={focusSessions}
      />

      <HierarchyAllocation
        tasks={tasks}
        focusSessions={focusSessions}
      />

      <SmartAnalytics
        tasks={tasks}
        focusSessions={focusSessions}
        activeDays={activeDays}
        currentFocusStreak={currentFocusStreak}
        bestFocusStreak={bestFocusStreak}
      />

      <PlanningChart
        data={planningChartData}
      />

      <MonthlyProgress userId={session.user.id} />

      <GoalPacing userId={session.user.id} />

    </main>
  )
}

export default Analytics