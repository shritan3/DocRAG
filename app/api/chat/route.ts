import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from 'ai'
import {
  buildContext,
  CHAT_MODEL,
  hybridSearch,
  RAG_INSTRUCTIONS,
} from '@/lib/rag'
import type { RagUIMessage } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: Request) {
  const {
    messages,
    documentId,
  }: { messages: RagUIMessage[]; documentId?: number } = await req.json()

  if (!documentId) {
    return Response.json({ error: 'No document selected' }, { status: 400 })
  }

  // Extract the latest user question for retrieval
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const question =
    lastUser?.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join(' ') ?? ''

  // Hybrid retrieval: vector + keyword, fused with RRF
  const retrieved = await hybridSearch(question, documentId, 6)
  const context = buildContext(retrieved)

  const stream = createUIMessageStream<RagUIMessage>({
    execute: async ({ writer }) => {
      // Send the retrieved sources to the client before the answer streams
      writer.write({
        type: 'data-sources',
        data: { sources: retrieved },
      })

      const result = streamText({
        model: CHAT_MODEL,
        instructions: `${RAG_INSTRUCTIONS}\n\nContext excerpts:\n\n${context}`,
        messages: await convertToModelMessages(messages),
      })

      writer.merge(toUIMessageStream({ stream: result.stream }))
    },
  })

  return createUIMessageStreamResponse({ stream })
}
