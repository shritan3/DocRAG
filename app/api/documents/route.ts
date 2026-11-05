import { desc, eq } from 'drizzle-orm'
import { extractText, getDocumentProxy } from 'unpdf'
import { db } from '@/lib/db'
import { chunks, documents } from '@/lib/db/schema'
import { chunkPages, embedChunks } from '@/lib/rag'

export const maxDuration = 120

export async function GET() {
  const docs = await db
    .select()
    .from(documents)
    .orderBy(desc(documents.createdAt))
  return Response.json(docs)
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return Response.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }
    if (file.size > 15 * 1024 * 1024) {
      return Response.json({ error: 'File must be under 15MB' }, { status: 400 })
    }

    // 1. Parse the PDF into per-page text
    const buffer = new Uint8Array(await file.arrayBuffer())
    const pdf = await getDocumentProxy(buffer)
    const { text: pages, totalPages } = await extractText(pdf, {
      mergePages: false,
    })

    // 2. Chunk with overlap, preserving page numbers
    const textChunks = chunkPages(pages)
    if (textChunks.length === 0) {
      return Response.json(
        { error: 'No extractable text found in this PDF (it may be scanned images)' },
        { status: 400 },
      )
    }

    // 3. Create the document record
    const title = file.name.replace(/\.pdf$/i, '')
    const [doc] = await db
      .insert(documents)
      .values({
        title,
        filename: file.name,
        pageCount: totalPages,
        chunkCount: textChunks.length,
        status: 'processing',
      })
      .returning()

    // 4. Embed all chunks in batches
    const embeddings = await embedChunks(textChunks.map((c) => c.content))

    // 5. Insert chunks with embeddings
    const rows = textChunks.map((c, i) => ({
      documentId: doc.id,
      chunkIndex: c.chunkIndex,
      pageNumber: c.pageNumber,
      content: c.content,
      embedding: embeddings[i],
    }))
    const INSERT_BATCH = 50
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      await db.insert(chunks).values(rows.slice(i, i + INSERT_BATCH))
    }

    // 6. Mark ready
    const [ready] = await db
      .update(documents)
      .set({ status: 'ready' })
      .where(eq(documents.id, doc.id))
      .returning()

    return Response.json(ready)
  } catch (error) {
    console.error('[v0] Document ingestion failed:', error)
    const raw = error instanceof Error ? error.message : ''
    const message =
      raw.includes('API key') || raw.includes('API_KEY') || raw.includes('401') || raw.includes('403')
        ? 'Google API key is missing or invalid. Add GOOGLE_GENERATIVE_AI_API_KEY (free from aistudio.google.com) and retry.'
        : 'Failed to process the PDF. Please try another file.'
    return Response.json({ error: message }, { status: 500 })
  }
}
