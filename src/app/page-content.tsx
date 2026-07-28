'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { parseAsInteger, parseAsStringEnum, useQueryState } from 'nuqs'
import { startTransition, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { AnimePlan } from '@/types/anime'

import { AnimePlanCard } from '@/components/anime/anime-plan-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePreventDoubleClick } from '@/hooks/use-prevent-double-click'
import { deleteAnimePlan, getAnimePlans } from '@/lib/storage'

export default function HomePageContent() {
  const [plans, setPlans] = useState<AnimePlan[]>([])
  const [loaded, setLoaded] = useState(false)
  const [entering, setEntering] = useState(true)
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const allPlans = getAnimePlans()
    allPlans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    startTransition(() => {
      setPlans(allPlans)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const { submit: submitDelete } = usePreventDoubleClick()
  const homeTabsRef = useRef<HTMLDivElement>(null)
  const [homeCanScrollLeft, setHomeCanScrollLeft] = useState(false)
  const [homeCanScrollRight, setHomeCanScrollRight] = useState(false)

  function checkHomeTabsScroll() {
    const el = homeTabsRef.current
    if (!el) return
    setHomeCanScrollLeft(el.scrollLeft > 4)
    setHomeCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  // Detecta overflow nas tabs (re-executa quando loaded=true pra pegar o ref montado)
  useEffect(() => {
    const el = homeTabsRef.current
    if (!el) return
    checkHomeTabsScroll()
    el.addEventListener('scroll', checkHomeTabsScroll)
    const observer = new ResizeObserver(checkHomeTabsScroll)
    observer.observe(el)
    // eslint-disable-next-line consistent-return
    return () => {
      el.removeEventListener('scroll', checkHomeTabsScroll)
      observer.disconnect()
    }
  }, [loaded])

  function handleDeletePlan(id: string) {
    submitDelete(() => {
      const plan = plans.find((p) => p.id === id)
      if (!plan) return

      // Remove do localStorage imediatamente
      deleteAnimePlan(id)

      // Marca como "saindo" pra ativar a animação exit
      setExitingIds((prev) => new Set(prev).add(id))

      toast.success('Maratona excluída', {
        description: plan.anime.title,
      })

      // Remove do state depois da animação (300ms)
      setTimeout(() => {
        setPlans((prev) => prev.filter((p) => p.id !== id))
        setExitingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 300)
    })
  }

  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringEnum(['all', 'today', 'delayed', 'completed', 'in-progress'] as const).withDefault(
      'all',
    ),
  )

  // Restaura a última tab selecionada do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('@aniplan/home-tab')
    if (
      saved === 'all' ||
      saved === 'today' ||
      saved === 'delayed' ||
      saved === 'completed' ||
      saved === 'in-progress'
    ) {
      setTab(saved)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(0))
  const [perPage, setPerPage] = useQueryState('perPage', parseAsInteger.withDefault(8))

  const ITEMS_PER_PAGE_OPTIONS = [4, 8, 12, 24] as const
  const safePerPage = ITEMS_PER_PAGE_OPTIONS.includes(perPage as never) ? perPage : 8

  const todayStr = new Date().toLocaleDateString('en-CA') // yyyy-MM-dd no timezone local

  const todayPlans = plans.filter((p) =>
    p.schedule.some(
      (s) => s.date === todayStr && s.episodes.some((ep) => !p.watchedEpisodes.includes(ep)),
    ),
  )

  const delayedPlans = plans.filter((p) =>
    p.schedule.some(
      (s) => s.date < todayStr && s.episodes.some((ep) => !p.watchedEpisodes.includes(ep)),
    ),
  )

  const completedPlans = plans.filter(
    (p) => (p.watchedEpisodes?.length ?? 0) >= (p.totalEpisodes ?? p.anime.episodes),
  )
  const inProgressPlans = plans.filter(
    (p) => (p.watchedEpisodes?.length ?? 0) < (p.totalEpisodes ?? p.anime.episodes),
  )

  const filteredPlans =
    tab === 'all'
      ? plans
      : tab === 'today'
        ? todayPlans
        : tab === 'delayed'
          ? delayedPlans
          : tab === 'completed'
            ? completedPlans
            : inProgressPlans

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / safePerPage))
  const safePage = Math.min(page, totalPages - 1)

  const paginatedPlans = filteredPlans.slice(safePage * safePerPage, (safePage + 1) * safePerPage)

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(0)
  }

  function handleTabChange(key: 'all' | 'completed' | 'delayed' | 'in-progress' | 'today') {
    setTab(key)
    localStorage.setItem('@aniplan/home-tab', key)
    setPage(0)
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

  const pageNumbers = getPageNumbers(safePage, totalPages)

  const hasPlans = plans.length > 0
  const totalWatched = plans.reduce((acc, p) => acc + (p.watchedEpisodes?.length ?? 0), 0)
  const totalEpisodesAll = plans.reduce((acc, p) => acc + (p.totalEpisodes ?? p.anime.episodes), 0)

  return (
    <div
      className={`min-h-screen ${entering ? 'overflow-hidden' : 'overflow-x-hidden'} bg-[#0a0a1a]`}
    >
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 border-b border-white/4 bg-[#0a0a1a]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link className="group flex items-center gap-2.5" href="/">
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-600 to-blue-600 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 group-hover:shadow-purple-500/40">
              A
              <div className="absolute inset-0 rounded-lg ring-1 ring-white/20 ring-inset" />
            </div>
            <span className="text-sm font-bold text-white">AniPlan</span>
          </Link>

          <Link href="/create">
            <Button className="bg-linear-to-r from-purple-600 to-blue-600 text-xs text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:from-purple-500 hover:to-blue-500 hover:shadow-xl hover:shadow-purple-500/30 sm:text-sm">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 4v16m8-8H4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              Nova maratona
            </Button>
          </Link>
        </div>
      </header>

      <main>
        {/* ===== Hero Section ===== */}
        <section className="relative overflow-hidden px-4 py-20 sm:py-28">
          {/* Deep background layers */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-purple-600/10 via-transparent to-blue-600/5" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08)_0%,transparent_60%)]" />

          {/* Subtle background gradient (static, no animation) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-[10%] size-48 rounded-full bg-purple-500/6 blur-2xl" />
            <div className="absolute right-[10%] bottom-0 size-48 rounded-full bg-blue-500/5 blur-2xl" />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {' '}
              {/* Badge */}
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <Badge
                  className="mb-8 h-auto gap-2 rounded-full border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-purple-300"
                  variant="outline"
                >
                  <div className="size-2 rounded-full bg-purple-500/70" />
                  <span className="text-xs font-medium">Planejador de maratonas</span>
                </Badge>
              </motion.div>
              {/* Title */}
              <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Organize seu tempo e{' '}
                <span className="bg-linear-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
                  descubra quando você termina
                </span>{' '}
                seu anime
              </h1>
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-balance text-white/50 sm:text-xl"
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                Crie um cronograma personalizado baseado na sua rotina e nunca mais perca o ritmo
                das suas maratonas.
              </motion.p>
              {/* CTA */}
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 flex items-center justify-center gap-4"
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <Link href="/create">
                  <Button
                    className="group relative overflow-hidden bg-linear-to-r from-purple-600 to-blue-600 px-8 py-6 text-base font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-500 hover:to-blue-500 hover:shadow-xl hover:shadow-purple-500/30"
                    size="lg"
                  >
                    <span className="relative z-10 flex items-center gap-2.5">
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                        <path
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                      Começar planejamento
                    </span>
                  </Button>
                </Link>
              </motion.div>
              {/* Step cards */}
              <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-3 border-t border-white/4 pt-8">
                {[
                  {
                    desc: 'Pesquise seu anime favorito',
                    icon: (
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    ),
                    label: 'Pesquise',
                    number: '1',
                  },
                  {
                    desc: 'Informe sua rotina',
                    icon: (
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    ),
                    label: 'Configure',
                    number: '2',
                  },
                  {
                    desc: 'Acompanhe seu progresso',
                    icon: (
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    ),
                    label: 'Maratone',
                    number: '3',
                  },
                ].map((step) => (
                  <div
                    className="group relative rounded-xl border border-white/4 bg-white/2 p-3 transition-all duration-200 hover:border-purple-500/20 hover:bg-purple-500/3"
                    key={step.label}
                  >
                    <div className="relative flex flex-col items-center gap-1.5 text-center">
                      <div className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-purple-600/30 to-blue-600/30 text-xs font-bold text-purple-400">
                        {step.number}
                      </div>
                      <div className="flex items-center gap-1 text-white/40">
                        {step.icon}
                        <span className="text-[10px] font-medium tracking-wider text-white/60 uppercase">
                          {step.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== Marathons Section ===== */}
        <section className="mx-auto max-w-4xl px-4 pt-8 pb-20 sm:pt-16">
          <AnimatePresence mode="wait">
            {hasPlans && loaded && (
              <motion.div
                animate={{ opacity: 1 }}
                className="space-y-6"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="plans"
              >
                {/* Summary banner */}
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-2xl border border-white/4 bg-linear-to-br from-purple-500/4 to-blue-500/4 p-5"
                  initial={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-purple-600/20 to-blue-600/20">
                        <svg
                          className="size-5 text-purple-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">Suas maratonas</h2>
                        <p className="text-xs text-white/40">
                          {plans.length} maratona{plans.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Badge
                        className="border-purple-500/20 bg-purple-500/10 text-purple-300"
                        variant="outline"
                      >
                        {totalWatched}/{totalEpisodesAll} eps assistidos
                      </Badge>
                      {totalEpisodesAll > 0 && (
                        <Badge
                          className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          variant="outline"
                        >
                          {Math.round((totalWatched / totalEpisodesAll) * 100)}% completo
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Tabs */}
                <div className="relative">
                  <div
                    className="flex flex-nowrap gap-1 overflow-x-auto rounded-xl border border-white/4 bg-white/2 p-1 [&::-webkit-scrollbar]:hidden"
                    onScroll={checkHomeTabsScroll}
                    ref={homeTabsRef}
                  >
                    {(
                      [
                        { count: plans.length, key: 'all' as const, label: 'Todas' },
                        {
                          count: todayPlans.length,
                          key: 'today' as const,
                          label: 'Hoje',
                        },
                        {
                          count: delayedPlans.length,
                          key: 'delayed' as const,
                          label: 'Atrasadas',
                        },
                        {
                          count: inProgressPlans.length,
                          key: 'in-progress' as const,
                          label: 'Em andamento',
                        },
                        {
                          count: completedPlans.length,
                          key: 'completed' as const,
                          label: 'Concluídas',
                        },
                      ] as const
                    ).map((t) => (
                      <Button
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                          tab === t.key
                            ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                            : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                        }`}
                        key={t.key}
                        onClick={() => handleTabChange(t.key)}
                        size="sm"
                        variant="ghost"
                      >
                        {t.label}
                        <AnimatePresence>
                          {t.key === 'today' && t.count > 0 && (
                            <motion.span
                              animate={{ opacity: 1, scale: 1 }}
                              className="ml-1.5 inline-block size-2 rounded-full bg-emerald-400/60 shadow-sm shadow-emerald-400/30"
                              exit={{ opacity: 0, scale: 0.3 }}
                              initial={{ opacity: 0, scale: 0 }}
                              key="home-today-dot"
                              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            />
                          )}
                        </AnimatePresence>
                        <AnimatePresence>
                          {t.key === 'delayed' && t.count > 0 && (
                            <motion.span
                              animate={{ opacity: 1, scale: 1 }}
                              className="ml-1.5 inline-block size-2 rounded-full bg-red-400/60 shadow-sm shadow-red-400/30"
                              exit={{ opacity: 0, scale: 0.3 }}
                              initial={{ opacity: 0, scale: 0 }}
                              key="delayed-dot"
                              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            />
                          )}
                        </AnimatePresence>
                        <span
                          className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            tab === t.key
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-white/5 text-white/30'
                          }`}
                        >
                          {t.count}
                        </span>
                      </Button>
                    ))}
                  </div>
                  {/* Left fade indicator */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-xl bg-linear-to-r from-[#0a0a1a] to-transparent transition-opacity duration-200 ${
                      homeCanScrollLeft ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  {/* Right fade indicator */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-linear-to-r from-transparent to-[#0a0a1a] transition-opacity duration-200 ${
                      homeCanScrollRight ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>

                {/* Cards grid */}
                {filteredPlans.length > 0 ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AnimatePresence>
                        {paginatedPlans
                          .filter((p) => !exitingIds.has(p.id))
                          .map((plan) => (
                            <motion.div
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{
                                height: 0,
                                marginBottom: 0,
                                opacity: 0,
                                overflow: 'hidden',
                                scale: 0.8,
                              }}
                              initial={{ opacity: 0, scale: 0.9 }}
                              key={plan.id}
                              layout
                              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <AnimePlanCard onDelete={handleDeletePlan} plan={plan} />
                            </motion.div>
                          ))}
                      </AnimatePresence>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
                        {/* Items per page */}
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span className="hidden sm:inline">Por página:</span>
                          <div className="flex gap-1">
                            {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                              <Button
                                className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-200 ${
                                  safePerPage === opt
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                                }`}
                                key={opt}
                                onClick={() => handlePerPageChange(opt)}
                                size="xs"
                                variant="ghost"
                              >
                                {opt}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Page controls */}
                        <div className="flex items-center gap-1">
                          {/* Previous */}
                          <Button
                            className="flex size-7 items-center justify-center rounded-md text-xs text-white/40 hover:bg-white/5 hover:text-white/60 disabled:opacity-20 disabled:hover:bg-transparent"
                            disabled={safePage === 0}
                            onClick={() => setPage(safePage - 1)}
                            size="icon-xs"
                            title="Página anterior"
                            variant="ghost"
                          >
                            <svg
                              className="size-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
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
                            {pageNumbers.map((p, idx) =>
                              p === 'ellipsis' ? (
                                <span
                                  className="flex size-7 items-center justify-center text-xs text-white/20"
                                  key={`ellipsis-${idx}`}
                                >
                                  ...
                                </span>
                              ) : (
                                <Button
                                  className={`flex size-7 items-center justify-center rounded-md text-xs font-medium transition-all duration-200 ${
                                    p === safePage
                                      ? 'bg-purple-500/20 text-purple-400'
                                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                                  }`}
                                  key={p}
                                  onClick={() => setPage(p)}
                                  size="icon-xs"
                                  variant="ghost"
                                >
                                  {p + 1}
                                </Button>
                              ),
                            )}
                          </div>

                          {/* Next */}
                          <Button
                            className="flex size-7 items-center justify-center rounded-md text-xs text-white/40 hover:bg-white/5 hover:text-white/60 disabled:opacity-20 disabled:hover:bg-transparent"
                            disabled={safePage >= totalPages - 1}
                            onClick={() => setPage(safePage + 1)}
                            size="icon-xs"
                            title="Próxima página"
                            variant="ghost"
                          >
                            <svg
                              className="size-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M9 5l7 7-7 7"
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
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <p className="text-sm text-white/40">
                      {tab === 'today'
                        ? 'Nenhuma maratona com episódios para hoje'
                        : tab === 'delayed'
                          ? 'Nenhuma maratona com episódios atrasados'
                          : tab === 'completed'
                            ? 'Nenhuma maratona concluída ainda'
                            : 'Nenhuma maratona em andamento'}
                    </p>
                    <p className="text-xs text-white/20">
                      {tab === 'today'
                        ? 'Aproveite para criar uma nova maratona!'
                        : tab === 'delayed'
                          ? 'Que bom, você está em dia com suas maratonas!'
                          : tab === 'completed'
                            ? 'Continue assistindo para completar suas maratonas!'
                            : 'Crie uma nova maratona para começar!'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Empty state */}
            {!hasPlans && loaded && (
              <motion.div
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="empty"
              >
                {' '}
                <div className="relative mb-6">
                  {/* Glow behind the icon */}
                  <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl" />
                  <div className="relative flex size-20 items-center justify-center rounded-full border border-white/6 bg-white/3">
                    <svg
                      className="size-9 text-white/25"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.2}
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white/70">Nenhuma maratona ainda</h3>
                <p className="mt-1.5 max-w-xs text-sm text-white/40">
                  Crie sua primeira maratona e comece a organizar seu tempo!
                </p>
                <Link className="mt-6" href="/create">
                  <Button className="bg-linear-to-r from-purple-600 to-blue-600 px-6 py-5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:from-purple-500 hover:to-blue-500 hover:shadow-xl hover:shadow-purple-500/30">
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M12 4v16m8-8H4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Criar primeira maratona
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading skeleton */}
          {!loaded && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="size-10 animate-pulse rounded-xl bg-white/4" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 animate-pulse rounded bg-white/4" />
                  <div className="h-3 w-20 animate-pulse rounded bg-white/3" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    className="flex animate-pulse gap-4 rounded-xl border border-white/4 bg-white/2 p-4"
                    key={i}
                  >
                    <div className="size-24 rounded-lg bg-white/4" />
                    <div className="flex flex-1 flex-col gap-2.5">
                      <div className="h-4 w-3/4 rounded bg-white/4" />
                      <div className="h-3 w-1/2 rounded bg-white/3" />
                      <div className="mt-1 h-2 w-full rounded bg-white/4" />
                      <div className="h-3 w-1/3 rounded bg-white/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ===== Footer ===== */}
        <footer className="border-t border-white/4 py-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-white/20">
              <span>AniPlan</span>
              <span className="text-white/8">·</span>
              <span>{new Date().getFullYear()}</span>
            </div>
            <p className="text-xs text-white/20">
              Dados via{' '}
              <a
                className="text-white/30 transition-colors hover:text-purple-400"
                href="https://kitsu.io"
                rel="noopener noreferrer"
                target="_blank"
              >
                Kitsu
              </a>{' '}
              ·{' '}
              <a
                className="text-white/30 transition-colors hover:text-purple-400"
                href="https://anilist.co"
                rel="noopener noreferrer"
                target="_blank"
              >
                AniList
              </a>{' '}
              ·{' '}
              <a
                className="text-white/30 transition-colors hover:text-purple-400"
                href="https://jikan.moe"
                rel="noopener noreferrer"
                target="_blank"
              >
                Jikan
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
