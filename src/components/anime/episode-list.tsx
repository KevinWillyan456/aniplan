'use client'

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AnimatePresence, motion } from 'motion/react'
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs'
import { startTransition, useEffect, useRef, useState } from 'react'

import type { AnimePlan, Schedule } from '@/types/anime'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

  const todayHasUnwatched = allDates.some(
    (d) =>
      d === todayStr && groupedByDate[d].episodes.some((ep) => !plan.watchedEpisodes.includes(ep)),
  )

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

  // Restaura a última tab do cronograma do localStorage (scoped por plan)
  useEffect(() => {
    const key = `@aniplan/episode-tab-${plan.id}`
    const saved = localStorage.getItem(key)
    if (saved === 'all' || saved === 'delayed' || saved === 'today' || saved === 'upcoming') {
      setEpParams({ epTab: saved })
    }
  }, [plan.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const tabsRef = useRef<HTMLDivElement>(null)
  const [showScrollToToday, setShowScrollToToday] = useState(false)
  const [showTudoDialog, setShowTudoDialog] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const TUDO_THRESHOLD = 50

  function checkTabsScroll() {
    const el = tabsRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  // Detecta overflow nas tabs para mostrar/ocultar fade
  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    checkTabsScroll()
    el.addEventListener('scroll', checkTabsScroll)
    const observer = new ResizeObserver(checkTabsScroll)
    observer.observe(el)
    // eslint-disable-next-line consistent-return
    return () => {
      el.removeEventListener('scroll', checkTabsScroll)
      observer.disconnect()
    }
  }, [])

  // Observer para mostrar/esconder o botão "Scroll to Today"
  useEffect(() => {
    const todayEl = document.querySelector(`[data-date="${todayStr}"]`)
    if (!todayEl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowScrollToToday(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollToToday(!entry.isIntersecting)
      },
      { rootMargin: '100px 0px -100px 0px', threshold: 0 },
    )

    observer.observe(todayEl)
    // eslint-disable-next-line consistent-return
    return () => observer.disconnect()
  }, [todayStr, paginatedDates])

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
    localStorage.setItem(`@aniplan/episode-tab-${plan.id}`, newTab)
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
        <div className="relative">
          <div
            className="flex flex-nowrap gap-1 overflow-x-auto rounded-xl border border-white/4 bg-white/2 p-1 [&::-webkit-scrollbar]:hidden"
            onScroll={checkTabsScroll}
            ref={tabsRef}
          >
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
                  <AnimatePresence>
                    {t.key === 'today' && todayHasUnwatched && (
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        className="ml-1.5 inline-block size-2 rounded-full bg-emerald-400/60 shadow-sm shadow-emerald-400/30"
                        exit={{ opacity: 0, scale: 0.3 }}
                        initial={{ opacity: 0, scale: 0 }}
                        key="tab-today-dot"
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {t.key === 'delayed' && count > 0 && (
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        className="ml-1.5 inline-block size-2 rounded-full bg-red-400/60 shadow-sm shadow-red-400/30"
                        exit={{ opacity: 0, scale: 0.3 }}
                        initial={{ opacity: 0, scale: 0 }}
                        key="tab-delayed-dot"
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                  </AnimatePresence>
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
          {/* Left fade indicator */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-xl bg-linear-to-r from-[#0a0a1a] to-transparent transition-opacity duration-200 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Right fade indicator */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-linear-to-r from-transparent to-[#0a0a1a] transition-opacity duration-200 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
          />
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
      <AnimatePresence mode="wait">
        {isEmpty ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 py-8 text-center"
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key={`empty-${tab}`}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm text-white/40">
              {tab === 'today'
                ? 'Nenhum episódio para hoje'
                : tab === 'delayed'
                  ? 'Nenhum episódio atrasado'
                  : tab === 'upcoming'
                    ? 'Nenhum episódio futuro'
                    : 'Nenhum episódio encontrado'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key={`content-${tab}`}
            transition={{ duration: 0.2 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning dialog for "Tudo" with many sessions */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setShowTudoDialog(false)
        }}
        open={showTudoDialog}
      >
        <AlertDialogContent className="border border-white/6 bg-[#1a1a2e] text-white">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-amber-500/10 text-amber-400">
              <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </AlertDialogMedia>
            <AlertDialogTitle className="text-white">Muitas sessões no cronograma</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              O cronograma tem{' '}
              <strong className="text-white/80">{seasonFilteredDates.length} sessões</strong>.
              Exibir todas de uma vez pode causar lentidão ou travamento, dependendo do seu
              dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/6 bg-white/3 text-white/60 hover:bg-white/6 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => {
                setShowTudoDialog(false)
                handleItemsPerPageChange(0)
              }}
            >
              Exibir mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination — outside AnimatePresence to stay stable */}
      {!isEmpty && totalPages > 1 && (
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
                onClick={() => {
                  if (seasonFilteredDates.length > TUDO_THRESHOLD) {
                    setShowTudoDialog(true)
                  } else {
                    handleItemsPerPageChange(0)
                  }
                }}
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

      {/* Scroll to Today button */}
      <AnimatePresence>
        {showScrollToToday && tab !== 'today' && (
          <motion.button
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed right-6 bottom-6 z-50 flex cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-purple-600 to-blue-600 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-500 hover:to-blue-500 hover:shadow-xl hover:shadow-purple-500/40"
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            key="scroll-to-today"
            onClick={() => {
              const todayEl = document.querySelector(`[data-date="${todayStr}"]`)
              if (todayEl) {
                todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M5 10l7-7m0 0l7 7m-7-7v18"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            Hoje
          </motion.button>
        )}
      </AnimatePresence>
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
  const todayAllWatched = isToday && episodes.every((ep) => watchedEpisodes.includes(ep))

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border p-4 transition-all duration-300 ${
        hasDelay
          ? 'border-red-500/20 bg-red-500/3'
          : isToday
            ? 'border-purple-500/30 bg-purple-500/5'
            : isPast
              ? 'border-white/5 bg-white/2'
              : 'border-white/10 bg-white/5'
      }`}
      data-date={date}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left accent bar for delayed days */}
      {hasDelay && (
        <div className="absolute top-2 bottom-2 left-0 w-0.75 rounded-full bg-red-500 shadow-sm shadow-red-500/40" />
      )}
      {/* Date header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
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
          <AnimatePresence>
            {isToday && !todayAllWatched && (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400/60 shadow-sm shadow-emerald-400/30"
                exit={{ opacity: 0, scale: 0.3 }}
                initial={{ opacity: 0, scale: 0 }}
                key="today-dot"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {hasDelay && (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-400/60 shadow-sm shadow-red-400/30"
                exit={{ opacity: 0, scale: 0.3 }}
                initial={{ opacity: 0, scale: 0 }}
                key="delayed-header-dot"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </AnimatePresence>
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
              className="group relative overflow-hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/50 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400 active:scale-95"
              onClick={() => {
                const allWatched = episodes.every((ep) => watchedEpisodes.includes(ep))
                onBatchToggle(episodes, !allWatched)
              }}
              size="xs"
              variant="ghost"
            >
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                className="relative z-10 flex items-center gap-1"
                key={String(episodes.every((ep) => watchedEpisodes.includes(ep)))}
                transition={{ duration: 0.3 }}
              >
                {episodes.every((ep) => watchedEpisodes.includes(ep)) ? (
                  <>
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M6 18L18 6M6 6l12 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Desmarcar
                  </>
                ) : (
                  <>
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Marcar todos
                  </>
                )}
              </motion.span>
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
            <motion.label
              animate={{
                backgroundColor: watched ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 0, 0, 0)',
                borderColor: watched
                  ? 'rgba(0, 0, 0, 0)'
                  : isDelayed
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(0, 0, 0, 0)',
              }}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 sm:gap-3 sm:px-3 ${
                watched ? 'hover:bg-emerald-500/10' : 'hover:bg-white/5'
              }`}
              initial={false}
              key={ep}
              layout
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Checkbox
                checked={watched}
                className={`shrink-0 transition-all duration-200 ${
                  watched ? 'border-emerald-500/50 bg-emerald-500/50 text-white' : 'border-white/20'
                }`}
                onCheckedChange={(checked) => onToggle(ep, checked as boolean)}
              />

              {/* Text + badges group */}
              <motion.div
                animate={{ x: watched ? 2 : 0 }}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1"
                transition={{ duration: 0.2 }}
              >
                <motion.span
                  animate={{
                    color: watched ? 'rgba(52, 211, 153, 0.7)' : 'rgba(255, 255, 255, 0.8)',
                    textDecoration: watched ? 'line-through' : 'none',
                  }}
                  className="text-sm"
                  transition={{ duration: 0.2 }}
                >
                  Episódio{' '}
                  {season && seasons.length > 1
                    ? (getEpisodeNumberInSeason(seasons, ep)?.episodeInSeason ?? ep)
                    : ep}
                </motion.span>

                {/* Season badge */}
                {season && seasons.length > 1 && (
                  <motion.span
                    animate={{ opacity: watched ? 0.5 : 1 }}
                    className="shrink-0 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400"
                  >
                    {season.label}
                  </motion.span>
                )}

                {/* Delayed indicator */}
                {isDelayed && (
                  <span className="shrink-0 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                    Pendente
                  </span>
                )}
              </motion.div>

              <AnimatePresence mode="wait">
                {watched ? (
                  <motion.svg
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    className="size-4 shrink-0 text-emerald-400"
                    exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                    fill="none"
                    initial={{ opacity: 0, rotate: 90, scale: 0 }}
                    key="check"
                    stroke="currentColor"
                    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </motion.svg>
                ) : (
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    className="size-4 shrink-0"
                    exit={{ opacity: 0, scale: 0 }}
                    initial={{ opacity: 0, scale: 0 }}
                    key="empty"
                    transition={{ duration: 0.15 }}
                  />
                )}
              </AnimatePresence>
            </motion.label>
          )
        })}
      </div>
    </motion.div>
  )
}
