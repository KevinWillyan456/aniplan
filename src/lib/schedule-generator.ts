import { addDays, format } from 'date-fns'

import type { Anime, ScheduleResult } from '@/types/anime'

export interface RoutineInput {
  availableDays: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  episodeDuration: number // average duration in minutes
  episodesPerDay: number
  startDate: string // YYYY-MM-DD
  totalEpisodes: number
}

/**
 * Convenience function that takes an Anime and RoutineInput.
 */
export function generateAnimeSchedule(
  anime: Anime,
  routine: Omit<RoutineInput, 'episodeDuration' | 'totalEpisodes'> & {
    customEpisodes?: number
  },
): ScheduleResult {
  return generateSchedule({
    availableDays: routine.availableDays,
    episodeDuration: anime.duration || 24,
    episodesPerDay: routine.episodesPerDay,
    startDate: routine.startDate,
    totalEpisodes: routine.customEpisodes ?? anime.episodes,
  })
}

/**
 * Generates a marathon schedule based on the user's routine.
 *
 * Algorithm:
 * 1. Distribute episodesPerDay across the selected days
 * 2. Output an array of { date, episodes[] }
 */
export function generateSchedule(input: RoutineInput): ScheduleResult {
  const { availableDays, episodeDuration, episodesPerDay, startDate, totalEpisodes } = input

  const schedule: { date: string; episodes: number[] }[] = []
  let episodeCounter = 1
  // Parse date string manually (YYYY-MM-DD) to avoid timezone offset issues
  const [year, month, day] = startDate.split('-').map(Number)
  let currentDate = new Date(year, month - 1, day)
  let totalDays = 0
  const maxIterations = 1000 // safety limit
  let iterations = 0

  while (episodeCounter <= totalEpisodes && iterations < maxIterations) {
    iterations++
    const dayOfWeek = currentDate.getDay() // 0=Sun, 1=Mon, ...

    if (availableDays.includes(dayOfWeek)) {
      totalDays++
      const episodeBatch: number[] = []

      for (let i = 0; i < episodesPerDay && episodeCounter <= totalEpisodes; i++) {
        episodeBatch.push(episodeCounter)
        episodeCounter++
      }

      schedule.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        episodes: episodeBatch,
      })
    }

    currentDate = addDays(currentDate, 1)
  }

  const totalMinutes = totalEpisodes * episodeDuration
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100

  // The last date in the schedule is the end date
  const lastEntry = schedule[schedule.length - 1]

  return {
    endDate: lastEntry?.date ?? startDate,
    schedule,
    totalDays,
    totalHours,
  }
}
