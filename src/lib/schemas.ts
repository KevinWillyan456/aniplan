import { z } from 'zod'

const MIN_EPISODES_PER_DAY = 1
const MAX_EPISODES_PER_DAY = 60

export const seasonSchema = z.object({
  episodeCount: z.number().min(1, 'Deve ter pelo menos 1 episódio'),
  label: z.string().min(1, 'O label é obrigatório'),
  number: z.number().min(1),
})

export const routineFormSchema = z.object({
  days: z.array(z.number()).min(1, 'Selecione pelo menos um dia da semana'),
  episodesPerDay: z
    .number()
    .int('Deve ser um número inteiro')
    .min(MIN_EPISODES_PER_DAY, `Mínimo de ${MIN_EPISODES_PER_DAY} episódio`)
    .max(MAX_EPISODES_PER_DAY, `Máximo de ${MAX_EPISODES_PER_DAY} episódios`),
  seasons: z
    .array(seasonSchema)
    .min(1, 'Adicione pelo menos uma temporada')
    .refine(
      (seasons) => seasons.every((s) => s.episodeCount > 0),
      'Todas as temporadas precisam ter pelo menos 1 episódio',
    ),
  startDate: z.string().min(1, 'Selecione uma data inicial'),
})

export type RoutineFormValues = z.infer<typeof routineFormSchema>
