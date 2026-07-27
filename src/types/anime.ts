export interface Anime {
  duration: number // average episode duration in minutes
  episodes: number
  genres?: string[]
  id: number
  image: string
  score: number
  status?: string
  synopsis?: string
  title: string
  titleJapanese?: string
  type?: string
  year?: number
}

export interface AnimePlan {
  anime: Anime
  availableDays: number[] // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  createdAt: string
  episodesPerDay: number
  id: string
  schedule: Schedule[]
  seasons: Season[] // list of seasons with their episode counts
  startDate: string
  totalEpisodes?: number // total episode count
  watchedEpisodes: number[]
}

export interface Schedule {
  date: string // ISO date string (YYYY-MM-DD)
  episodes: number[] // global episode numbers
}

export interface ScheduleResult {
  endDate: string
  schedule: Schedule[]
  totalDays: number
  totalHours: number
}

export interface Season {
  episodeCount: number
  label: string // e.g., "T1", "T2" or custom name
  number: number // season number (1, 2, 3...)
}

/**
 * Given a list of seasons and a global episode number,
 * returns the season-relative episode number.
 * Example: T1 has 12 eps, global ep 14 → returns { season: T2, episodeInSeason: 2 }
 */
export function getEpisodeNumberInSeason(
  seasons: Season[],
  globalEpisodeNumber: number,
): null | { episodeInSeason: number; season: Season } {
  let cumulative = 0
  for (const season of seasons) {
    if (globalEpisodeNumber <= cumulative + season.episodeCount) {
      return { episodeInSeason: globalEpisodeNumber - cumulative, season }
    }
    cumulative += season.episodeCount
  }
  return null
}

/**
 * Given a list of seasons and a global episode number,
 * returns which season that episode belongs to, or null if not found.
 */
export function getEpisodeSeason(seasons: Season[], episodeNumber: number): null | Season {
  let cumulative = 0
  for (const season of seasons) {
    cumulative += season.episodeCount
    if (episodeNumber <= cumulative) return season
  }
  return null
}

/**
 * Count how many watched episodes belong to a specific season.
 */
export function getSeasonWatchedCount(
  seasons: Season[],
  seasonIndex: number,
  watchedEpisodes: number[],
): number {
  const before = seasons.slice(0, seasonIndex).reduce((sum, s) => sum + s.episodeCount, 0)
  const seasonStart = before + 1
  const seasonEnd = before + seasons[seasonIndex].episodeCount
  return watchedEpisodes.filter((ep) => ep >= seasonStart && ep <= seasonEnd).length
}

/**
 * Calculate total episodes from seasons array.
 */
export function getTotalEpisodesFromSeasons(seasons: Season[]): number {
  return seasons.reduce((sum, s) => sum + s.episodeCount, 0)
}
