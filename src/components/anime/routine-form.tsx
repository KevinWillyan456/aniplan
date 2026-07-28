'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import type { Anime, Season } from '@/types/anime'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { routineFormSchema, type RoutineFormValues } from '@/lib/schemas'
import { getTotalEpisodesFromSeasons } from '@/types/anime'

export interface RoutineInput {
  availableDays: number[]
  episodesPerDay: number
  seasons: Season[]
  startDate: string
  totalEpisodes: number
}

interface RoutineFormProps {
  anime: Anime
  initialDays?: number[]
  initialEpisodesPerDay?: number
  initialSeasons?: Season[]
  initialStartDate?: string
  isGenerating?: boolean
  onGenerate: (routine: RoutineInput) => void
}

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sab', value: 6 },
]

const QUICK_EPISODES = [1, 2, 3, 4, 5, 6, 8, 12]

const MIN_EPISODES = 1
const MAX_EPISODES = 60

export function RoutineForm({
  anime,
  initialDays,
  initialEpisodesPerDay,
  initialSeasons,
  initialStartDate,
  isGenerating,
  onGenerate,
}: RoutineFormProps) {
  const today = getLocalDateString(new Date())

  const [seasons, setSeasons] = useState<Season[]>([])
  const [error, setError] = useState('')
  const seasonsInitialized = useRef(false)

  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<RoutineFormValues>({
    defaultValues: {
      days: initialDays ?? [0, 1, 2, 3, 4, 5, 6],
      episodesPerDay: initialEpisodesPerDay ?? 3,
      seasons: [],
      startDate: initialStartDate ?? today,
    },
    resolver: zodResolver(routineFormSchema),
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchDays = watch('days')
  const watchEpisodes = watch('episodesPerDay')
  const totalEpisodes = getTotalEpisodesFromSeasons(seasons)

  // Calculate estimated time per day
  const estimatedMinutesPerDay = (watchEpisodes || 0) * (anime.duration || 24)

  // Initialize seasons (only on mount or when initialSeasons/anime changes)
  useEffect(() => {
    if (seasonsInitialized.current && !initialSeasons) return

    if (initialSeasons && initialSeasons.length > 0) {
      setSeasons(initialSeasons)
    } else if (!seasonsInitialized.current) {
      const defaultCount = anime.episodes > 0 ? anime.episodes : 12
      setSeasons([{ episodeCount: defaultCount, label: 'T1', number: 1 }])
    }

    seasonsInitialized.current = true
  }, [anime.episodes, initialSeasons])

  // Sync seasons to RHF
  useEffect(() => {
    setValue('seasons', seasons, { shouldValidate: true })
  }, [seasons, setValue])

  function toggleDay(day: number) {
    const current = getValues('days')
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    setValue('days', updated, { shouldValidate: true })
  }

  function addSeason() {
    setSeasons((prev) => [
      ...prev,
      { episodeCount: 12, label: `T${prev.length + 1}`, number: prev.length + 1 },
    ])
  }

  function removeSeason(index: number) {
    if (seasons.length <= 1) return
    setSeasons((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, number: i + 1 })),
    )
  }

  function updateSeason(index: number, field: 'episodeCount' | 'label', value: number | string) {
    setSeasons((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function applyApiSuggestion() {
    if (anime.episodes > 0) {
      setSeasons([{ episodeCount: anime.episodes, label: 'T1', number: 1 }])
    }
  }

  function onSubmit(values: RoutineFormValues) {
    const invalidSeason = seasons.find((s) => !s.episodeCount || s.episodeCount <= 0)
    if (invalidSeason) {
      setError(`A temporada "${invalidSeason.label}" tem um número inválido de episódios`)
      return
    }

    if (totalEpisodes <= 0) {
      setError('Adicione pelo menos um episódio no total das temporadas')
      return
    }

    setError('')

    onGenerate({
      availableDays: values.days,
      episodesPerDay: values.episodesPerDay,
      seasons,
      startDate: values.startDate,
      totalEpisodes,
    })
  }

  const apiSuggestion = anime.episodes > 0 ? anime.episodes : null

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {/* Validation errors summary */}
      {Object.keys(errors).length > 0 && !error && (
        <div className="space-y-1 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          {errors.days && <p className="text-xs font-medium text-red-400">{errors.days.message}</p>}
          {errors.startDate && (
            <p className="text-xs font-medium text-red-400">{errors.startDate.message}</p>
          )}
          {errors.seasons && (
            <p className="text-xs font-medium text-red-400">
              {errors.seasons.message || errors.seasons.root?.message}
            </p>
          )}
        </div>
      )}

      {/* Start date */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-white/70">Data inicial</Label>
        <div className="relative">
          <Input
            className="border-white/10 bg-white/5 pl-14 text-white scheme-dark focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20"
            type="date"
            {...register('startDate')}
          />
          <Button
            aria-label="Definir data para hoje"
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-400 hover:bg-purple-500/25"
            onClick={() =>
              setValue('startDate', getLocalDateString(new Date()), { shouldValidate: true })
            }
            size="xs"
            type="button"
            variant="ghost"
          >
            Hoje
          </Button>
        </div>
        {errors.startDate && <p className="text-xs text-red-400">{errors.startDate.message}</p>}
      </div>

      {/* Available days */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-white/70">Dias disponíveis</Label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {DAYS.map((day) => (
            <Button
              className={`flex h-9 w-10 shrink-0 items-center justify-center rounded-lg border text-[11px] font-medium transition-all duration-200 sm:h-10 sm:w-12 sm:text-xs ${
                watchDays?.includes(day.value)
                  ? 'border-purple-500/50 bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/20'
                  : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
              key={day.value}
              onClick={() => toggleDay(day.value)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {day.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Episodes per day */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-white/70">
          Episódios por dia
          <span className="ml-1.5 text-xs font-normal text-white/30">
            (~{anime.duration || 24} min cada)
          </span>
        </Label>
        <Input
          className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20"
          max={MAX_EPISODES}
          min={MIN_EPISODES}
          placeholder="Ex: 3"
          step={1}
          type="number"
          {...register('episodesPerDay', { valueAsNumber: true })}
          onBlur={(e) => {
            const raw = e.target.value
            if (raw === '' || raw === '-' || raw === '0') {
              setValue('episodesPerDay', MIN_EPISODES, { shouldValidate: true })
              return
            }
            const val = parseInt(raw, 10)
            if (isNaN(val) || val < MIN_EPISODES) {
              setValue('episodesPerDay', MIN_EPISODES, { shouldValidate: true })
            } else if (val > MAX_EPISODES) {
              setValue('episodesPerDay', MAX_EPISODES, { shouldValidate: true })
            }
          }}
        />
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EPISODES.map((ep) => (
            <Button
              className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all ${
                !Number.isNaN(watchEpisodes) && watchEpisodes === ep
                  ? 'border-purple-500/50 bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/20'
                  : 'border-white/10 bg-white/5 text-white/40 hover:border-purple-500/30 hover:text-purple-400'
              }`}
              key={ep}
              onClick={() => setValue('episodesPerDay', ep, { shouldValidate: true })}
              size="xs"
              type="button"
              variant="ghost"
            >
              {ep} ep
            </Button>
          ))}
        </div>
        {errors.episodesPerDay && (
          <p className="text-xs text-red-400">{errors.episodesPerDay.message}</p>
        )}

        {/* Estimated time display */}
        {watchEpisodes > 0 && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="flex items-center gap-2 text-xs">
              <svg
                className="size-4 shrink-0 text-blue-400"
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
              <span className="text-blue-300">
                Assistindo{' '}
                <strong className="text-blue-200">
                  {watchEpisodes} episódio{watchEpisodes !== 1 ? 's' : ''}
                </strong>{' '}
                por dia de <strong className="text-blue-200">~{anime.duration || 24}min</strong>{' '}
                cada, você vai gastar aproximadamente{' '}
                <strong className="text-blue-200">
                  {formatEstimateMinutes(estimatedMinutesPerDay)}
                </strong>{' '}
                por dia
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Seasons hint */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
            <svg
              className="size-3 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-purple-300">Organize por temporadas</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-purple-300/60">
              As APIs de animes organizam os episódios por temporada, não pelo anime completo. Se o
              anime tem várias temporadas (ex: T1=12ep, T2=24ep), adicione cada uma separadamente
              para um cronograma mais preciso. Caso contrário, deixe apenas uma temporada com o
              total de episódios.
            </p>
          </div>
        </div>
      </div>

      {/* Seasons builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-white/70">Temporadas</Label>
          <div className="flex items-center gap-2">
            {apiSuggestion && (
              <Button
                className="rounded-md bg-purple-500/15 px-2 py-1 text-[10px] text-purple-400 hover:bg-purple-500/25"
                onClick={() => applyApiSuggestion()}
                size="xs"
                type="button"
                variant="ghost"
              >
                API: {apiSuggestion}ep
              </Button>
            )}
            <span className="text-xs text-white/40">
              Total: <strong className="text-purple-400">{totalEpisodes}</strong> eps
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {seasons.map((season, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/3 p-3 sm:flex-nowrap"
              exit={{ height: 0, opacity: 0 }}
              initial={{ opacity: 0, y: -10 }}
              key={index}
              layout
              transition={{ duration: 0.2 }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <span className="shrink-0 text-xs font-medium text-purple-400">{season.label}</span>
                <Input
                  className="h-8 w-16 border-white/10 bg-white/5 text-center text-white placeholder:text-white/30 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 sm:w-20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  min={1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val) && val > 0) updateSeason(index, 'episodeCount', val)
                  }}
                  placeholder="12"
                  type="number"
                  value={season.episodeCount || ''}
                />
                <span className="shrink-0 text-xs text-white/40">eps</span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  className="h-8 w-16 border-white/10 bg-white/5 text-center text-xs text-white/60 placeholder:text-white/20 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 sm:w-20"
                  onChange={(e) => updateSeason(index, 'label', e.target.value)}
                  placeholder="T1"
                  value={season.label}
                />

                {seasons.length > 1 && (
                  <Button
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs text-red-400/50 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => removeSeason(index)}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M6 18L18 6M6 6l12 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <Button
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 py-2 text-xs text-white/40 hover:border-purple-500/30 hover:text-purple-400"
          onClick={() => addSeason()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          Adicionar temporada
        </Button>

        <p className="text-xs text-white/30">
          Adicione quantas temporadas quiser. Ex: T1=12ep, T2=24ep, T3=12ep
        </p>
      </div>

      {/* Error */}
      {error && (
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
          initial={{ opacity: 0, y: -10 }}
        >
          {error}
        </motion.p>
      )}

      {/* Submit */}
      <Button
        className="relative w-full overflow-hidden bg-linear-to-r from-purple-600 to-blue-600 py-6 text-base font-semibold text-white transition-all duration-300 hover:from-purple-500 hover:to-blue-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
        disabled={isGenerating}
        type="submit"
      >
        {isGenerating ? (
          <span className="flex items-center gap-2">
            <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Gerando cronograma...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            Gerar cronograma
          </span>
        )}
      </Button>
    </form>
  )
}

function formatEstimateMinutes(mins: number): string {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
