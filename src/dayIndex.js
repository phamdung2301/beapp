// Index ngày học dùng chung: enrich một lần, mọi component đọc từ đây
// (tránh import vòng App.jsx khi ChatDock/TutorChat cần tra ngày).
import { DAYS } from './data/days.js'
import { DAY_EXTRA } from './data/dayExtra.js'

export function enrichDay(day) {
  const ex = DAY_EXTRA[day.id]
  if (!ex) return day
  return {
    ...day,
    concepts: day.concepts.map((c, i) => ({ ...c, ...(ex.conceptExtras?.[i] || {}) })).concat(ex.extraConcepts || []),
    exercises: day.exercises.map((e, i) => ({ ...e, ...(ex.exerciseExtras?.[i] || {}) })),
    links: ex.links || [],
  }
}

export const ALL_DAYS = DAYS.map(enrichDay)
export const DAY_BY_ID = Object.fromEntries(ALL_DAYS.map(d => [d.id, d]))
