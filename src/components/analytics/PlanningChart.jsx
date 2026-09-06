import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

function PlanningChart({ data }) {
  return (
    <section className="analytics-chart">

      <div className="chart-header">
        <p className="eyebrow">
          PLANNING
        </p>

        <span>
          Planned vs completed
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
            allowDecimals={false}
            tick={{
              fill: '#777',
              fontSize: 12
            }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip />

          <Bar
            dataKey="total"
            name="Planned"
            fill="#555"
          />

          <Bar
            dataKey="completed"
            name="Completed"
            fill="#cdddbd"
          />

        </BarChart>
      </ResponsiveContainer>

    </section>
  )
}

export default PlanningChart