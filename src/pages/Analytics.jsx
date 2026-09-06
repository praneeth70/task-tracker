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
  formatDuration,
  formatSessionDuration
} from '../utils/analytics'

import AnalyticsStats from '../components/analytics/AnalyticsStats'
import CompletionChart from '../components/analytics/CompletionChart'
import FocusChart from '../components/analytics/FocusChart'
import FocusStats from '../components/analytics/FocusStats'
import PlanningChart from '../components/analytics/PlanningChart'

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

  const percentage =
    total === 0
      ? 0
      : Math.round((completed / total) * 100)

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
              (sum, day) => sum + day.completion,
              0
            ) / activeDays
        )

  const {
    currentStreak,
    bestStreak
  } = calculateStreaks(dailyData)

  const focusSeconds =
    calculateFocusTotal(focusSessions)

  const {
    totalSeconds,
    averageSeconds,
    sessionCount,
    longestSeconds
  } = calculateFocusStats(focusSessions)

  const focusChartData = dailyData.map(day => {
    const sessions = focusSessions.filter(session => {
      const sessionDate =
        new Date(session.start_time)
          .toLocaleDateString('en-CA')

      return sessionDate === day.date
    })

    const seconds = calculateFocusTotal(sessions)

    return {
      label: day.label,
      date: day.date,
      minutes: Math.round(seconds / 60)
    }
  })

  const planningChartData = dailyData.map(day => ({
    label: day.label,
    date: day.date,
    total: day.total,
    completed: day.completed
  }))

  const numberOfDays =
    startDate <= endDate
      ? daysBetween(startDate, endDate) + 1
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

          <h1>Your performance.</h1>
        </div>

        <div className="analytics-dates">

          <label>
            <span>FROM</span>

            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e =>
                setStartDate(e.target.value)
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
                setEndDate(e.target.value)
              }
            />
          </label>

        </div>

      </div>

      <AnalyticsStats
        percentage={percentage}
        completed={completed}
        total={total}
        focusTime={formatDuration(focusSeconds)}
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
            <strong>{currentStreak}</strong>
            <span>current streak</span>
          </div>

          <div>
            <strong>{bestStreak}</strong>
            <span>best streak</span>
          </div>

          <div>
            <strong>{activeDays}</strong>
            <span>active days</span>
          </div>

          <div>
            <strong>{averageCompletion}%</strong>
            <span>average completion</span>
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
        totalFocus={formatDuration(totalSeconds)}
        averageSession={formatSessionDuration(averageSeconds)}
        sessionCount={sessionCount}
        longestSession={formatSessionDuration(longestSeconds)}
      />

      <PlanningChart
        data={planningChartData}
      />

    </main>
  )
}

export default Analytics