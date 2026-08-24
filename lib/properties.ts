import { strapiFetch } from "@/lib/strapi/client"

export type Property = {
  id: string
  address: string
  portalUrl: string
}

type StrapiProperty = {
  documentId: string
  address: string
  portalUrl: string
}

function mapProperty(property: StrapiProperty): Property {
  return {
    id: property.documentId,
    address: property.address,
    portalUrl: property.portalUrl,
  }
}

export async function getProperties(): Promise<Property[]> {
  const properties = await strapiFetch<StrapiProperty[]>("/properties")
  return properties.map(mapProperty)
}
