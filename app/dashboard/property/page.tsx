import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getProperties } from "@/lib/properties"

export default async function PropertyPage() {
  const properties = await getProperties()

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {properties.map((property) => (
        <Card key={property.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{property.address}</CardTitle>
              <Badge variant={property.status === "Current" ? "green" : "red"}>
                {property.status}
              </Badge>
            </div>
            <CardDescription>
              {property.tenant} · Managed by {property.managedBy}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              ${property.rent.toLocaleString()}/mo · {property.paymentMethod}
            </span>
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={property.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Open Portal
              <ArrowSquareOutIcon data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
