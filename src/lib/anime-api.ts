/**
 * Unified anime search API with fallback chain:
 * Kitsu → AniList → Jikan (MyAnimeList) → Popular mock data
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface SearchResult {
  duration?: string
  episodes: null | number
  genres?: { name: string }[]
  images: {
    jpg: {
      image_url: string
      small_image_url: string
    }
  }
  mal_id: number
  score: null | number
  status?: string
  synopsis?: string
  title: string
  title_japanese?: string
  type?: string
  year?: number
}

// ---------------------------------------------------------------------------
// Fallback popular anime (last resort)
// ---------------------------------------------------------------------------

const POPULAR_ANIME: SearchResult[] = [
  {
    duration: '24 min per ep',
    episodes: 28,
    images: {
      jpg: {
        image_url: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',
        small_image_url: 'https://cdn.myanimelist.net/images/anime/1015/138006t.jpg',
      },
    },
    mal_id: 52991,
    score: 9.08,
    status: 'Finished Airing',
    title: 'Sousou no Frieren',
    title_japanese: '葬送のフリーレン',
    type: 'TV',
    year: 2023,
  },
  {
    duration: '24 min per ep',
    episodes: 159,
    images: {
      jpg: {
        image_url: 'https://cdn.myanimelist.net/images/anime/1129/140464.jpg',
        small_image_url: 'https://cdn.myanimelist.net/images/anime/1129/140464t.jpg',
      },
    },
    mal_id: 52198,
    score: 8.68,
    status: 'Currently Airing',
    title: 'One Piece: Egghead Arc',
    title_japanese: 'ONE PIECE エッグヘッド編',
    type: 'TV',
    year: 2024,
  },
  {
    duration: '23 min per ep',
    episodes: 12,
    images: {
      jpg: {
        image_url: 'https://cdn.myanimelist.net/images/anime/1932/143223.jpg',
        small_image_url: 'https://cdn.myanimelist.net/images/anime/1932/143223t.jpg',
      },
    },
    mal_id: 55812,
    score: 8.9,
    status: 'Currently Airing',
    title: 'Kimetsu no Yaiba: Hashira Geiko-hen',
    title_japanese: '鬼滅の刃 柱稽古編',
    type: 'TV',
    year: 2024,
  },
  {
    duration: '25 min per ep',
    episodes: 37,
    images: {
      jpg: {
        image_url: 'https://cdn.myanimelist.net/images/anime/1803/131345.jpg',
        small_image_url: 'https://cdn.myanimelist.net/images/anime/1803/131345t.jpg',
      },
    },
    mal_id: 50686,
    score: 8.24,
    status: 'Finished Airing',
    title: 'SPY x FAMILY Season 2',
    title_japanese: 'SPY×FAMILY Season 2',
    type: 'TV',
    year: 2023,
  },
  {
    duration: '23 min per ep',
    episodes: 24,
    images: {
      jpg: {
        image_url: 'https://cdn.myanimelist.net/images/anime/1630/141522.jpg',
        small_image_url: 'https://cdn.myanimelist.net/images/anime/1630/141522t.jpg',
      },
    },
    mal_id: 52701,
    score: 8.57,
    status: 'Finished Airing',
    title: 'Mushoku Tensei II: Isekai Ittara Honki Dasu Part 2',
    title_japanese: '無職転生 II ～異世界行ったら本気だす～ 第2クール',
    type: 'TV',
    year: 2024,
  },
]

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export interface AnimeSearchResponse {
  results: SearchResult[]
  source: 'anilist' | 'jikan' | 'kitsu' | 'popular'
}

interface AniListMedia {
  averageScore?: number
  coverImage?: {
    large?: string
    medium?: string
  }
  description?: string
  duration?: number
  episodes?: number
  format?: string
  genres?: string[]
  id: number
  seasonYear?: number
  status?: string
  title: {
    english?: string
    native?: string
    romaji?: string
  }
}

// ---------------------------------------------------------------------------
// Jikan API adapter
// ---------------------------------------------------------------------------

interface KitsuAnime {
  attributes: {
    averageRating?: string
    canonicalTitle: string
    description?: string
    episodeCount?: number
    episodeLength?: number
    posterImage?: {
      large?: string
      medium?: string
      original?: string
      small?: string
      tiny?: string
    }
    startDate?: string
    status?: string
    subtype?: string
    synopsis?: string
    titles?: {
      en_jp?: string
      ja_jp?: string
    }
  }
  id: string
}

// ---------------------------------------------------------------------------
// Kitsu API adapter
// ---------------------------------------------------------------------------

/**
 * Searches for animes using a fallback chain:
 * Kitsu → AniList → Jikan (MyAnimeList) → Popular mock data
 */
