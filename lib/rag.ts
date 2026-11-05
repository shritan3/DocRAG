import { google, type GoogleEmbeddingModelOptions } from '@ai-sdk/google'
import { embed, embedMany } from 'ai'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

// Google Gemini latest models (free tier, no credit card needed).
// gemini-embedding-2 outputs 1536 dims to match the vector(1536) column.
export const EMBEDDING_MODEL = google.embedding('gemini-embedding-2')
export const CHAT_MODEL = google('gemini-3.5-flash')
export const EMBEDDING_DIMENSIONS = 1536

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

export interface TextChunk {
  content: string
  pageNumber: number
  chunkIndex: number
}

export interface RetrievedChunk {
  id: number
  content: string
  pageNumber: number
  chunkIndex: number
  vectorScore: number | null
  keywordScore: number | null
  rrfScore: number
}

/**
 * Split page texts into overlapping chunks, preferring sentence boundaries.
 * Overlap preserves context that would otherwise be lost at chunk edges.
 */
export function chunkPages(pages: string[]): TextChunk[] {
  const chunks: TextChunk[] = []
  let chunkIndex = 0

  pages.forEach((pageText, pageIdx) => {
    const text = pageText.replace(/\s+/g, ' ').trim()
    if (!text) return

    let start = 0
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length)

      // Prefer breaking at a sentence boundary within the last 200 chars
      if (end < text.length) {
        const window = text.slice(Math.max(start, end - 200), end)
        const lastPeriod = window.lastIndexOf('. ')
        if (lastPeriod > 0) {
          end = Math.max(start, end - 200) + lastPeriod + 1
        }
      }

      const content = text.slice(start, end).trim()
      if (content.length > 20) {
        chunks.push({ content, pageNumber: pageIdx + 1, chunkIndex })
        chunkIndex++
      }

      if (end >= text.length) break
      start = end - CHUNK_OVERLAP
    }
  })

  return chunks
}

/** Batch-embed chunk contents. Order is preserved. */
export async function embedChunks(contents: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = []
  // Embed in batches to stay under provider limits
  const BATCH = 100
  for (let i = 0; i < contents.length; i += BATCH) {
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: contents.slice(i, i + BATCH),
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: 'RETRIEVAL_DOCUMENT',
        } satisfies GoogleEmbeddingModelOptions,
      },
    })
    allEmbeddings.push(...embeddings)
  }
  return allEmbeddings
}

/**
 * Hybrid search: vector similarity (semantic) + full-text search (keyword),
 * fused with Reciprocal Rank Fusion (RRF). Returns top K chunks.
 */
export async function hybridSearch(
  query: string,
  documentId: number,
  topK = 6,
): Promise<RetrievedChunk[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: query,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: 'RETRIEVAL_QUERY',
      } satisfies GoogleEmbeddingModelOptions,
    },
  })
  const embStr = `[${embedding.join(',')}]`

  const [vectorRes, keywordRes] = await Promise.all([
    db.execute(sql`
      SELECT id, content, page_number, chunk_index,
             1 - (embedding <=> ${embStr}::vector) AS score
      FROM chunks
      WHERE document_id = ${documentId} AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embStr}::vector
      LIMIT 12
    `),
    db.execute(sql`
      SELECT id, content, page_number, chunk_index,
             ts_rank(content_tsv, plainto_tsquery('english', ${query})) AS score
      FROM chunks
      WHERE document_id = ${documentId}
        AND content_tsv @@ plainto_tsquery('english', ${query})
      ORDER BY score DESC
      LIMIT 12
    `),
  ])

  type Row = {
    id: number
    content: string
    page_number: number
    chunk_index: number
    score: string | number
  }

  const vectorRows = vectorRes.rows as unknown as Row[]
  const keywordRows = keywordRes.rows as unknown as Row[]

  // Reciprocal Rank Fusion: score = sum over lists of 1 / (k + rank)
  const K = 60
  const fused = new Map<number, RetrievedChunk>()

  vectorRows.forEach((row, rank) => {
    fused.set(row.id, {
      id: row.id,
      content: row.content,
      pageNumber: row.page_number,
      chunkIndex: row.chunk_index,
      vectorScore: Number(row.score),
      keywordScore: null,
      rrfScore: 1 / (K + rank + 1),
    })
  })

  keywordRows.forEach((row, rank) => {
    const existing = fused.get(row.id)
    if (existing) {
      existing.keywordScore = Number(row.score)
      existing.rrfScore += 1 / (K + rank + 1)
    } else {
      fused.set(row.id, {
        id: row.id,
        content: row.content,
        pageNumber: row.page_number,
        chunkIndex: row.chunk_index,
        vectorScore: null,
        keywordScore: Number(row.score),
        rrfScore: 1 / (K + rank + 1),
      })
    }
  })

  return Array.from(fused.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK)
}

/** Build the numbered context block the model cites from. */
export function buildContext(retrieved: RetrievedChunk[]): string {
  return retrieved
    .map(
      (c, i) =>
        `[${i + 1}] (page ${c.pageNumber})\n${c.content}`,
    )
    .join('\n\n---\n\n')
}

export const RAG_INSTRUCTIONS = `You are a document assistant. Answer the user's question using ONLY the numbered context excerpts provided below. Rules:
- Cite every claim with the excerpt number in square brackets, e.g. [1] or [2][3].
- If the context does not contain the answer, say "I could not find this in the document." Do not invent information.
- Be concise and direct. Use the page numbers when helpful.`
