import { strapiFetch } from "@/lib/strapi/client"

export type InvestorDocument = {
  id: string
  title: string
  category: string
  fileType: string
  fileSize: string
  url: string
  uploadedAt: string
}

type StrapiMediaFile = {
  url: string
  size: number // KB
}

type StrapiDocument = {
  documentId: string
  title: string
  category: string
  fileType: string
  createdAt: string
  file: StrapiMediaFile | null
}

const STRAPI_URL = process.env.STRAPI_URL

function formatFileSize(sizeInKb: number): string {
  if (sizeInKb < 1024) return `${Math.round(sizeInKb)} KB`
  return `${(sizeInKb / 1024).toFixed(1)} MB`
}

function toAbsoluteUrl(url: string): string {
  return url.startsWith("http") ? url : `${STRAPI_URL}${url}`
}

function mapDocument(doc: StrapiDocument): InvestorDocument {
  return {
    id: doc.documentId,
    title: doc.title,
    category: doc.category,
    // Strapi stores this as an uppercase enum (PDF, PPT, ...) — lowercase it
    // to match the icon lookup keys in components/document-list.tsx.
    fileType: doc.fileType.toLowerCase(),
    fileSize: doc.file ? formatFileSize(doc.file.size) : "",
    url: doc.file ? toAbsoluteUrl(doc.file.url) : "#",
    // uploadedAt was a redundant custom field — Strapi already tracks this
    // via its automatic createdAt timestamp.
    uploadedAt: doc.createdAt,
  }
}

export async function getDocuments(): Promise<InvestorDocument[]> {
  const documents = await strapiFetch<StrapiDocument[]>("/documents?populate=file")
  return documents.map(mapDocument)
}

// Resources are meant to be attachments on news/blog posts (see AGENTS.md
// TODO) rather than this Document content-type. That relation doesn't exist
// yet, so this stays an empty gap until it's designed.
export async function getResourceDocuments(): Promise<InvestorDocument[]> {
  return []
}