export async function searchAnime(
  query: string,
  signal?: AbortSignal,
): Promise<AnimeSearchResponse> {
  if (!query.trim() || query.trim().length < 2) {
    return { results: [], source: 'popular' }
  }

  // 1. Try Kitsu
  const kitsuResults = await searchKitsu(query, signal)
  if (kitsuResults && kitsuResults.length > 0) {
    return { results: kitsuResults, source: 'kitsu' }
  }

  // 2. Try AniList
  const anilistResults = await searchAnilist(query, signal)
  if (anilistResults && anilistResults.length > 0) {
    return { results: anilistResults, source: 'anilist' }
  }

  // 3. Try Jikan
  const jikanResults = await searchJikan(query, signal)
  if (jikanResults && jikanResults.length > 0) {
    return { results: jikanResults, source: 'jikan' }
  }

  // 4. Fallback to popular mock data
  const popularResults = searchPopular(query)
  return {
    results: popularResults.length > 0 ? popularResults : POPULAR_ANIME,
    source: 'popular',
  }
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

// ---------------------------------------------------------------------------
// AniList API adapter (GraphQL)
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: signal ? combineSignals(signal, controller.signal) : controller.signal,
    })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

async function searchAnilist(query: string, signal?: AbortSignal): Promise<null | SearchResult[]> {
  try {
    const graphqlQuery = `
      query ($search: String) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            id
            title {
              romaji
              native
              english
            }
            episodes
            duration
            averageScore
            status
            description
            coverImage {
              large
              medium
            }
            format
            seasonYear
            genres
          }
        }
      }
    `

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const combinedSignal = signal ? combineSignals(signal, controller.signal) : controller.signal

    const res = await fetch('https://graphql.anilist.co', {
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { search: query },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: combinedSignal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) return null

    const data = await res.json()
    const mediaList: AniListMedia[] = data.data?.Page?.media ?? []

    if (mediaList.length === 0) return []

    return mediaList.map((media) => ({
      duration: media.duration ? `${media.duration} min per ep` : undefined,
      episodes: media.episodes ?? null,
      genres: media.genres?.map((g) => ({ name: g })) ?? [],
      id: media.id,
      image: media.coverImage?.large ?? media.coverImage?.medium ?? '',
      images: {
        jpg: {
          image_url: media.coverImage?.large ?? '',
          small_image_url: media.coverImage?.medium ?? '',
        },
      },
      mal_id: media.id,
      score: media.averageScore ? media.averageScore / 10 : null,
      status: media.status,
      synopsis: media.description
        ? media.description.replace(/<[^>]*>/g, '').substring(0, 500)
        : undefined,
      title: media.title?.english ?? media.title?.romaji ?? 'Unknown',
      title_japanese: media.title?.native,
      type: media.format,
      year: media.seasonYear,
    }))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Fallback helper
// ---------------------------------------------------------------------------

async function searchJikan(query: string, signal?: AbortSignal): Promise<null | SearchResult[]> {
  try {
    const res = await fetchWithTimeout(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10&sfw`,
      8000,
      signal,
    )

    if (!res.ok) {
      // Rate limited — wait and retry once
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000))
        const retry = await fetch(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10&sfw`,
          { signal },
        )
        if (!retry.ok) return null
        const data = await retry.json()
        return data.data ?? []
      }
      return null
    }

    const data = await res.json()
    return data.data ?? []
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Public API — search with fallback chain
// ---------------------------------------------------------------------------

async function searchKitsu(query: string, signal?: AbortSignal): Promise<null | SearchResult[]> {
  try {
    const res = await fetchWithTimeout(
      `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=10`,
      8000,
      signal,
    )

    if (!res.ok) return null

    const data = await res.json()
    const animes: KitsuAnime[] = data.data ?? []

    if (animes.length === 0) return []

    return animes.map((anime, index) => ({
      duration: anime.attributes.episodeLength
        ? `${anime.attributes.episodeLength} min per ep`
        : undefined,
      episodes: anime.attributes.episodeCount ?? null,
      genres: [],
      id: parseInt(anime.id) || 100000 + index,
      image:
        anime.attributes.posterImage?.original ??
        anime.attributes.posterImage?.large ??
        anime.attributes.posterImage?.medium ??
        '',
      images: {
        jpg: {
          image_url:
            anime.attributes.posterImage?.original ??
            anime.attributes.posterImage?.large ??
            anime.attributes.posterImage?.medium ??
            '',
          small_image_url:
            anime.attributes.posterImage?.small ?? anime.attributes.posterImage?.tiny ?? '',
        },
      },
      mal_id: parseInt(anime.id) || 100000 + index,
      score: anime.attributes.averageRating
        ? Math.round(parseFloat(anime.attributes.averageRating)) / 10
        : null,
      status: anime.attributes.status,
      synopsis: anime.attributes.synopsis ?? anime.attributes.description,
      title: anime.attributes.canonicalTitle,
      title_japanese: anime.attributes.titles?.ja_jp,
      type: anime.attributes.subtype,
      year: anime.attributes.startDate
        ? new Date(anime.attributes.startDate).getFullYear()
        : undefined,
    }))
  } catch {
    return null
  }
}

function searchPopular(query: string): SearchResult[] {
  const q = query.toLowerCase()
  return POPULAR_ANIME.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      (a.title_japanese && a.title_japanese.toLowerCase().includes(q)),
  )
}
