import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chunks, documents, evaluations } from '@/lib/db/schema'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const documentId = Number(id)
  if (!Number.isInteger(documentId)) {
    return Response.json({ error: 'Invalid document id' }, { status: 400 })
  }

  await db.delete(chunks).where(eq(chunks.documentId, documentId))
  await db.delete(evaluations).where(eq(evaluations.documentId, documentId))
  await db.delete(documents).where(eq(documents.id, documentId))

  return Response.json({ ok: true })
}
