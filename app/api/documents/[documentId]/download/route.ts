import { proxyStrapiDownload } from "@/lib/strapi/proxyDownload"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params
  return proxyStrapiDownload("documents", documentId)
}
