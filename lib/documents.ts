import { strapiFetch } from "@/lib/strapi/client"
import { formatFileSize } from "@/lib/strapi/media"
import { getResources } from "@/lib/resources"

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

function mapDocument(doc: StrapiDocument): InvestorDocument {
  return {
    id: doc.documentId,
    title: doc.title,
    category: doc.category,
    // Strapi stores this as an uppercase enum (PDF, PPT, ...) — lowercase it
    // to match the icon lookup keys in components/document-list.tsx.
    fileType: doc.fileType.toLowerCase(),
    fileSize: doc.file ? formatFileSize(doc.file.size) : "",
    url: doc.file ? `/api/documents/${doc.documentId}/download` : "#",
    // uploadedAt was a redundant custom field — Strapi already tracks this
    // via its automatic createdAt timestamp.
    uploadedAt: doc.createdAt,
  }
}

export async function getDocuments(): Promise<InvestorDocument[]> {
  const documents = await strapiFetch<StrapiDocument[]>("/documents?populate=file")
  return documents.map(mapDocument)
}

// Resource is a shared/global content-type (no account relation) — every
// logged-in investor sees the same list here, not just resources attached
// to news they've read.
export async function getResourceDocuments(): Promise<InvestorDocument[]> {
  return getResources()
}
