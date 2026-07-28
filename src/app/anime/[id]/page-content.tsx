'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { startTransition, useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { AnimePlan } from '@/types/anime'

import { EpisodeList } from '@/components/anime/episode-list'
import { ProgressBar } from '@/components/anime/progress-bar'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  deleteAnimePlan,
  getAnimePlanById,
  updateEpisodeProgress,
  updateMultipleEpisodes,
} from '@/lib/storage'
import { getSeasonWatchedCount } from '@/types/anime'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const STAT_STYLES = {
  amber: { text: 'text-amber-400' },
  blue: { text: 'text-blue-400' },
  emerald: { text: 'text-emerald-400' },
  purple: { text: 'text-purple-400' },
} as const

export default function AnimeDetailContent() {
  const params = useParams()
  const router = useRouter()
  const [plan, setPlan] = useState<AnimePlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = params.id as string
    const found = getAnimePlanById(id)
    startTransition(() => {
      if (found) {
        setPlan(found)
        document.title = `${found.anime.title} | AniPlan`
      } else {
        document.title = 'Maratona não encontrada | AniPlan'
      }
      setLoading(false)
    })
  }, [params.id])

  function handleToggleEpisode(episodeNumber: number, watched: boolean) {
    if (!plan) return
    const updated = updateEpisodeProgress(plan.id, episodeNumber, watched)
    if (updated) {
      setPlan({ ...updated })
    }
  }

  function handleBatchToggle(episodeNumbers: number[], watched: boolean) {
    if (!plan) return
    const updated = updateMultipleEpisodes(plan.id, episodeNumbers, watched)
    if (updated) {
      setPlan({ ...updated })
    }
  }

  function handleDelete() {
    if (!plan) return
    deleteAnimePlan(plan.id)
    toast.success('Maratona excluída', {
      description: plan.anime.title,
    })
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a]">
        <div className="size-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a1a] px-4">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          className="relative mb-2"
          transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
        >
          <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-2xl" />
          <div className="relative flex size-20 items-center justify-center rounded-full border border-white/6 bg-white/3">
            <svg
              className="size-9 text-white/25"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          </div>
        </motion.div>
        <h2 className="text-lg font-semibold text-white/70">Maratona não encontrada</h2>
        <p className="text-sm text-white/40">Esta maratona pode ter sido excluída.</p>
        <Button
          className="mt-2 bg-linear-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:from-purple-500 hover:to-blue-500 hover:shadow-xl hover:shadow-purple-500/30"
          onClick={() => router.push('/')}
        >
          Voltar para o início
        </Button>
      </div>
    )
  }

  const totalEpisodes = plan.totalEpisodes ?? plan.anime.episodes
  const watchedCount = plan.watchedEpisodes.length
  const unwatchedCount = totalEpisodes - watchedCount
  const percentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0
  const seasons = plan.seasons ?? []

  function formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  function formatHours(hours: number) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h > 0 && m > 0) return `${h}h${m}min`
    if (h > 0) return `${h}h`
    return `${m}min`
  }

  const totalMinutes = totalEpisodes * plan.anime.duration
  const totalHours = totalMinutes / 60

  const stats = [
    { color: 'purple' as const, label: 'Tempo total', value: formatHours(totalHours) },
    {
      color: 'blue' as const,
      label: 'Previsão de término',
      value: formatDate(plan.schedule[plan.schedule.length - 1]?.date ?? plan.startDate).split(
        ',',
      )[0],
    },
    { color: 'emerald' as const, label: 'Concluído', value: `${percentage}%` },
    { color: 'amber' as const, label: 'Episódios', value: `${watchedCount}/${totalEpisodes}` },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a1a]">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 size-96 rounded-full bg-purple-500/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-64 rounded-full bg-blue-500/3 blur-3xl" />
      </div>

      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 border-b border-white/4 bg-[#0a0a1a]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Button
            className="group flex cursor-pointer items-center gap-2.5 bg-transparent p-0 hover:bg-transparent"
            onClick={() => router.push('/')}
            variant="ghost"
          >
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-600 to-blue-600 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 group-hover:shadow-purple-500/40">
              A
              <div className="absolute inset-0 rounded-lg ring-1 ring-white/20 ring-inset" />
            </div>
            <span className="text-sm font-bold text-white">AniPlan</span>
          </Button>

          <div className="flex items-center gap-1.5">
            {/* Edit button */}
            <Link href={`/create?edit=${plan.id}`}>
              <Button
                className="border-purple-500/30 bg-purple-500/10 text-xs text-purple-400 shadow-sm shadow-purple-500/10 transition-all duration-200 hover:border-purple-500/50 hover:bg-purple-500/20 hover:text-purple-300 hover:shadow-md hover:shadow-purple-500/20"
                size="sm"
                variant="outline"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Editar
              </Button>
            </Link>

            {/* Delete button with confirmation */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                  size="sm"
                  variant="ghost"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border border-white/6 bg-[#1a1a2e] text-white">
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-red-500/10 text-red-400">
                    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </AlertDialogMedia>
                  <AlertDialogTitle className="text-white">Excluir maratona</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/50">
                    Tem certeza que deseja excluir a maratona de{' '}
                    <strong className="text-white/80">{plan.anime.title}</strong>? Esta ação não
                    pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/6 bg-white/3 text-white/60 hover:bg-white/6 hover:text-white">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={handleDelete}
                    variant="destructive"
                  >
                    Sim, excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              className="text-xs text-white/50 hover:text-white/80"
              onClick={() => router.push('/')}
              size="sm"
              variant="ghost"
            >
              ← Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* ===== Hero section ===== */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-2xl border border-white/4 bg-linear-to-br from-white/3 to-white/1"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 via-transparent to-blue-500/10" />

            <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
              {/* Anime image */}
              <div className="relative mx-auto aspect-3/4 w-40 shrink-0 overflow-hidden rounded-xl shadow-2xl shadow-purple-500/20 sm:mx-0">
                <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 ring-inset" />
                <Image
                  alt={plan.anime.title}
                  className="object-cover transition-transform duration-500 hover:scale-110"
                  fill
                  loading="eager"
                  sizes="160px"
                  src={plan.anime.image}
                />
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{plan.anime.title}</h1>
                  {plan.anime.titleJapanese && (
                    <p className="mt-0.5 text-sm text-white/40">{plan.anime.titleJapanese}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                    variant="outline"
                  >
                    ★ {plan.anime.score}
                  </Badge>
                  <Badge
                    className="border-blue-500/20 bg-blue-500/10 text-blue-400"
                    variant="outline"
                  >
                    {totalEpisodes} episódios
                  </Badge>
                  <Badge
                    className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    variant="outline"
                  >
                    ~{plan.anime.duration} min/ep
                  </Badge>
                  {plan.anime.type && (
                    <Badge className="border-white/6 bg-white/3 text-white/60" variant="outline">
                      {plan.anime.type}
                    </Badge>
                  )}
                </div>

                {/* Seasons breakdown */}
                {seasons.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {seasons.map((s, idx) => {
                      const seasonWatched = getSeasonWatchedCount(
                        seasons,
                        idx,
                        plan.watchedEpisodes,
                      )
                      const isComplete = seasonWatched >= s.episodeCount
                      const isInProgress = seasonWatched > 0 && !isComplete
                      return (
                        <Badge
                          className={`border-purple-500/20 bg-purple-500/10 ${
                            isComplete
                              ? 'text-emerald-400'
                              : isInProgress
                                ? 'text-amber-400'
                                : 'text-purple-300'
                          }`}
                          key={s.number}
                          variant="outline"
                        >
                          {s.label}: {seasonWatched}/{s.episodeCount}ep
                          {isComplete && (
                            <svg
                              className="ml-1 size-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M5 13l4 4L19 7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                              />
                            </svg>
                          )}
                        </Badge>
                      )
                    })}
                  </div>
                )}

                {/* Synopsis */}
                {plan.anime.synopsis && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-white/50">
                    {plan.anime.synopsis}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ===== Stats grid ===== */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {stats.map((stat, i) => {
            const s = STAT_STYLES[stat.color]
            return (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-white/4 bg-linear-to-br from-white/3 to-white/1 p-4 text-center transition-all duration-300 hover:border-white/8 hover:shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                key={stat.label}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.35 }}
              >
                <div className="absolute inset-0 bg-linear-to-br from-white/2 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <p className={`relative text-2xl font-bold ${s.text}`}>{stat.value}</p>
                <p className="relative mt-1 text-xs text-white/50">{stat.label}</p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* ===== Available days ===== */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.18, duration: 0.4 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/4 bg-white/2 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
                <svg
                  className="size-3.5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <span className="text-xs font-medium text-white/60">Dias de maratona</span>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const isActive = plan.availableDays.includes(day)
                  return (
                    <span
                      className={`inline-flex h-7 w-9 items-center justify-center rounded-md text-[11px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-500/20 text-purple-300 shadow-xs shadow-purple-500/20'
                          : 'bg-white/3 text-white/20'
                      }`}
                      key={day}
                      title={isActive ? 'Disponível' : 'Indisponível'}
                    >
                      {DAY_LABELS[day]}
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <svg
                  className="size-3.5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                <span className="text-white/50">{plan.episodesPerDay} ep/dia</span>
              </span>
              <span className="hidden text-white/10 sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <svg
                  className="size-3.5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Início {new Date(plan.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ===== Progress bar ===== */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.22, duration: 0.4 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-purple-500/10">
                <svg
                  className="size-3.5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-white/70">Progresso</span>
            </div>
            <span className="text-sm font-medium text-purple-400">
              {watchedCount}/{totalEpisodes} episódios
            </span>
          </div>
          <ProgressBar current={watchedCount} showLabel={false} size="lg" total={totalEpisodes} />
        </motion.div>

        {/* ===== Episode schedule ===== */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10">
                <svg
                  className="size-3.5 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">Cronograma</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {watchedCount >= totalEpisodes ? (
                <Button
                  className="border border-white/4 bg-white/2 px-2.5 py-1 text-xs text-white/40 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400"
                  onClick={() => {
                    handleBatchToggle(
                      plan.schedule.flatMap((s) => s.episodes),
                      false,
                    )
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Desmarcar tudo
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-400 hover:border-purple-500/40 hover:bg-purple-500/20"
                      size="sm"
                      variant="ghost"
                    >
                      ✓ Marcar tudo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border border-white/6 bg-[#1a1a2e] text-white">
                    <AlertDialogHeader>
                      <AlertDialogMedia className="bg-emerald-500/10 text-emerald-400">
                        <svg
                          className="size-6"
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
                      </AlertDialogMedia>
                      <AlertDialogTitle className="text-white">
                        Marcar todos como assistidos
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-white/50">
                        Tem certeza que deseja marcar{' '}
                        <strong className="text-white/80">{unwatchedCount}</strong> episódio
                        {unwatchedCount !== 1 ? 's' : ''} como assistido
                        {unwatchedCount !== 1 ? 's' : ''}? Esta ação pode ser desfeita manualmente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/6 bg-white/3 text-white/60 hover:bg-white/6 hover:text-white">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => {
                          const unwatched = plan.schedule
                            .flatMap((s) => s.episodes)
                            .filter((ep) => !plan.watchedEpisodes.includes(ep))
                          handleBatchToggle(unwatched, true)
                        }}
                      >
                        Sim, marcar todos
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <span className="rounded-md border border-white/4 bg-white/2 px-2.5 py-1 text-xs text-white/40">
                {plan.schedule.length} sessões
              </span>
            </div>
          </div>
          <EpisodeList
            onBatchToggle={handleBatchToggle}
            onToggleEpisode={handleToggleEpisode}
            plan={plan}
          />
        </motion.div>
      </main>
    </div>
  )
}
