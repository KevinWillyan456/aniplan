'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { parseAsStringEnum, useQueryState } from 'nuqs'
import { startTransition, useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { AnimePlan } from '@/types/anime'

import { AnimePlanCard } from '@/components/anime/anime-plan-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { deleteAnimePlan, getAnimePlans } from '@/lib/storage'

export default function HomePageContent() {
  const [plans, setPlans] = useState<AnimePlan[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const allPlans = getAnimePlans()
    allPlans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    startTransition(() => {
      setPlans(allPlans)
      setLoaded(true)
    })
  }, [])
  function handleDeletePlan(id: string) {
    const plan = plans.find((p) => p.id === id)
    deleteAnimePlan(id)
    setPlans((prev) => prev.filter((p) => p.id !== id))
    if (plan) {
      toast.success('Maratona excluída', {
        description: plan.anime.title,
      })
    }
  }

  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringEnum(['all', 'completed', 'in-progress'] as const).withDefault('all'),
  )

  const completedPlans = plans.filter(
    (p) => (p.watchedEpisodes?.length ?? 0) >= (p.totalEpisodes ?? p.anime.episodes),
  )
  const inProgressPlans = plans.filter(
    (p) => (p.watchedEpisodes?.length ?? 0) < (p.totalEpisodes ?? p.anime.episodes),
  )

  const filteredPlans =
    tab === 'all' ? plans : tab === 'completed' ? completedPlans : inProgressPlans

  const hasPlans = plans.length > 0
  const totalWatched = plans.reduce((acc, p) => acc + (p.watchedEpisodes?.length ?? 0), 0)
  const totalEpisodesAll = plans.reduce((acc, p) => acc + (p.totalEpisodes ?? p.anime.episodes), 0)

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a1a]">
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
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5"
                initial={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div className="size-2 rounded-full bg-purple-500/70" />
                <span className="text-xs font-medium text-purple-300">Planejador de maratonas</span>
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
                <div className="flex gap-1 rounded-xl border border-white/4 bg-white/2 p-1">
                  {(
                    [
                      { count: plans.length, key: 'all' as const, label: 'Todas' },
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
                    <button
                      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        tab === t.key
                          ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                          : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                      }`}
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      type="button"
                    >
                      {t.label}
                      <span
                        className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          tab === t.key
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-white/5 text-white/30'
                        }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Cards grid */}
                {filteredPlans.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {filteredPlans.map((plan) => (
                      <div key={plan.id}>
                        <AnimePlanCard onDelete={handleDeletePlan} plan={plan} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <p className="text-sm text-white/40">
                      {tab === 'completed'
                        ? 'Nenhuma maratona concluída ainda'
                        : 'Nenhuma maratona em andamento'}
                    </p>
                    <p className="text-xs text-white/20">
                      {tab === 'completed'
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
