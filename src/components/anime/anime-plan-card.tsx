'use client'

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import type { AnimePlan } from '@/types/anime'

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

import { ProgressBar } from './progress-bar'

interface AnimePlanCardProps {
  onDelete?: (id: string) => void
  plan: AnimePlan
}

export function AnimePlanCard({ onDelete, plan }: AnimePlanCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const totalEpisodes = plan.totalEpisodes ?? plan.anime.episodes
  const watchedCount = plan.watchedEpisodes.length
  const seasonsCount = plan.seasons?.length ?? 1
  // Calculate remaining days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastScheduleDate =
    plan.schedule.length > 0 ? parseISO(plan.schedule[plan.schedule.length - 1].date) : today
  const remainingDays = Math.max(
    0,
    Math.ceil((lastScheduleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  )

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteDialogOpen(true)
  }

  function handleConfirmDelete() {
    onDelete?.(plan.id)
    setDeleteDialogOpen(false)
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-200 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10">
      <Link href={`/anime/${plan.id}`}>
        <div className="flex gap-3 overflow-hidden p-4 sm:gap-4">
          {/* Image */}
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg sm:size-20 lg:size-24">
            <Image
              alt={plan.anime.title}
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              fill
              sizes="(max-width: 640px) 64px, (max-width: 1024px) 80px, 96px"
              src={plan.anime.image}
            />
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold wrap-break-word text-white sm:line-clamp-none sm:text-base">
              {plan.anime.title}
            </h3>

            <div className="flex flex-wrap gap-1.5">
              <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-400" variant="outline">
                {totalEpisodes} episódios
              </Badge>
              {seasonsCount > 1 && (
                <Badge
                  className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                  variant="outline"
                >
                  {seasonsCount} temporadas
                </Badge>
              )}
              {remainingDays > 0 && (
                <Badge
                  className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                  variant="outline"
                >
                  {remainingDays} dias restantes
                </Badge>
              )}
              {remainingDays === 0 && (
                <Badge
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  variant="outline"
                >
                  Finalizado!
                </Badge>
              )}
            </div>

            {/* Progress */}
            <ProgressBar current={watchedCount} size="sm" total={totalEpisodes} />

            <p className="text-xs text-white/40">
              Criado em {format(parseISO(plan.createdAt), "dd 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        </div>
      </Link>

      {/* Delete button - visible on hover (desktop) and always visible on mobile */}
      {onDelete && (
        <>
          <Button
            className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400/60 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 max-sm:opacity-100"
            onClick={handleDeleteClick}
            size="icon-xs"
            title="Excluir maratona"
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
          </Button>

          <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
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
                  <strong className="text-white/80">{plan.anime.title}</strong>? Esta ação não pode
                  ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/6 bg-white/3 text-white/60 hover:bg-white/6 hover:text-white">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={handleConfirmDelete}
                  variant="destructive"
                >
                  Sim, excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Hover gradient */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-purple-500/0 via-purple-500/0 to-blue-500/0 transition-all duration-300 group-hover:from-purple-500/5 group-hover:via-transparent group-hover:to-blue-500/5" />
    </div>
  )
}
