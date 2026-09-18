export function getToday() {
  const date = new Date()

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number)

  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)

  const newYear = date.getFullYear()
  const newMonth = String(date.getMonth() + 1).padStart(2, '0')
  const newDay = String(date.getDate()).padStart(2, '0')

  return `${newYear}-${newMonth}-${newDay}`
}

export function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)

  return Math.round(
    (endDate - startDate) / (1000 * 60 * 60 * 24)
  )
}

export function buildDailyData(tasks, startDate, endDate) {
  const numberOfDays =
    startDate <= endDate
      ? daysBetween(startDate, endDate) + 1
      : 0

  const data = []

  for (let i = 0; i < numberOfDays; i++) {
    const date = addDays(startDate, i)

    const dayTasks = tasks.filter(
      task => task.task_date === date
    )

    const total = dayTasks.length

    const completed = dayTasks.filter(
      task => task.completed
    ).length

    const totalWeight = dayTasks.reduce(
      (sum, task) =>
        sum + (Number(task.weight) || 1),
      0
    )

    const completedWeight = dayTasks
      .filter(task => task.completed)
      .reduce(
        (sum, task) =>
          sum + (Number(task.weight) || 1),
        0
      )

    const completion =
      totalWeight === 0
        ? null
        : Math.round(
            (completedWeight / totalWeight) * 100
          )

    data.push({
      date,
      label: date.slice(5),

      // Actual task counts
      total,
      completed,
      incomplete: total - completed,

      // Weight-based progress
      totalWeight,
      completedWeight,
      completion
    })
  }

  return data
}

/*
 * TASK COMPLETION STREAKS
 *
 * A streak means consecutive days where
 * every planned task was completed.
 */
export function calculateStreaks(dailyData) {
  let bestStreak = 0
  let runningStreak = 0

  for (const day of dailyData) {
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

  for (let i = dailyData.length - 1; i >= 0; i--) {
    const day = dailyData[i]

    if (
      day.total > 0 &&
      day.completed === day.total
    ) {
      currentStreak++
    } else {
      break
    }
  }

  return {
    currentStreak,
    bestStreak
  }
}

/*
 * TOTAL FOCUS TIME
 */
export function calculateFocusTotal(sessions) {
  return sessions.reduce(
    (total, session) =>
      total + (session.duration_seconds || 0),
    0
  )
}

/*
 * FOCUS SESSION STATISTICS
 */
export function calculateFocusStats(sessions) {
  const validSessions = sessions.filter(
    session =>
      session.duration_seconds &&
      session.duration_seconds > 0
  )

  const durations = validSessions.map(
    session => session.duration_seconds
  )

  const totalSeconds = durations.reduce(
    (sum, seconds) => sum + seconds,
    0
  )

  const averageSeconds =
    durations.length === 0
      ? 0
      : Math.round(
          totalSeconds / durations.length
        )

  const longestSeconds =
    durations.length === 0
      ? 0
      : Math.max(...durations)

  return {
    totalSeconds,
    averageSeconds,
    sessionCount: validSessions.length,
    longestSeconds
  }
}

/*
 * UNIQUE FOCUS DAYS
 *
 * A focus day is a calendar day on which
 * at least one completed focus session exists.
 */
export function calculateFocusDays(sessions) {
  const focusedDates = new Set()

  for (const session of sessions) {
    if (
      !session.duration_seconds ||
      session.duration_seconds <= 0 ||
      !session.start_time
    ) {
      continue
    }

    const date = new Date(session.start_time)

    const year = date.getFullYear()
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0')
    const day = String(
      date.getDate()
    ).padStart(2, '0')

    focusedDates.add(
      `${year}-${month}-${day}`
    )
  }

  return focusedDates.size
}

/*
 * RETURNS ALL CALENDAR DATES
 * ON WHICH FOCUS WAS RECORDED.
 *
 * Useful for streaks, calendars and
 * future heatmaps.
 */
export function getFocusDates(sessions) {
  const focusedDates = new Set()

  for (const session of sessions) {
    if (
      !session.duration_seconds ||
      session.duration_seconds <= 0 ||
      !session.start_time
    ) {
      continue
    }

    const date = new Date(session.start_time)

    const year = date.getFullYear()
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0')
    const day = String(
      date.getDate()
    ).padStart(2, '0')

    focusedDates.add(
      `${year}-${month}-${day}`
    )
  }

  return focusedDates
}

/*
 * FOCUS STREAKS
 *
 * Focus streak is based on actually recording
 * focus time on consecutive calendar days.
 */
export function calculateFocusStreaks(sessions) {
  const dates = Array.from(
    getFocusDates(sessions)
  ).sort()

  if (dates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0
    }
  }

  let bestStreak = 1
  let runningStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const previous = dates[i - 1]
    const current = dates[i]

    if (
      daysBetween(previous, current) === 1
    ) {
      runningStreak++

      bestStreak = Math.max(
        bestStreak,
        runningStreak
      )
    } else {
      runningStreak = 1
    }
  }

  /*
   * Only count a streak as "current" if the
   * latest focus day is today or yesterday.
   *
   * This prevents an old streak from being
   * incorrectly displayed as current.
   */
  const today = getToday()
  const latestDate = dates[dates.length - 1]

  const latestIsCurrent =
    latestDate === today ||
    latestDate === addDays(today, -1)

  let currentStreak = 0

  if (latestIsCurrent) {
    currentStreak = 1

    for (
      let i = dates.length - 1;
      i > 0;
      i--
    ) {
      if (
        daysBetween(
          dates[i - 1],
          dates[i]
        ) === 1
      ) {
        currentStreak++
      } else {
        break
      }
    }
  }

  return {
    currentStreak,
    bestStreak
  }
}

