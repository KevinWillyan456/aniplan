'use client'

import { RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0a0a1a] p-4">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Error Icon */}
        <div className="flex size-20 items-center justify-center rounded-full bg-red-500/10">
          <svg
            className="size-10 text-red-400"
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

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Algo deu errado</h1>
          <p className="max-w-md text-sm text-white/50 md:text-base">
            Ocorreu um erro inesperado ao carregar esta página. Tente novamente ou volte para o
            início.
          </p>
          {error.digest && (
            <p className="mt-4 text-xs text-white/30">
              Código do erro: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            className="bg-linear-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
            disabled={isPending}
            onClick={() => startTransition(() => reset())}
          >
            <RefreshCw className={cn('mr-1.5 size-3.5', isPending && 'animate-spin')} />
            {isPending ? 'Recarregando...' : 'Tentar novamente'}
          </Button>
          <Button
            asChild
            className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            variant="outline"
          >
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
