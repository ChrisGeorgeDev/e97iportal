import { strapiFetch } from "@/lib/strapi/client"

export type Property = {
  id: string
  address: string
  tenant: string
  rent: number
  paymentMethod: string
  status: string
  managedBy: string
  portalUrl: string
}

type StrapiProperty = {
  documentId: string
  address: string
  tenant: string | null
  rent: number | null
  paymentMethod: string | null
  // Named paymentStatus in Strapi, not status — "status" is effectively
  // reserved by the content-manager admin UI (rejects any value as invalid,
  // even on content-types with draftAndPublish off, despite the documented
  // reserved-name rule being conditional on draftAndPublish).
  paymentStatus: string | null
  managedBy: string | null
  portalUrl: string | null
}

function mapProperty(property: StrapiProperty): Property {
  return {
    id: property.documentId,
    address: property.address,
    tenant: property.tenant ?? "",
    rent: property.rent ?? 0,
    paymentMethod: property.paymentMethod ?? "",
    status: property.paymentStatus ?? "",
    managedBy: property.managedBy ?? "",
    portalUrl: property.portalUrl ?? "",
  }
}

export async function getProperties(): Promise<Property[]> {
  const properties = await strapiFetch<StrapiProperty[]>("/properties")
  return properties.map(mapProperty)
}
