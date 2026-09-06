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

    data.push({
      date,
      label: date.slice(5),
      total,
      completed,
      incomplete: total - completed,
      completion:
        total === 0
          ? null
          : Math.round((completed / total) * 100)
    })
  }

  return data
}

export function calculateStreaks(dailyData) {
  let bestStreak = 0
  let runningStreak = 0

  for (const day of dailyData) {
    const perfect =
      day.total > 0 &&
      day.completed === day.total

    if (perfect) {
      runningStreak++
      bestStreak = Math.max(bestStreak, runningStreak)
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

export function calculateFocusTotal(sessions) {
  return sessions.reduce(
    (total, session) =>
      total + (session.duration_seconds || 0),
    0
  )
}

export function calculateFocusStats(sessions) {
  const durations = sessions.map(
    session => session.duration_seconds || 0
  )

  const totalSeconds = durations.reduce(
    (sum, seconds) => sum + seconds,
    0
  )

  const averageSeconds =
    durations.length === 0
      ? 0
      : Math.round(totalSeconds / durations.length)

  const longestSeconds =
    durations.length === 0
      ? 0
      : Math.max(...durations)

  return {
    totalSeconds,
    averageSeconds,
    sessionCount: sessions.length,
    longestSeconds
  }
}

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
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}