/*
 * AVERAGE FOCUS TIME PER FOCUS DAY
 *
 * This is more meaningful than average session
 * duration for measuring actual consistency.
 */
export function calculateAverageFocusPerDay(
  sessions
) {
  const focusDays = calculateFocusDays(
    sessions
  )

  if (focusDays === 0) {
    return 0
  }

  const totalSeconds =
    calculateFocusTotal(sessions)

  return Math.round(
    totalSeconds / focusDays
  )
}

/*
 * FOCUS TIME BY DAY
 *
 * Produces:
 *
 * [
 *   {
 *     date: '2026-09-10',
 *     seconds: 5400
 *   }
 * ]
 *
 * Useful for charts and heatmaps.
 */
export function buildDailyFocusData(
  sessions,
  startDate,
  endDate
) {
  const numberOfDays =
    startDate <= endDate
      ? daysBetween(startDate, endDate) + 1
      : 0

  const data = []

  for (let i = 0; i < numberOfDays; i++) {
    const date = addDays(startDate, i)

    const seconds = sessions
      .filter(session => {
        if (
          !session.start_time ||
          !session.duration_seconds
        ) {
          return false
        }

        const sessionDate =
          new Date(session.start_time)

        const year =
          sessionDate.getFullYear()

        const month = String(
          sessionDate.getMonth() + 1
        ).padStart(2, '0')

        const day = String(
          sessionDate.getDate()
        ).padStart(2, '0')

        return (
          `${year}-${month}-${day}` ===
          date
        )
      })
      .reduce(
        (sum, session) =>
          sum +
          (session.duration_seconds || 0),
        0
      )

    data.push({
      date,
      label: date.slice(5),
      seconds,
      focused: seconds > 0
    })
  }

  return data
}

/*
 * FOCUS TIME BY MONTH
 *
 * Keeps monthly analysis separate from
 * daily execution analytics.
 */
export function buildMonthlyFocusData(
  sessions
) {
  const months = {}

  for (const session of sessions) {
    if (
      !session.start_time ||
      !session.duration_seconds ||
      session.duration_seconds <= 0
    ) {
      continue
    }

    const date = new Date(session.start_time)

    const year = date.getFullYear()
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0')

    const key = `${year}-${month}`

    if (!months[key]) {
      months[key] = {
        month: key,
        seconds: 0,
        focusDays: new Set()
      }
    }

    months[key].seconds +=
      session.duration_seconds

    months[key].focusDays.add(
      `${year}-${month}-${String(
        date.getDate()
      ).padStart(2, '0')}`
    )
  }

  return Object.values(months)
    .sort((a, b) =>
      a.month.localeCompare(b.month)
    )
    .map(month => ({
      month: month.month,
      seconds: month.seconds,
      focusDays: month.focusDays.size
    }))
}

/*
 * FORMATTING
 */
export function formatSessionDuration(seconds) {
  const minutes = Math.floor(seconds / 60)

  if (minutes < 1) {
    return '<1m'
  }

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h ${remainingMinutes}m`
}

export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(
    (seconds % 3600) / 60
  )

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

/*
 * FOCUS TIME BY TASK
 *
 * Connects focus_sessions.task_id
 * to tasks.id and calculates how much
 * actual focus time was spent on each task.
 */
export function calculateFocusByTask(
  sessions,
  tasks
) {
  const taskMap = new Map()

  for (const task of tasks) {
    taskMap.set(task.id, task.title)
  }

  const allocation = {}

  for (const session of sessions) {
    if (
      !session.task_id ||
      !session.duration_seconds ||
      session.duration_seconds <= 0
    ) {
      continue
    }

    const title =
      taskMap.get(session.task_id)

    if (!title) {
      continue
    }

    if (!allocation[session.task_id]) {
      allocation[session.task_id] = {
        taskId: session.task_id,
        title,
        seconds: 0
      }
    }

    allocation[session.task_id].seconds +=
      session.duration_seconds
  }

  return Object.values(allocation)
    .sort(
      (a, b) =>
        b.seconds - a.seconds
    )
}