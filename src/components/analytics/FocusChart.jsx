import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

function FocusChart({ data }) {
  return (
    <section className="analytics-chart">

      <div className="chart-header">
        <p className="eyebrow">
          FOCUS
        </p>

        <span>
          Focused time
        </span>
      </div>

      <ResponsiveContainer
        width="100%"
        height={300}
      >
        <BarChart
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
            tick={{
              fill: '#777',
              fontSize: 12
            }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{
              fill: '#777',
              fontSize: 12
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={value => `${value}m`}
          />

          <Tooltip
            formatter={value => [`${value} min`, 'Focused']}
          />

          <Bar
            dataKey="minutes"
            fill="#cdddbd"
          />

        </BarChart>
      </ResponsiveContainer>

    </section>
  )
}

export default FocusChart