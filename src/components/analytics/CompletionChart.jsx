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

      <span>
        {day.completion}% completion
      </span>
    </div>
  )
}

function CompletionChart({ data, numberOfDays }) {
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

  return (
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
          data={data}
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
            tickFormatter={value => `${value}%`}
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
  )
}

export default CompletionChart