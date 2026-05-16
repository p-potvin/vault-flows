import type { Flow, ExecutionResult } from '../nodes/types'
import { runFlow as apiRunFlow } from '../api/client'

// ---------------------------------------------------------------------------
// runFlow — UI entry point for the execute button
// ---------------------------------------------------------------------------

export async function runFlow(flow: Flow): Promise<ExecutionResult[]> {
  try {
    return await apiRunFlow(flow)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)

    // Wrap the error so the UI receives a well-typed result array regardless
    const errorResult: ExecutionResult = {
      nodeId: '__runner__',
      output: '',
      error: message,
    }

    return [errorResult]
  }
}
