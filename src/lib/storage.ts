import type { AnimePlan } from '@/types/anime'

const STORAGE_KEY = 'aniplan_plans'

export function deleteAnimePlan(id: string): void {
  const plans = getAnimePlans().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function getAnimePlanById(id: string): AnimePlan | undefined {
  return getAnimePlans().find((p) => p.id === id)
}

export function getAnimePlans(): AnimePlan[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data) as AnimePlan[]
  } catch {
    return []
  }
}

export function saveAnimePlan(plan: AnimePlan): void {
  if (typeof window === 'undefined') return
  const plans = getAnimePlans()
  const index = plans.findIndex((p) => p.id === plan.id)
  if (index >= 0) {
    plans[index] = plan
  } else {
    plans.push(plan)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
}

export function updateEpisodeProgress(
  planId: string,
  episodeNumber: number,
  watched: boolean,
): AnimePlan | undefined {
  const plans = getAnimePlans()
  const plan = plans.find((p) => p.id === planId)
  if (!plan) return undefined

  if (watched) {
    if (!plan.watchedEpisodes.includes(episodeNumber)) {
      plan.watchedEpisodes.push(episodeNumber)
    }
  } else {
    plan.watchedEpisodes = plan.watchedEpisodes.filter((ep) => ep !== episodeNumber)
  }

  saveAnimePlan(plan)
  return plan
}

export function updateMultipleEpisodes(
  planId: string,
  episodeNumbers: number[],
  watched: boolean,
): AnimePlan | undefined {
  const plans = getAnimePlans()
  const plan = plans.find((p) => p.id === planId)
  if (!plan) return undefined

  if (watched) {
    for (const ep of episodeNumbers) {
      if (!plan.watchedEpisodes.includes(ep)) {
        plan.watchedEpisodes.push(ep)
      }
    }
  } else {
    plan.watchedEpisodes = plan.watchedEpisodes.filter((ep) => !episodeNumbers.includes(ep))
  }

  saveAnimePlan(plan)
  return plan
}
