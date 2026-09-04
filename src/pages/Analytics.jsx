import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

function DailyTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const day = payload[0].payload

  if (day.total === 0) {
    return (
      <div className="analytics-tooltip">
        <strong>{day.date}</strong>
        <span>No tasks planned</span>
      </div>
    )
  }

  return (
    <div className="analytics-tooltip">
      <strong>{day.date}</strong>
      <span>
        {day.completed} / {day.total} tasks completed
      </span>
      <span>{day.completion}% completion</span>
    </div>
  )
}

function getToday() {
  const date = new Date()

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number)

  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)

  const newYear = date.getFullYear()
  const newMonth = String(date.getMonth() + 1).padStart(2, '0')
  const newDay = String(date.getDate()).padStart(2, '0')

  return `${newYear}-${newMonth}-${newDay}`
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)

  return Math.round(
    (endDate - startDate) / (1000 * 60 * 60 * 24)
  )
}

function Analytics({ session, onBack }) {
  const today = getToday()

  const [startDate, setStartDate] = useState(
    addDays(today, -6)
  )

  const [endDate, setEndDate] = useState(today)

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadAnalytics() {
    if (startDate > endDate) {
      setTasks([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('task_date', startDate)
      .lte('task_date', endDate)
      .order('task_date')

    if (error) {
      console.error('ANALYTICS ERROR:', error)
      setLoading(false)
      return
    }

    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAnalytics()
  }, [startDate, endDate])

  const total = tasks.length

  const completed = tasks.filter(
    task => task.completed
  ).length

  const incomplete = total - completed

  const percentage =
    total === 0
      ? 0
      : Math.round((completed / total) * 100)

  // DAILY DATA

  const numberOfDays =
    startDate <= endDate
      ? daysBetween(startDate, endDate) + 1
      : 0

  const chartData = []

  for (let i = 0; i < numberOfDays; i++) {
    const date = addDays(startDate, i)

    const dayTasks = tasks.filter(
      task => task.task_date === date
    )

    const dayTotal = dayTasks.length

    const dayCompleted = dayTasks.filter(
      task => task.completed
    ).length

    chartData.push({
      date,
      label: date.slice(5),
      total: dayTotal,
      completed: dayCompleted,
      completion:
        dayTotal === 0
          ? null
          : Math.round(
              (dayCompleted / dayTotal) * 100
            )
    })
  }

  // CONSISTENCY

  const activeDays = chartData.filter(
    day => day.total > 0
  ).length

  const averageCompletion =
    activeDays === 0
      ? 0
      : Math.round(
          chartData
            .filter(day => day.total > 0)
            .reduce(
              (sum, day) => sum + day.completion,
              0
            ) / activeDays
        )

  let bestStreak = 0
  let runningStreak = 0

  for (const day of chartData) {
    const perfect =
      day.total > 0 &&
      day.completed === day.total

    if (perfect) {
      runningStreak++
      bestStreak = Math.max(
        bestStreak,
        runningStreak
      )
    } else {
      runningStreak = 0
    }
  }

  let currentStreak = 0

  for (let i = chartData.length - 1; i >= 0; i--) {
    const day = chartData[i]

    if (
      day.total > 0 &&
      day.completed === day.total
    ) {
      currentStreak++
    } else {
      break
    }
  }

  // LABEL SPACING

  const labelInterval =
    numberOfDays <= 7
      ? 0
      : numberOfDays <= 30
        ? 4
        : numberOfDays <= 90
          ? 14
          : numberOfDays <= 180
            ? 29
            : 59

  if (loading) {
    return (
      <div className="loading">
        Loading analytics...
      </div>
    )
  }

  return (
    <main className="analytics">

      {/* HEADER */}

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

        {/* DATE RANGE */}

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

      {/* OVERVIEW */}

      <section className="analytics-overview">

        <div className="analytics-circle">
          <div>
            <strong>{percentage}%</strong>
            <span>completion</span>
          </div>
        </div>

        <div className="analytics-numbers">

          <div>
            <strong>{completed}</strong>
            <span>completed</span>
          </div>

          <div>
            <strong>{total}</strong>
            <span>planned</span>
          </div>

          <div>
            <strong>{incomplete}</strong>
            <span>unfinished</span>
          </div>

        </div>

      </section>

      {/* CONSISTENCY */}

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
            <strong>
              {averageCompletion}%
            </strong>
            <span>average completion</span>
          </div>

        </div>

      </section>

      {/* CHART */}

      <section className="analytics-chart">

        <div className="chart-header">
          <p className="eyebrow">
            DAILY PERFORMANCE
          </p>

          <span>
            Completion rate
          </span>
        </div>

        <ResponsiveContainer
          width="100%"
          height={350}
        >
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 10,
              left: 0,
              bottom: 10
            }}
          >

            <CartesianGrid
              stroke="#292929"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              interval={labelInterval}
              tick={{
                fill: '#777',
                fontSize: 12
              }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              domain={[0, 100]}
              tick={{
                fill: '#777',
                fontSize: 12
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={value =>
                `${value}%`
              }
            />

            <Tooltip
              content={<DailyTooltip />}
            />

            <Line
              type="monotone"
              dataKey="completion"
              stroke="#cdddbd"
              strokeWidth={2}
              dot={numberOfDays <= 30}
              connectNulls={false}
            />

          </LineChart>
        </ResponsiveContainer>

      </section>

    </main>
  )
}

export default Analytics