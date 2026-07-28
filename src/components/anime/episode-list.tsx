'use client'

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'motion/react'
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs'
import { startTransition, useEffect, useRef } from 'react'

import type { AnimePlan, Schedule } from '@/types/anime'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { getEpisodeNumberInSeason, getEpisodeSeason } from '@/types/anime'

interface EpisodeListProps {
  onBatchToggle?: (episodeNumbers: number[], watched: boolean) => void
  onToggleEpisode: (ep: number, watched: boolean) => void
  plan: AnimePlan
}

type TabId = 'all' | 'delayed' | 'today' | 'upcoming'

const TABS: { key: TabId; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'today', label: 'Hoje' },
  { key: 'delayed', label: 'Atrasadas' },
  { key: 'upcoming', label: 'Futuras' },
]

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20] as const

export function EpisodeList({ onBatchToggle, onToggleEpisode, plan }: EpisodeListProps) {
  const [epParams, setEpParams] = useQueryStates({
    epPage: parseAsInteger.withDefault(0),
    epPerPage: parseAsInteger.withDefault(10),
    epQ: parseAsString.withDefault(''),
    epSeason: parseAsInteger, // null = todas
    epTab: parseAsStringEnum(['all', 'delayed', 'today', 'upcoming'] as const).withDefault('all'),
  })

  const {
    epPage: currentPage,
    epPerPage: itemsPerPage,
    epQ: searchQuery,
    epSeason: seasonFilter,
    epTab: tab,
  } = epParams

  const seasons = plan.seasons ?? []
  const hasMultipleSeasons = seasons.length > 1

  const groupedByDate = plan.schedule.reduce(
    (acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = entry
      }
      return acc
    },
    {} as Record<string, Schedule>,
  )

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const allDates = Object.keys(groupedByDate).sort()

  // Filter dates by tab
  const dates = allDates.filter((date) => {
    if (tab === 'all') return true
    if (tab === 'today') return date === todayStr
    if (tab === 'delayed') {
      const episodes = groupedByDate[date].episodes
      const hasUnwatched = episodes.some((ep) => !plan.watchedEpisodes.includes(ep))
      return date < todayStr && hasUnwatched
    }
    // upcoming
    return date > todayStr
  })

  // Filter by searchQuery (episode number or season label)
  const searchQueryTrimmed = searchQuery.trim()
  const searchNum = searchQueryTrimmed ? Number.parseInt(searchQueryTrimmed, 10) : null
  const isNumeric = searchNum !== null && !Number.isNaN(searchNum)
  const searchLower = searchQueryTrimmed.toLowerCase()

  const filteredDates = searchQueryTrimmed
    ? dates.filter((date) =>
        groupedByDate[date].episodes.some((ep) => {
          // Match by global episode number
          if (isNumeric && (ep === searchNum || String(ep).includes(searchQueryTrimmed))) {
            return true
          }

          // Match by season-relative episode number and season label
          // (only relevant when there are multiple seasons)
          if ((plan.seasons?.length ?? 0) > 1) {
            const seasonInfo = getEpisodeNumberInSeason(plan.seasons ?? [], ep)
            if (seasonInfo) {
              // Match by season-relative episode number
              if (isNumeric && seasonInfo.episodeInSeason === searchNum) return true
              // Match by season label (e.g., "T2", "Segunda Temporada")
              if (seasonInfo.season.label.toLowerCase().includes(searchLower)) return true
            }
          }

          return false
        }),
      )
    : dates

  // Filter by season
  const seasonFilteredDates =
    hasMultipleSeasons && seasonFilter !== null
      ? filteredDates.filter((date) =>
          groupedByDate[date].episodes.some((ep) => {
            const epSeason = getEpisodeSeason(seasons, ep)
            return epSeason?.number === seasonFilter
          }),
        )
      : filteredDates

  const isEmpty = seasonFilteredDates.length === 0

  const totalPages = itemsPerPage > 0 ? Math.ceil(seasonFilteredDates.length / itemsPerPage) : 1
  const safeCurrentPage = Math.min(currentPage, totalPages - 1)
  const paginatedDates =
    itemsPerPage > 0
      ? seasonFilteredDates.slice(
          safeCurrentPage * itemsPerPage,
          (safeCurrentPage + 1) * itemsPerPage,
        )
      : seasonFilteredDates

  const initialNavDone = useRef(false)

  // Auto-navigate to the page containing today's date on initial load
  // (only when the user hasn't explicitly set a page param)
  useEffect(() => {
    if (initialNavDone.current || allDates.length === 0) return
    initialNavDone.current = true

    // Skip auto-nav if user already has explicit URL params
    if (typeof window !== 'undefined' && window.location.search.includes('epPage=')) return

    const todayIdx = allDates.findIndex((d) => d === todayStr)
    if (todayIdx >= 0) {
      const perPage = itemsPerPage > 0 ? itemsPerPage : 10
      const todayPage = Math.floor(todayIdx / perPage)
      if (todayPage > 0) {
        startTransition(() => {
          setEpParams({ epPage: todayPage })
        })
      }
    }
  }, [allDates, todayStr, itemsPerPage, setEpParams])

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages)

  if (allDates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-white/40">Nenhum episódio no cronograma</p>
      </div>
    )
  }

  function handleItemsPerPageChange(value: number) {
    setEpParams({ epPage: 0, epPerPage: value })
  }

  function changeTab(newTab: TabId) {
    setEpParams({ epPage: 0, epTab: newTab })
  }

  function handleSearch(value: string) {
    setEpParams({ epPage: 0, epQ: value })
  }

  function handleSeasonChange(value: null | number) {
    setEpParams({ epPage: 0, epSeason: value })
  }

  return (
    <div className="space-y-3">
      {/* Tabs + Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/4 bg-white/2 p-1">
          {TABS.map((t) => {
            let count = 0
            if (t.key === 'all') count = allDates.length
            else if (t.key === 'today') count = allDates.filter((d) => d === todayStr).length
            else if (t.key === 'delayed')
              count = allDates.filter(
                (d) =>
                  d < todayStr &&
                  groupedByDate[d].episodes.some((ep) => !plan.watchedEpisodes.includes(ep)),
              ).length
            else if (t.key === 'upcoming') count = allDates.filter((d) => d > todayStr).length

            return (
              <Button
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  tab === t.key
                    ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                    : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                }`}
                key={t.key}
                onClick={() => changeTab(t.key)}
                size="sm"
                variant="ghost"
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      tab === t.key
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Season filter */}
          {hasMultipleSeasons && (
            <div className="relative">
              <select
                className="h-8 appearance-none rounded-lg border border-white/6 bg-white/2 py-0 pr-6 pl-2.5 text-xs text-white/70 transition-all duration-200 hover:border-white/10 focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/20 focus:outline-none"
                onChange={(e) => handleSeasonChange(e.target.value ? Number(e.target.value) : null)}
                value={seasonFilter ?? ''}
              >
                <option value="">Todas</option>
                {seasons.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.label}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-white/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 9l6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <input
              className="h-8 w-32 rounded-lg border border-white/6 bg-white/2 pr-2.5 pl-8 text-xs text-white/70 placeholder:text-white/20 focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/20 focus:outline-none sm:w-40"
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar episódio..."
              type="text"
              value={searchQuery}
            />
          </div>
        </div>
      </div>

      {/* Schedule days */}
      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-white/40">
            {tab === 'today'
              ? 'Nenhum episódio para hoje'
              : tab === 'delayed'
                ? 'Nenhum episódio atrasado'
                : tab === 'upcoming'
                  ? 'Nenhum episódio futuro'
                  : 'Nenhum episódio encontrado'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedDates.map((date) => (
              <ScheduleDay
                date={date}
                episodes={groupedByDate[date].episodes}
                key={date}
                onBatchToggle={onBatchToggle}
                onToggle={onToggleEpisode}
                seasons={plan.seasons ?? []}
                watchedEpisodes={plan.watchedEpisodes}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
              {/* Items per page */}
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="hidden sm:inline">Sessões por página:</span>
                <div className="flex gap-1">
                  {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                    <Button
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-200 ${
                        itemsPerPage === opt
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                      }`}
                      key={opt}
                      onClick={() => handleItemsPerPageChange(opt)}
                      size="xs"
                      variant="ghost"
                    >
                      {opt}
                    </Button>
                  ))}
                  <Button
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-200 ${
                      itemsPerPage === 0
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                    }`}
                    onClick={() => handleItemsPerPageChange(0)}
                    size="xs"
                    variant="ghost"
                  >
                    Tudo
                  </Button>
                </div>
              </div>

              {/* Page controls */}
              <div className="flex items-center gap-1">
                {/* First */}
                <Button
                  className="flex size-7 items-center justify-center rounded-md text-xs text-white/40 hover:bg-white/5 hover:text-white/60 disabled:opacity-20 disabled:hover:bg-transparent"
                  disabled={safeCurrentPage === 0}
                  onClick={() => setEpParams({ epPage: 0 })}
                  size="icon-xs"
                  title="Primeira página"
                  variant="ghost"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M11 19l-7-7 7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                    <path
                      d="M18 19l-7-7 7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </Button>

                {/* Previous */}
                <Button
                  className="flex size-7 items-center justify-center rounded-md text-xs text-white/40 hover:bg-white/5 hover:text-white/60 disabled:opacity-20 disabled:hover:bg-transparent"
                  disabled={safeCurrentPage === 0}
                  onClick={() => setEpParams({ epPage: safeCurrentPage - 1 })}
                  size="icon-xs"
                  title="Página anterior"
                  variant="ghost"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M15 19l-7-7 7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </Button>

                {/* Page numbers */}
                <div className="mx-1 flex items-center gap-0.5">
                  {pageNumbers.map((page, idx) =>
                    page === 'ellipsis' ? (
                      <span
                        className="flex size-7 items-center justify-center text-xs text-white/20"
                        key={`ellipsis-${idx}`}
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        className={`flex size-7 items-center justify-center rounded-md text-xs font-medium transition-all duration-200 ${
                          page === safeCurrentPage
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                        }`}
                        key={page}
                        onClick={() => setEpParams({ epPage: page })}
                        size="icon-xs"
                        variant="ghost"
                      >
                        {page + 1}
                      </Button>
                    ),
                  )}
                </div>

                {/* Next */}
                <Button
                  className="flex size-7 items-center justify-center rounded-md text-xs text-white/40 hover:bg-white/5 hover:text-white/60 disabled:opacity-20 disabled:hover:bg-transparent"
                  disabled={safeCurrentPage >= totalPages - 1}
                  onClick={() => setEpParams({ epPage: safeCurrentPage + 1 })}
                  size="icon-xs"
                  title="Próxima página"
                  variant="ghost"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M9 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </Button>

                {/* Last */}
                <Button
                  className="flex size-7 items-center justify-center rounded-md text-xs text-white/40 hover:bg-white/5 hover:text-white/60 disabled:opacity-20 disabled:hover:bg-transparent"
                  disabled={safeCurrentPage >= totalPages - 1}
                  onClick={() => setEpParams({ epPage: totalPages - 1 })}
                  size="icon-xs"
                  title="Última página"
                  variant="ghost"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M13 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                    <path
                      d="M6 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getPageNumbers(currentPage: number, totalPages: number): ('ellipsis' | number)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }
  const pages: ('ellipsis' | number)[] = [0]
  if (currentPage > 3) pages.push('ellipsis')
  const start = Math.max(1, currentPage - 1)
  const end = Math.min(totalPages - 2, currentPage + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (currentPage < totalPages - 4) pages.push('ellipsis')
  pages.push(totalPages - 1)
  return pages
}

function ScheduleDay({
  date,
  episodes,
  onBatchToggle,
  onToggle,
  seasons = [],
  watchedEpisodes,
}: {
  date: string
  episodes: number[]
  onBatchToggle?: (episodeNumbers: number[], watched: boolean) => void
  onToggle: (ep: number, watched: boolean) => void
  seasons: AnimePlan['seasons']
  watchedEpisodes: number[]
}) {
  const parsedDate = parseISO(date)
  const dayName = format(parsedDate, 'EEEE', { locale: ptBR })
  const dayMonth = format(parsedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const isPast = parsedDate < new Date(new Date().toDateString())
  const isToday = format(parsedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  // Check for delayed episodes (past date + not watched)
  const delayedEpisodes = episodes.filter((ep) => !watchedEpisodes.includes(ep))
  const hasDelay = isPast && delayedEpisodes.length > 0

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 transition-all duration-300 ${
        hasDelay
          ? 'border-red-500/20 bg-red-500/3'
          : isToday
            ? 'border-purple-500/30 bg-purple-500/5'
            : isPast
              ? 'border-white/5 bg-white/2'
              : 'border-white/10 bg-white/5'
      }`}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Date header */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
            isToday
              ? 'bg-purple-500/20 text-purple-400'
              : hasDelay
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/10 text-white/50'
          }`}
        >
          {format(parsedDate, 'dd')}
        </div>
        <div>
          <p
            className={`text-sm font-medium capitalize ${
              isToday ? 'text-purple-300' : hasDelay ? 'text-red-300' : 'text-white/70'
            }`}
          >
            {isToday ? 'Hoje' : dayName}
          </p>
          <p className="text-xs text-white/40">{dayMonth}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {onBatchToggle && (
            <Button
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/50 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400"
              onClick={() => {
                const allWatched = episodes.every((ep) => watchedEpisodes.includes(ep))
                onBatchToggle(episodes, !allWatched)
              }}
              size="xs"
              variant="ghost"
            >
              {episodes.every((ep) => watchedEpisodes.includes(ep)) ? 'Desmarcar' : 'Marcar todos'}
            </Button>
          )}
          {hasDelay && (
            <Badge
              className="gap-1 rounded-full border-0 bg-red-500/15 px-2.5 py-0.5 text-[10px] text-red-400"
              variant="outline"
            >
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              Atrasado
            </Badge>
          )}
          {isToday && (
            <Badge
              className="rounded-full border-0 bg-purple-500/20 px-2.5 py-0.5 text-[10px] text-purple-400"
              variant="outline"
            >
              Hoje
            </Badge>
          )}
        </div>
      </div>

      {/* Episodes */}
      <div className="space-y-1.5">
        {episodes.map((ep) => {
          const watched = watchedEpisodes.includes(ep)
          const isDelayed = !watched && isPast
          const season = seasons.length > 0 ? getEpisodeSeason(seasons, ep) : null
          return (
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition-all duration-200 sm:gap-3 sm:px-3 ${
                watched
                  ? 'border-transparent bg-emerald-500/10 hover:bg-emerald-500/15'
                  : isDelayed
                    ? 'border-red-500/20 bg-red-500/4 hover:bg-red-500/8'
                    : 'border-transparent hover:bg-white/5'
              }`}
              key={ep}
            >
              <Checkbox
                checked={watched}
                className={`shrink-0 transition-all duration-200 ${
                  watched ? 'border-emerald-500/50 bg-emerald-500/50 text-white' : 'border-white/20'
                }`}
                onCheckedChange={(checked) => onToggle(ep, checked as boolean)}
              />

              {/* Text + badges group (wraps on mobile) */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={`text-sm transition-all duration-200 ${
                    watched ? 'text-emerald-400/70 line-through' : 'text-white/80'
                  }`}
                >
                  Episódio{' '}
                  {season && seasons.length > 1
                    ? (getEpisodeNumberInSeason(seasons, ep)?.episodeInSeason ?? ep)
                    : ep}
                </span>

                {/* Season badge */}
                {season && seasons.length > 1 && (
                  <span className="shrink-0 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                    {season.label}
                  </span>
                )}

                {/* Delayed indicator */}
                {isDelayed && (
                  <span className="shrink-0 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                    Pendente
                  </span>
                )}
              </div>

              {watched && (
                <svg
                  className="size-4 shrink-0 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              )}
            </label>
          )
        })}
      </div>
    </motion.div>
  )
}
