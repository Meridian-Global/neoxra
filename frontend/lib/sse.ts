export interface SSEEvent {
  event: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

export interface StreamSSEOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * Consumes a POST SSE stream via fetch + ReadableStream.
 * Use instead of EventSource because EventSource only supports GET.
 *
 * Yields parsed { event, data } objects as the stream arrives.
 */
export async function* streamSSE(
  url: string,
  body: unknown,
  signalOrOptions?: AbortSignal | StreamSSEOptions
): AsyncGenerator<SSEEvent> {
  const options =
    signalOrOptions instanceof AbortSignal
      ? { signal: signalOrOptions, timeoutMs: 45_000 }
      : { signal: signalOrOptions?.signal, timeoutMs: signalOrOptions?.timeoutMs ?? 45_000 }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  if (!res.body) {
    throw new Error('No response body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  async function readWithTimeout() {
    let timeoutId: number | undefined

    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error('Stream timed out before completion.'))
          }, options.timeoutMs)
        }),
      ])
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }

  while (true) {
    const { done, value } = await readWithTimeout()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // SSE messages are separated by a blank line (\n\n)
    const messages = buffer.split('\n\n')
    buffer = messages.pop() ?? '' // keep the incomplete trailing chunk

    for (const msg of messages) {
      if (!msg.trim()) continue

      let event = ''
      let data = ''

      for (const line of msg.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim()
        else if (line.startsWith('data: ')) data = line.slice(6).trim()
      }

      if (event && data) {
        try {
          yield { event, data: JSON.parse(data) }
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}
