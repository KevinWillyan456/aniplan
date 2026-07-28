'use client'

/* eslint-disable consistent-return */

import { motion } from 'motion/react'
import Image from 'next/image'
import { parseAsString, useQueryState } from 'nuqs'
import { startTransition, useEffect, useRef, useState } from 'react'

import type { SearchResult as ApiSearchResult } from '@/lib/anime-api'
import type { Anime } from '@/types/anime'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { searchAnime } from '@/lib/anime-api'

interface AnimeSearchProps {
  onSelect: (anime: Anime) => void
  selectedAnime: Anime | null
}

type SourceType = 'anilist' | 'jikan' | 'kitsu' | 'popular' | null

const SOURCE_LABELS: Record<string, string> = {
  anilist: 'AniList',
  jikan: 'MyAnimeList',
  kitsu: 'Kitsu',
  popular: 'Sugestões',
}

export function AnimeSearch({ onSelect, selectedAnime }: AnimeSearchProps) {
  const [query, setQuery] = useQueryState('q', parseAsString.withDefault(''))
  const [results, setResults] = useState<ApiSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState<SourceType>(null)
  const [retryCount, setRetryCount] = useState(0)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isSearching = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (selectedAnime) {
      startTransition(() => {
        setQuery(selectedAnime.title)
        setResults([])
        setSource(null)
      })
    }
  }, [selectedAnime, setQuery])

  useEffect(() => {
    if (query.trim().length < 2 || selectedAnime) {
      startTransition(() => {
        setResults([])
        setError('')
        setSource(null)
      })
      return
    }

    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      ;(async () => {
        if (!isSearching.current) {
          isSearching.current = true
          setLoading(true)
          setError('')
          setSource(null)

          // Cancel previous request
          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }
          abortControllerRef.current = new AbortController()

          try {
            const { results: searchResults, source: resultSource } = await searchAnime(
              query,
              abortControllerRef.current.signal,
            )

            setResults(searchResults)
            setSource(resultSource as SourceType)

            if (searchResults.length === 0) {
              setError('Nenhum anime encontrado para essa busca. Tente outro nome.')
            } else if (resultSource === 'popular') {
              setError('APIs indisponíveis. Mostrando animes populares como sugestão.')
            }
          } catch (err: unknown) {
            if (!(err instanceof DOMException && err.name === 'AbortError')) {
              setError('Erro ao buscar animes. Verifique sua conexão.')
            }
          } finally {
            setLoading(false)
            isSearching.current = false
          }
        }
      })()
    }, 500)

    return () => {
      clearTimeout(searchTimeoutRef.current)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [query, selectedAnime, retryCount])

  function handleRetry() {
    setError('')
    setResults([])
    setSource(null)
    setRetryCount((prev) => prev + 1)
  }

  function mapToAnime(result: ApiSearchResult): Anime {
    return {
      duration: parseDuration(result.duration),
      episodes: result.episodes ?? 12, // default to 12 (1 cour) when unknown
      genres: result.genres?.map((g) => (typeof g === 'string' ? g : g.name)) ?? [],
      id: result.mal_id,
      image: result.images.jpg.image_url || '/placeholder-anime.png',
      score: result.score ?? 0,
      status: result.status,
      synopsis: result.synopsis,
      title: result.title,
      titleJapanese: result.title_japanese,
      type: result.type,
      year: result.year,
    }
  }

  return (
    <div className="space-y-4">
      {/* Source badges */}
      {source && results.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {source === 'kitsu' && (
            <Badge
              className="h-auto gap-1 rounded-full border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] text-blue-400"
              variant="outline"
            >
              <span className="size-1.5 rounded-full bg-blue-500" />
              Kitsu
            </Badge>
          )}
          {source === 'anilist' && (
            <Badge
              className="h-auto gap-1 rounded-full border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[10px] text-purple-400"
              variant="outline"
            >
              <span className="size-1.5 rounded-full bg-purple-500" />
              AniList
            </Badge>
          )}
          {source === 'jikan' && (
            <Badge
              className="h-auto gap-1 rounded-full border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] text-emerald-400"
              variant="outline"
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              MyAnimeList (fallback)
            </Badge>
          )}
          {source === 'popular' && (
            <Badge
              className="h-auto gap-1 rounded-full border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-400"
              variant="outline"
            >
              <span className="size-1.5 rounded-full bg-amber-500" />
              Modo offline
            </Badge>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          <svg
            className="size-4 text-white/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <Input
          className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20"
          onChange={(e) => {
            setQuery(e.target.value)
            setResults([])
            setError('')
            setSource(null)
          }}
          placeholder="Digite o nome do anime..."
          value={selectedAnime ? '' : query}
        />
        {loading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <div className="size-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Error with retry */}
      {error && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center"
          initial={{ opacity: 0, y: -10 }}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-red-500/20">
            <svg
              className="size-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-red-300">{error}</p>
            <Button
              className="mt-2 border-red-500/30 text-xs text-red-300 hover:bg-red-500/20 hover:text-red-200"
              onClick={handleRetry}
              size="sm"
              variant="outline"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              Tentar novamente
            </Button>
          </div>
        </motion.div>
      )}

      {/* Selected anime */}
      {selectedAnime && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-purple-500/50 bg-purple-500/10"
          initial={{ opacity: 0, y: -10 }}
        >
          <div className="flex gap-4 p-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg">
              <Image
                alt={selectedAnime.title}
                className="object-cover"
                fill
                sizes="80px"
                src={selectedAnime.image}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {selectedAnime.title}
                  </h3>
                  {selectedAnime.titleJapanese && (
                    <p className="mt-0.5 truncate text-xs text-white/50">
                      {selectedAnime.titleJapanese}
                    </p>
                  )}
                </div>
                <Button
                  className="shrink-0 text-xs whitespace-nowrap text-white/50 hover:text-red-400"
                  onClick={() => onSelect(null as unknown as Anime)}
                  size="sm"
                  variant="ghost"
                >
                  Trocar
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge
                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                  variant="outline"
                >
                  ★ {selectedAnime.score}
                </Badge>
                <Badge
                  className="border-blue-500/30 bg-blue-500/10 text-blue-400"
                  variant="outline"
                >
                  {selectedAnime.episodes} episódios
                </Badge>
                <Badge
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  variant="outline"
                >
                  ~{selectedAnime.duration} min/ep
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {!selectedAnime && results.length > 0 && (
        <motion.div animate={{ opacity: 1 }} className="space-y-2" initial={{ opacity: 0 }}>
          <p className="text-xs font-medium text-white/40">
            {results.length} resultado{results.length > 1 ? 's' : ''} encontrado
            {results.length > 1 ? 's' : ''}
            {source && ` via ${SOURCE_LABELS[source] ?? source}`}
          </p>
          <div className="space-y-2">
            {results.map((result, index) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300 hover:border-purple-500/30 hover:bg-white/10"
                initial={{ opacity: 0, y: 20 }}
                key={`${result.mal_id}-${index}`}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <div className="flex gap-3 p-3">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      alt={result.title}
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      fill
                      sizes="80px"
                      src={result.images.jpg.small_image_url || result.images.jpg.image_url}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                    <h3 className="truncate text-sm font-semibold text-white">{result.title}</h3>
                    {result.title_japanese && (
                      <p className="truncate text-xs text-white/40">{result.title_japanese}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {result.score && (
                        <span className="text-xs text-yellow-400">★ {result.score}</span>
                      )}
                      <span className="text-xs text-blue-400">{result.episodes ?? '?'} eps</span>
                      {result.type && <span className="text-xs text-white/40">{result.type}</span>}
                    </div>
                    {result.synopsis && (
                      <p className="line-clamp-1 text-xs text-white/40">{result.synopsis}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button
                      className="bg-white/10 text-xs text-white/70 transition-all duration-300 hover:bg-purple-600 hover:text-white"
                      onClick={() => onSelect(mapToAnime(result))}
                      size="sm"
                      variant="ghost"
                    >
                      Selecionar
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3" key={i}>
              <Skeleton className="size-20 shrink-0 rounded-lg bg-white/10" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/10" />
                <Skeleton className="h-3 w-1/4 bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty / initial state */}
      {!loading && !selectedAnime && query.length < 2 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-white/5">
            <svg
              className="size-8 text-white/20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          </div>
          <p className="text-sm text-white/40">Digite o nome de um anime para começar</p>
          <p className="text-xs text-white/20">Pesquise por títulos, personagens ou gêneros</p>
          <p className="mt-2 text-[10px] text-white/10">
            Fallback automático: Kitsu → AniList → Jikan → Sugestões
          </p>
        </div>
      )}
    </div>
  )
}

function parseDuration(durationStr?: string): number {
  if (!durationStr) return 24
  let total = 0
  const hourMatch = durationStr.match(/(\d+)\s*hr/)
  const minMatch = durationStr.match(/(\d+)\s*min/)
  if (hourMatch) total += parseInt(hourMatch[1]) * 60
  if (minMatch) total += parseInt(minMatch[1])
  return total || 24
}
