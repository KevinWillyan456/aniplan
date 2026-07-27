'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { RoutineInput } from '@/components/anime/routine-form'
import type { Anime, Schedule } from '@/types/anime'

import { AnimeSearch } from '@/components/anime/anime-search'
import { ProgressBar } from '@/components/anime/progress-bar'
import { RoutineForm } from '@/components/anime/routine-form'
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
import { Button } from '@/components/ui/button'
import { generateAnimeSchedule } from '@/lib/schedule-generator'
import { generateId, getAnimePlanById, saveAnimePlan } from '@/lib/storage'
import { getEpisodeNumberInSeason } from '@/types/anime'

const STEPS = [
  { icon: '🔍', label: 'Buscar anime' },
  { icon: '⚙️', label: 'Configurar rotina' },
  { icon: '📋', label: 'Revisar cronograma' },
]

const STAT_STYLES = {
  amber: {
    border: 'hover:border-amber-500/20',
    from: 'from-amber-500/[0.04]',
    shadow: 'hover:shadow-amber-500/5',
    text: 'text-amber-400',
  },
  blue: {
    border: 'hover:border-blue-500/20',
    from: 'from-blue-500/[0.04]',
    shadow: 'hover:shadow-blue-500/5',
    text: 'text-blue-400',
  },
  emerald: {
    border: 'hover:border-emerald-500/20',
    from: 'from-emerald-500/[0.04]',
    shadow: 'hover:shadow-emerald-500/5',
    text: 'text-emerald-400',
  },
  purple: {
    border: 'hover:border-purple-500/20',
    from: 'from-purple-500/[0.04]',
    shadow: 'hover:shadow-purple-500/5',
    text: 'text-purple-400',
  },
} as const

