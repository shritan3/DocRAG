import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  vector,
} from 'drizzle-orm/pg-core'

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  filename: text('filename').notNull(),
  pageCount: integer('page_count').notNull().default(0),
  chunkCount: integer('chunk_count').notNull().default(0),
  status: text('status').notNull().default('processing'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const chunks = pgTable('chunks', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  pageNumber: integer('page_number').notNull().default(1),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const evaluations = pgTable('evaluations', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull(),
  question: text('question').notNull(),
  ragAnswer: text('rag_answer').notNull(),
  noRagAnswer: text('no_rag_answer').notNull(),
  retrievedChunks: jsonb('retrieved_chunks').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Document = typeof documents.$inferSelect
export type Chunk = typeof chunks.$inferSelect
export type Evaluation = typeof evaluations.$inferSelect
