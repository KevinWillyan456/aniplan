'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

const SPLASH_KEY = '@aniplan/splash-seen'

/**
 * Dispara evento global para reexibir a splash screen.
 * Botão discreto no footer da home chama esta função.
 */
export function triggerSplashReplay() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aniplan:replay-splash'))
  }
}

// ── Etapas do tour ──────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    description: 'Pesquise, encontre e adicione sem esforço. Sua lista cresce com poucos cliques.',
    icon: (
      <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </svg>
    ),
    title: '🔍 Busque seu anime',
  },
  {
    description: 'Defina dias, episódios e temporadas do seu jeito. Sua rotina, suas regras.',
    icon: (
      <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </svg>
    ),
    title: '⚙️ Configure sua rotina',
  },
  {
    description:
      'Saiba exatamente quando cada temporada termina. Um cronograma que cabe na sua rotina.',
    icon: (
      <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </svg>
    ),
    title: '📋 Cronograma inteligente',
  },
  {
    description: 'Cada episódio conta. Visualize seu avanço e celebre cada conquista.',
    icon: (
      <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </svg>
    ),
    title: '✅ Acompanhe seu progresso',
  },
]

const TOTAL_STEPS = 1 + TOUR_STEPS.length + 1 // logo + 4 tour + ending = 6

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'exiting' | 'hidden' | 'loading' | 'visible'>('loading')
  const [step, setStep] = useState(0) // 0 = logo, 1-4 = tour, 5 = benefits
  const [showSkip, setShowSkip] = useState(false)
  const skipTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hidingRef = useRef(false)

  // ── Mostrar splash ────────────────────────────────────────────────
  const showSplash = useCallback(() => {
    clearTimeout(hideTimerRef.current)
    hidingRef.current = false
    setShowSkip(false)
    setStep(0)
    setPhase('visible')

    // Botão "Pular" após 1.5s (mais rápido para não prender)
    skipTimerRef.current = setTimeout(() => setShowSkip(true), 1500)
  }, [])

  // ── Esconder splash ───────────────────────────────────────────────
  const hideSplash = useCallback(() => {
    if (hidingRef.current) return
    hidingRef.current = true
    clearTimeout(skipTimerRef.current)
    setShowSkip(false)
    setPhase('exiting')
    hideTimerRef.current = setTimeout(() => {
      setPhase('hidden')
      hidingRef.current = false
    }, 800)
  }, [])

  // ── Replay (via footer) ───────────────────────────────────────────
  const handleReplayEvent = useCallback(() => {
    localStorage.removeItem(SPLASH_KEY)
    showSplash()
  }, [showSplash])

  // ── Primeira visita ───────────────────────────────────────────────
  useEffect(() => {
    const alreadySeen = localStorage.getItem(SPLASH_KEY)
    if (!alreadySeen) {
      localStorage.setItem(SPLASH_KEY, 'true')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      showSplash()
    } else {
      setPhase('hidden')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Evento de replay ──────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener('aniplan:replay-splash', handleReplayEvent)
    return () => window.removeEventListener('aniplan:replay-splash', handleReplayEvent)
  }, [handleReplayEvent])

  // ── Escape pula ───────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase === 'visible') {
        hideSplash()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, hideSplash])

  // ── Limpar timers na desmontagem ──────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(skipTimerRef.current)
      clearTimeout(hideTimerRef.current)
    }
  }, [])

  // ── Bloquear scroll durante a splash ──────────────────────────────
  useEffect(() => {
    if (phase === 'visible') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [phase])

  // Avança ou finaliza dependendo do step atual
  const handleAdvance = useCallback(() => {
    if (step >= TOTAL_STEPS - 1) {
      // Está na tela final (step 5) → finaliza
      hideSplash()
    } else {
      setStep((prev) => prev + 1)
    }
  }, [step, hideSplash])

  // Tecla seta direita também avança
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' && phase === 'visible') {
        handleAdvance()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, handleAdvance])

  const showLogo = step === 0
  const showTour = step >= 1 && step <= TOUR_STEPS.length
  const showBenefitsPhase = step >= TOUR_STEPS.length + 1

  const tourIndex = showTour ? step - 1 : 0

  // Texto do botão de ação
  let actionLabel = 'Continuar →'
  if (step >= TOTAL_STEPS - 1) {
    actionLabel = 'Começar 🚀'
  } else if (step > 0) {
    actionLabel = 'Próximo →'
  }

  if (phase === 'loading') return null

  return (
    <>
      <AnimatePresence>
        {phase !== 'hidden' && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-hidden bg-[#0a0a1a]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="splash"
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Partículas decorativas */}
            <motion.div
              animate={{ rotate: 360 }}
              className="pointer-events-none absolute inset-0"
              style={{ transformStyle: 'preserve-3d' }}
              transition={{ duration: 60, ease: 'linear', repeat: Infinity }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  animate={{
                    opacity: [0.15, 0.4, 0.15],
                    scale: [1, 1.2, 1],
                  }}
                  className="absolute rounded-full bg-purple-500/20 blur-xl"
                  key={i}
                  style={{
                    height: `${40 + i * 20}px`,
                    left: `${15 + i * 14}%`,
                    top: `${10 + i * 12}%`,
                    width: `${40 + i * 20}px`,
                  }}
                  transition={{
                    delay: i * 0.3,
                    duration: 3 + i,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }}
                />
              ))}
            </motion.div>

            {/* Gradientes de fundo */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_60%)]" />

            {/* Step indicator (bolinhas no topo) */}
            <div className="pointer-events-none absolute top-8 flex gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <motion.div
                  animate={i <= step ? { opacity: 1, scale: 1 } : { opacity: 0.2, scale: 0.8 }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-8 bg-purple-500'
                      : i < step
                        ? 'w-2 bg-purple-500/40'
                        : 'w-2 bg-white/10'
                  }`}
                  key={i}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>

            {/* ── FASE: Logo ── */}
            <AnimatePresence mode="wait">
              {showLogo && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="relative flex flex-col items-center gap-6"
                  exit={{ opacity: 0, scale: 0.95, y: -30 }}
                  initial={{ opacity: 0, y: 30 }}
                  key="logo-phase"
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Logo */}
                  <motion.div
                    animate={{
                      opacity: 1,
                      scale: 1,
                      transition: { delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] },
                    }}
                    className="relative"
                    initial={{ opacity: 0, scale: 0.3 }}
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(139,92,246,0.2)',
                          '0 0 80px rgba(139,92,246,0.5)',
                          '0 0 20px rgba(139,92,246,0.2)',
                        ],
                      }}
                      className="flex size-28 items-center justify-center rounded-2xl bg-linear-to-br from-purple-600 to-blue-600 text-5xl font-extrabold text-white shadow-2xl"
                      transition={{
                        delay: 0.3,
                        duration: 2.5,
                        ease: 'easeInOut',
                        repeat: Infinity,
                      }}
                    >
                      A
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 ring-inset" />
                    </motion.div>
                  </motion.div>

                  <motion.div
                    animate={{
                      opacity: 1,
                      transition: { delay: 1.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                      y: 0,
                    }}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                  >
                    <h1 className="bg-linear-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                      AniPlan
                    </h1>
                  </motion.div>

                  {/* Taglines */}
                  <motion.div className="flex flex-col items-center gap-1">
                    {[
                      'Junte todos os animes que você planeja ver',
                      'em um só lugar.',
                      'Nada de deixar animes para trás.',
                    ].map((line, i) => (
                      <motion.p
                        animate={{
                          opacity: 1,
                          transition: { delay: 2.5 + i * 0.6, duration: 0.6 },
                          y: 0,
                        }}
                        className="text-sm text-white/40"
                        initial={{ opacity: 0, y: 8 }}
                        key={line}
                      >
                        {line}
                      </motion.p>
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {/* ── FASE: Tour ── */}
              {showTour && (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="relative flex flex-col items-center gap-8 px-6"
                  exit={{ opacity: 0, x: -40 }}
                  initial={{ opacity: 0, x: 40 }}
                  key={`step-${step}`}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Ícone com fundo glow */}
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    className="flex size-20 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400"
                    transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                  >
                    {TOUR_STEPS[tourIndex].icon}
                  </motion.div>

                  {/* Título */}
                  <motion.h2
                    animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.5 }, y: 0 }}
                    className="text-center text-2xl font-bold text-white"
                    initial={{ opacity: 0, y: 15 }}
                  >
                    {TOUR_STEPS[tourIndex].title}
                  </motion.h2>

                  {/* Descrição */}
                  <motion.p
                    animate={{ opacity: 1, transition: { delay: 0.3, duration: 0.5 }, y: 0 }}
                    className="max-w-xs text-center text-base text-white/50"
                    initial={{ opacity: 0, y: 15 }}
                  >
                    {TOUR_STEPS[tourIndex].description}
                  </motion.p>
                </motion.div>
              )}

              {/* ── FASE: Final (conclusão) ── */}
              {showBenefitsPhase && (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative flex flex-col items-center gap-8 px-6"
                  exit={{ opacity: 0, scale: 0.9 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  key="ending-phase"
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Círculo com checkmark animado */}
                  <div className="relative flex size-32 items-center justify-center">
                    {/* Círculo de fundo */}
                    <svg className="absolute inset-0 size-32 -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        fill="none"
                        r="52"
                        stroke="rgba(139,92,246,0.08)"
                        strokeWidth="4"
                      />
                      <motion.circle
                        animate={{ pathLength: 1 }}
                        cx="60"
                        cy="60"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        r="52"
                        stroke="url(#purple-blue-gradient)"
                        strokeLinecap="round"
                        strokeWidth="4"
                        transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                      />
                      <defs>
                        <linearGradient
                          id="purple-blue-gradient"
                          x1="0%"
                          x2="100%"
                          y1="0%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Checkmark */}
                    <motion.svg
                      animate={{ pathLength: 1 }}
                      className="relative z-10 size-12 text-purple-400"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      stroke="currentColor"
                      transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      viewBox="0 0 24 24"
                    >
                      <motion.path
                        animate={{ pathLength: 1 }}
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </motion.svg>

                    {/* Glow pulsante atrás */}
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 30px rgba(139,92,246,0.15)',
                          '0 0 60px rgba(139,92,246,0.3)',
                          '0 0 30px rgba(139,92,246,0.15)',
                        ],
                        scale: [1, 1.1, 1],
                      }}
                      className="absolute inset-0 rounded-full"
                      transition={{
                        delay: 1.5,
                        duration: 2.5,
                        ease: 'easeInOut',
                        repeat: Infinity,
                      }}
                    />
                  </div>

                  {/* Título */}
                  <motion.div className="flex flex-col items-center gap-1.5">
                    <motion.h2
                      animate={{ opacity: 1, transition: { delay: 1.2, duration: 0.5 }, y: 0 }}
                      className="text-center text-2xl font-bold text-white"
                      initial={{ opacity: 0, y: 15 }}
                    >
                      Pronto para{' '}
                      <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        maratonar
                      </span>
                      ?
                    </motion.h2>

                    <motion.p
                      animate={{ opacity: 1, transition: { delay: 1.4, duration: 0.5 }, y: 0 }}
                      className="text-center text-sm text-white/40"
                      initial={{ opacity: 0, y: 10 }}
                    >
                      Sua jornada começa agora
                    </motion.p>
                  </motion.div>

                  {/* Mini-estatística flutuante */}
                  <motion.div
                    animate={{ opacity: 1, transition: { delay: 1.6, duration: 0.5 }, y: 0 }}
                    className="flex items-center gap-3 rounded-full border border-white/6 bg-white/3 px-4 py-2"
                    initial={{ opacity: 0, y: 15 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-emerald-400/60" />
                      <span className="text-xs text-white/40">Tudo pronto</span>
                    </div>
                    <span className="text-white/8">·</span>
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-purple-400/60" />
                      <span className="text-xs text-white/40">Sem pressão</span>
                    </div>
                    <span className="text-white/8">·</span>
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-blue-400/60" />
                      <span className="text-xs text-white/40">No seu ritmo</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Botão de ação (Continuar / Próximo / Começar) ── */}
            <AnimatePresence>
              {phase === 'visible' && (
                <motion.button
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-12 cursor-pointer rounded-full border border-purple-500/30 bg-purple-600/20 px-8 py-3 text-sm font-semibold text-purple-300 shadow-lg shadow-purple-500/10 backdrop-blur-sm transition-all duration-200 hover:border-purple-500/50 hover:bg-purple-600/30 hover:text-purple-200 hover:shadow-purple-500/20 active:scale-95"
                  exit={{ opacity: 0, y: 20 }}
                  initial={{ opacity: 0, y: 20 }}
                  key="action-btn"
                  onClick={handleAdvance}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {actionLabel}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Skip button (quando disponível) */}
            <AnimatePresence>
              {showSkip && phase === 'visible' && (
                <motion.button
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-6 right-6 cursor-pointer rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-medium text-white/40 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white/70"
                  exit={{ opacity: 0, y: -10 }}
                  initial={{ opacity: 0, y: -10 }}
                  key="skip-btn"
                  onClick={hideSplash}
                  transition={{ duration: 0.3 }}
                >
                  Pular ✕
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <motion.div
        animate={{ opacity: 1 }}
        className="min-h-screen"
        initial={phase === 'hidden' ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </>
  )
}
