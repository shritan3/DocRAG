import { generateText } from 'ai'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { evaluations } from '@/lib/db/schema'
import {
  buildContext,
  CHAT_MODEL,
  hybridSearch,
  RAG_INSTRUCTIONS,
} from '@/lib/rag'

export const maxDuration = 120

export async function GET() {
  const rows = await db
    .select()
    .from(evaluations)
    .orderBy(desc(evaluations.createdAt))
    .limit(20)
  return Response.json(rows)
}

export async function POST(req: Request) {
  const { documentId, question }: { documentId?: number; question?: string } =
    await req.json()

  if (!documentId || !question?.trim()) {
    return Response.json(
      { error: 'documentId and question are required' },
      { status: 400 },
    )
  }

  // Retrieve context for the RAG answer
  const retrieved = await hybridSearch(question, documentId, 6)
  const context = buildContext(retrieved)

  // Run both answers in parallel: with retrieval vs. without
  const [ragResult, noRagResult] = await Promise.all([
    generateText({
      model: CHAT_MODEL,
      instructions: `${RAG_INSTRUCTIONS}\n\nContext excerpts:\n\n${context}`,
      prompt: question,
    }),
    generateText({
      model: CHAT_MODEL,
      instructions:
        'Answer the question from your general knowledge only. Be concise. If you are unsure or the question refers to a specific document you cannot see, say so honestly.',
      prompt: question,
    }),
  ])

  const [saved] = await db
    .insert(evaluations)
    .values({
      documentId,
      question,
      ragAnswer: ragResult.text,
      noRagAnswer: noRagResult.text,
      retrievedChunks: retrieved,
    })
    .returning()

  return Response.json(saved)
}
