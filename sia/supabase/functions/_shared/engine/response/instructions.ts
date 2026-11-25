import type { InstructionRecord } from '../types.ts'

export interface InstructionEffects {
  /** Never state that something is "in stock"; say it is "listed" and ask the customer to confirm. */
  stockCaution: boolean
  /** Explain the delivery policy before handling an order. */
  deliveryBeforeOrder: boolean
  applied: string[]
  /** Saved by the owner but not interpretable by the deterministic engine yet. */
  recorded: string[]
}

/**
 * The engine is deterministic, so it can only honour instructions it recognises.
 * Everything else is reported as "recorded" rather than silently pretended to be applied.
 */
export function interpretInstructions(instructions: InstructionRecord[]): InstructionEffects {
  const fx: InstructionEffects = { stockCaution: false, deliveryBeforeOrder: false, applied: [], recorded: [] }
  for (const { instruction } of instructions) {
    const t = instruction.toLowerCase()
    if (/(never|don't|do not).*(promise|guarantee).*(stock|availab)/.test(t) || /without checking (the )?(inventory|stock)/.test(t)) {
      fx.stockCaution = true
      fx.applied.push(instruction)
    } else if (/explain.*delivery.*(before|prior)/.test(t)) {
      fx.deliveryBeforeOrder = true
      fx.applied.push(instruction)
    } else if (/(do not|don't|never).*(claim|say|state).*(confirm|booked|reserved)/.test(t)) {
      fx.applied.push(instruction) // already enforced for everyone
    } else {
      fx.recorded.push(instruction)
    }
  }
  return fx
}
