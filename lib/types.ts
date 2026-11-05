import type { UIMessage } from 'ai'

export interface SourceChunk {
  id: number
  content: string
  pageNumber: number
  chunkIndex: number
  vectorScore: number | null
  keywordScore: number | null
  rrfScore: number
}

export type RagUIMessage = UIMessage<
  never,
  {
    sources: {
      sources: SourceChunk[]
    }
  }
>

export interface DocumentInfo {
  id: number
  title: string
  filename: string
  pageCount: number
  chunkCount: number
  status: string
  createdAt: string
}

export interface EvaluationResult {
  id: number
  documentId: number
  question: string
  ragAnswer: string
  noRagAnswer: string
  retrievedChunks: SourceChunk[]
  createdAt: string
}