export default function CreatePageContent() {
  const router = useRouter()
  const [editId] = useQueryState('edit', parseAsString)
  const existingPlan = useMemo(() => (editId ? getAnimePlanById(editId) : null), [editId])
  const [step, setStep] = useState(existingPlan ? 1 : 0)
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(existingPlan?.anime ?? null)
  const [routine, setRoutine] = useState<null | RoutineInput>(null)
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [endDate, setEndDate] = useState('')
  const [totalHours, setTotalHours] = useState(0)
  const [totalDays, setTotalDays] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasModified, setHasModified] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const pendingNavigationRef = useRef<(() => void) | null>(null)
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Dynamic page title based on current step
  useEffect(() => {
    const titles = ['Buscar Anime', 'Configurar Rotina', 'Revisar Cronograma']
    const prefix = editId ? 'Editar' : 'Nova'
    document.title = `${prefix} Maratona — ${titles[step] ?? 'Criação'} | AniPlan`
  }, [editId, step])

  // Ensure step and selectedAnime are set when editing (handles SSR hydration)
  const editInitRef = useRef(false)
  useEffect(() => {
    if (!existingPlan || editInitRef.current) return
    editInitRef.current = true

    setSelectedAnime(existingPlan.anime)

    setStep(1)
  }, [existingPlan])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(generateTimeoutRef.current)
    }
  }, [])

  // Warn about unsaved changes on browser navigation
  useEffect(() => {
    if (!hasModified) return undefined

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasModified])

  function confirmNavigation(navigate: () => void) {
    if (!hasModified) {
      navigate()
      return
    }
    pendingNavigationRef.current = navigate
    setShowExitDialog(true)
  }

  function handleConfirmExit() {
    setShowExitDialog(false)
    pendingNavigationRef.current?.()
    pendingNavigationRef.current = null
  }

  function handleDismissExit() {
    setShowExitDialog(false)
    pendingNavigationRef.current = null
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) handleDismissExit()
  }

  function handleSelectAnime(anime: Anime | null) {
    setSelectedAnime(anime)
    if (anime) {
      setStep(1)
    }
  }

  function handleGenerate(routineInput: RoutineInput) {
    if (!selectedAnime) return
    setIsGenerating(true)
    setHasModified(true)

    // Simulate a brief delay for UX
    generateTimeoutRef.current = setTimeout(() => {
      const result = generateAnimeSchedule(selectedAnime, {
        availableDays: routineInput.availableDays,
        customEpisodes: routineInput.totalEpisodes,
        episodesPerDay: routineInput.episodesPerDay,
        startDate: routineInput.startDate,
      })

      setRoutine(routineInput)
      setSchedule(result.schedule)
      setEndDate(result.endDate)
      setTotalHours(result.totalHours)
      setTotalDays(result.totalDays)
      setIsGenerating(false)
      setStep(2)
    }, 600)
  }

  function handleSave() {
    if (!selectedAnime || !routine) return

    const oldWatched = existingPlan?.watchedEpisodes ?? []
    const filteredWatched = oldWatched.filter((ep) => ep <= routine.totalEpisodes)
    const discardedCount = oldWatched.length - filteredWatched.length

    const plan = {
      anime: selectedAnime,
      availableDays: routine.availableDays,
      createdAt: existingPlan?.createdAt ?? new Date().toISOString(),
      episodesPerDay: routine.episodesPerDay,
      id: existingPlan?.id ?? generateId(),
      schedule,
      seasons: routine.seasons,
      startDate: routine.startDate,
      totalEpisodes: routine.totalEpisodes,
      watchedEpisodes: filteredWatched,
    }

    saveAnimePlan(plan)

    toast.success('Maratona salva com sucesso!', {
      description: selectedAnime.title,
    })

    if (discardedCount > 0) {
      toast.warning(`Você reduziu o total para ${routine.totalEpisodes} episódios`, {
        description: `${discardedCount} episódio${discardedCount > 1 ? 's' : ''} assistido${discardedCount > 1 ? 's' : ''} foi${discardedCount > 1 ? 'ram' : ''} removido${discardedCount > 1 ? 's' : ''} do progresso por exceder${discardedCount > 1 ? 'em' : ''} o novo total.`,
      })
    }

    router.push(`/anime/${plan.id}`)
  }

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a1a]">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 border-b border-white/4 bg-[#0a0a1a]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <button
            className="group flex cursor-pointer items-center gap-2.5"
            onClick={() => confirmNavigation(() => router.push('/'))}
            type="button"
          >
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-600 to-blue-600 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 group-hover:shadow-purple-500/40">
              A
              <div className="absolute inset-0 rounded-lg ring-1 ring-white/20 ring-inset" />
            </div>
            <span className="text-sm font-bold text-white">AniPlan</span>
          </button>

          {/* Step indicator */}
          <div className="hidden items-center gap-2 sm:flex">
            {STEPS.map((s, i) => (
              <div className="flex items-center gap-2" key={s.label}>
                <div
                  className={`relative flex size-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                    i === step
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : i < step
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-white/40'
                  }`}
                >
                  {i < step ? '✓' : s.icon}
                  {i === step && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      className="absolute inset-0 rounded-full ring-2 ring-purple-500/40"
                      transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
                    />
                  )}
                </div>
                <span
                  className={`text-xs transition-colors duration-300 ${
                    i === step ? 'font-medium text-white/80' : 'text-white/30'
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-px w-6 transition-colors duration-300 ${
                      i < step ? 'bg-emerald-500/50' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Button
            className="text-xs text-white/50 hover:text-white/80"
            onClick={() => confirmNavigation(() => router.push('/'))}
            size="sm"
            variant="ghost"
          >
            Voltar
          </Button>
        </div>
      </header>

      {/* Exit confirmation dialog */}
      <AlertDialog onOpenChange={handleDialogOpenChange} open={showExitDialog}>
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
            <AlertDialogTitle className="text-white">Sair da criação?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Você tem configurações não salvas. Se sair agora,{' '}
              <strong className="text-white/80">todo o progresso será perdido</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/6 bg-white/3 text-white/60 hover:bg-white/6 hover:text-white">
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmExit}
              variant="destructive"
            >
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Content ===== */}
      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* Background decoration */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/3 size-96 rounded-full bg-purple-500/3 blur-3xl" />
          <div className="absolute top-1/3 right-0 size-64 rounded-full bg-blue-500/3 blur-3xl" />
        </div>

        <AnimatePresence mode="wait">
          {/* ===== Step 0: Search ===== */}
          {step === 0 && (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="relative space-y-6"
              exit={{ opacity: 0, x: -30 }}
              initial={{ opacity: 0, x: -30 }}
              key="step-0"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center">
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1"
                  initial={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.05, duration: 0.3 }}
                >
                  <span className="text-xs">🔍</span>
                  <span className="text-[11px] font-medium text-purple-300">Etapa 1 de 3</span>
                </motion.div>
                <h1 className="text-2xl font-bold text-white">Qual anime você quer maratonar?</h1>
                <p className="mt-1 text-sm text-white/40">
                  Pesquise pelo título do anime que deseja assistir
                </p>
              </div>
              <AnimeSearch onSelect={handleSelectAnime} selectedAnime={selectedAnime} />
            </motion.div>
          )}

          {/* ===== Step 1: Routine ===== */}
          {step === 1 && selectedAnime && (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="relative space-y-6"
              exit={{ opacity: 0, x: -30 }}
              initial={{ opacity: 0, x: 30 }}
              key="step-1"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center">
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1"
                  initial={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.05, duration: 0.3 }}
                >
                  <span className="text-xs">⚙️</span>
                  <span className="text-[11px] font-medium text-purple-300">Etapa 2 de 3</span>
                </motion.div>
                <h1 className="text-2xl font-bold text-white">Configure sua rotina</h1>
                <p className="mt-1 text-sm text-white/40">
                  Informe sua disponibilidade para gerar o cronograma perfeito
                </p>
              </div>
              <div className="flex items-center">
                <button
                  className="mb-2 flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-purple-400"
                  onClick={() => {
                    setSelectedAnime(null)
                    setStep(0)
                    setRoutine(null)
                    setSchedule([])
                    setEndDate('')
                    setTotalHours(0)
                    setTotalDays(0)
                    setHasModified(false)
                  }}
                  type="button"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M15 19l-7-7 7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  Trocar anime
                </button>
              </div>
              <RoutineForm
                anime={selectedAnime}
                initialDays={existingPlan?.availableDays}
                initialEpisodesPerDay={existingPlan?.episodesPerDay}
                initialSeasons={existingPlan?.seasons?.length ? existingPlan.seasons : undefined}
                initialStartDate={existingPlan?.startDate}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
              />
            </motion.div>
          )}

          {/* ===== Step 2: Review ===== */}
          {step === 2 && routine && selectedAnime && (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="relative space-y-6"
              exit={{ opacity: 0, x: 30 }}
              initial={{ opacity: 0, x: 30 }}
              key="step-2"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center">
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1"
                  initial={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.05, duration: 0.3 }}
                >
                  <span className="text-xs">📋</span>
                  <span className="text-[11px] font-medium text-emerald-300">Etapa 3 de 3</span>
                </motion.div>
                <h1 className="text-2xl font-bold text-white">Cronograma gerado!</h1>
                <p className="mt-1 text-sm text-white/40">Revise os detalhes antes de salvar</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { color: 'purple' as const, label: 'Dias', value: totalDays },
                  { color: 'blue' as const, label: 'Total', value: formatHours(totalHours) },
                  { color: 'emerald' as const, label: 'Sessões', value: schedule.length },
                  {
                    color: 'amber' as const,
                    label: 'Previsão',
                    small: true,
                    value: formatDate(endDate),
                  },
                ].map((stat) => {
                  const s = STAT_STYLES[stat.color]
                  return (
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className={`group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-white/4 bg-linear-to-br from-white/3 to-white/1 p-4 text-center transition-all duration-300 ${s.border} ${s.shadow} hover:shadow-lg`}
                      initial={{ opacity: 0, y: 20 }}
                      key={stat.label}
                      transition={{ delay: 0.1, duration: 0.35 }}
                    >
                      <div
                        className={`absolute inset-0 bg-linear-to-br ${s.from} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                      />
                      <p
                        className={`relative font-bold ${stat.small ? 'text-lg' : 'text-2xl'} ${s.text}`}
                      >
                        {stat.value}
                      </p>
                      <p className="relative mt-1 text-xs text-white/50">{stat.label}</p>
                    </motion.div>
                  )
                })}
              </div>

              {/* Anime info + cover */}
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-xl border border-white/4 bg-linear-to-br from-white/3 to-white/1"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.15, duration: 0.35 }}
              >
                <div className="flex gap-4 p-4">
                  {/* Cover image */}
                  <div className="relative aspect-3/4 w-20 shrink-0 overflow-hidden rounded-lg shadow-lg shadow-purple-500/10">
                    <Image
                      alt={selectedAnime.title}
                      className="object-cover transition-transform duration-300 hover:scale-110"
                      fill
                      sizes="80px"
                      src={selectedAnime.image}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {selectedAnime.title}
                    </p>
                    <p className="text-xs text-white/40">
                      {routine.totalEpisodes} episódios · {selectedAnime.duration} min cada
                    </p>
                    <ProgressBar current={0} total={routine.totalEpisodes} />
                  </div>
                </div>
              </motion.div>

              {/* Schedule preview */}
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/4 bg-linear-to-br from-white/3 to-white/1 p-4"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2, duration: 0.35 }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/70">Prévia do cronograma</h3>
                  <span className="text-xs text-white/30">
                    {schedule.length} {schedule.length === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
                <div className="max-h-48 scrollbar-thin space-y-1.5 overflow-y-auto">
                  {schedule.slice(0, 5).map((entry, i) => (
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 rounded-lg border border-white/2 bg-white/2 px-3 py-2 transition-all duration-200 hover:border-purple-500/10 hover:bg-purple-500/2"
                      initial={{ opacity: 0, x: -10 }}
                      key={entry.date}
                      transition={{ delay: 0.25 + i * 0.05, duration: 0.3 }}
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-[10px] font-medium text-white/40">
                        {formatDate(entry.date).split(',')[0].split(' ').pop()}
                      </div>
                      <span className="text-[11px] text-white/50">
                        {formatDate(entry.date).split(',')[0]}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {entry.episodes.map((ep) => {
                          const seasonInfo =
                            routine.seasons && routine.seasons.length > 1
                              ? getEpisodeNumberInSeason(routine.seasons, ep)
                              : null
                          return (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400"
                              key={ep}
                            >
                              EP {seasonInfo ? seasonInfo.episodeInSeason : ep}
                              {seasonInfo && (
                                <span className="text-[9px] text-purple-500/70">
                                  {seasonInfo.season.label}
                                </span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </motion.div>
                  ))}
                  {schedule.length > 5 && (
                    <motion.p
                      animate={{ opacity: 1 }}
                      className="pt-1 text-center text-xs text-white/30"
                      initial={{ opacity: 0 }}
                    >
                      +{schedule.length - 5} sessões restantes
                    </motion.p>
                  )}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.3, duration: 0.35 }}
              >
                <Button
                  className="flex-1 border-white/6 bg-white/3 py-6 text-white/60 transition-all duration-300 hover:border-white/10 hover:bg-white/6 hover:text-white"
                  onClick={() => setStep(1)}
                  variant="outline"
                >
                  ← Voltar
                </Button>
                <Button
                  className="group relative flex-1 overflow-hidden bg-linear-to-r from-purple-600 to-blue-600 py-6 text-base font-semibold text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:from-purple-500 hover:to-blue-500 hover:shadow-xl hover:shadow-purple-500/30"
                  onClick={handleSave}
                >
                  <span className="relative z-10">Salvar maratona</span>
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
                    transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity }}
                  />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
