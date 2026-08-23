import type { InvestorDocument } from "@/lib/documents"
import { strapiFetch } from "@/lib/strapi/client"
import { formatFileSize, toAbsoluteMediaUrl } from "@/lib/strapi/media"

type StrapiMediaFile = {
  url: string
  size: number // KB
}

export type StrapiResource = {
  documentId: string
  title: string
  category: string
  fileType: string
  createdAt: string
  file: StrapiMediaFile | null
}

export function mapResource(resource: StrapiResource): InvestorDocument {
  return {
    id: resource.documentId,
    title: resource.title,
    category: resource.category,
    fileType: resource.fileType.toLowerCase(),
    fileSize: resource.file ? formatFileSize(resource.file.size) : "",
    url: resource.file ? toAbsoluteMediaUrl(resource.file.url) : "#",
    uploadedAt: resource.createdAt,
  }
}

// Resource is a shared/global content-type (no account relation) — every
// logged-in investor sees the same list, same visibility model as News.
export async function getResources(): Promise<InvestorDocument[]> {
  const resources = await strapiFetch<StrapiResource[]>("/resources?populate=file")
  return resources.map(mapResource)
}
