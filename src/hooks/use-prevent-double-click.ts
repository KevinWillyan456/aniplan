'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * Hook que protege contra múltiplas execuções simultâneas de uma ação.
 * Retorna um `submit` que ignora chamadas enquanto estiver ocupado,
 * e um booleano `submitting` pra desabilitar o botão visualmente.
 *
 * Inclui um cooldown de 500ms após a ação para evitar reentrada
 * durante navegações (router.push) que mantêm o componente montado
 * enquanto a transição ocorre.
 *
 * @example
 * ```tsx
 * function MeuComponente() {
 *   const { submit, submitting } = usePreventDoubleClick()
 *
 *   async function handleSave() {
 *     await submit(async () => {
 *       await salvarNoBackend(data)
 *     })
 *   }
 *
 *   return (
 *     <button disabled={submitting} onClick={handleSave}>
 *       {submitting ? 'Salvando...' : 'Salvar'}
 *     </button>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Uso síncrono (localStorage)
 * function handleDelete() {
 *   submit(() => {
 *     deleteAnimePlan(id)
 *     router.push('/')
 *   })
 * }
 * ```
 */
export function usePreventDoubleClick() {
  const busyRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Limpa o timer se o componente desmontar
  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const submit = useCallback(async <T>(fn: () => Promise<T> | T): Promise<T | undefined> => {
    if (busyRef.current) return undefined
    busyRef.current = true
    // flushSync força o React a renderizar o botão como desabilitado
    // ANTES da ação síncrona rodar. Sem isso, React agrupa os estados
    // `true → false` e o botão nunca fica visualmente desabilitado
    // quando a ação é síncrona (ex: localStorage).
    flushSync(() => setSubmitting(true))

    try {
      return await Promise.resolve(fn())
    } finally {
      // Cooldown de 150ms para evitar reentrada durante navegações.
      // O router.push() não desmonta o componente imediatamente,
      // então sem este delay o finally limparia o estado e
      // permitiria um segundo clique antes da navegação completar.
      timerRef.current = setTimeout(() => {
        busyRef.current = false
        setSubmitting(false)
      }, 150)
    }
  }, [])

  return { submit, submitting }
}
