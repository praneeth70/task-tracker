function AnalyticsStats({
  percentage,
  completed,
  total,
  focusTime,
  activeDays
}) {
  return (
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
          <strong>{focusTime}</strong>
          <span>focused</span>
        </div>

        <div>
          <strong>{activeDays}</strong>
          <span>active days</span>
        </div>

      </div>

    </section>
  )
}

export default AnalyticsStats