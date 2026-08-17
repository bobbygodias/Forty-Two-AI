// Forty-Two AI brand copy.
//
// Keep these references sparse. They are an easter-egg layer, never a
// replacement for precise diagnostics or destructive-action warnings.
export const FORTY_TWO_LORE = {
  dontPanic: 'NÃO ENTRE EM PÂNICO',
  mostlyHarmless: 'Majoritariamente inofensivo',
  thanksForAllTheFish: 'E obrigado pelos peixes.',
  answer: 42,
} as const;

export type FortyTwoLoreKey = keyof typeof FORTY_TWO_LORE;
