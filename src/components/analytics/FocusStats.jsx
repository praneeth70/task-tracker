function FocusStats({
  totalFocus,
  averageSession,
  sessionCount,
  longestSession
}) {
  return (
    <section className="analytics-consistency">

      <div className="consistency-header">
        <p className="eyebrow">
          FOCUS INSIGHTS
        </p>

        <span>
          Your focus sessions
        </span>
      </div>

      <div className="consistency-grid">

        <div>
          <strong>{totalFocus}</strong>
          <span>total focused</span>
        </div>

        <div>
          <strong>{averageSession}</strong>
          <span>average session</span>
        </div>

        <div>
          <strong>{sessionCount}</strong>
          <span>sessions</span>
        </div>

        <div>
          <strong>{longestSession}</strong>
          <span>longest session</span>
        </div>

      </div>

    </section>
  )
}

export default FocusStats