import {
  DownloadIcon,
  FileDocIcon,
  FilePdfIcon,
  FilePptIcon,
  FileTextIcon,
  FileXlsIcon,
} from "@phosphor-icons/react/dist/ssr"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import type { InvestorDocument } from "@/lib/documents"

const fileIcons: Record<string, typeof FilePdfIcon> = {
  pdf: FilePdfIcon,
  doc: FileDocIcon,
  docx: FileDocIcon,
  xls: FileXlsIcon,
  xlsx: FileXlsIcon,
  ppt: FilePptIcon,
  pptx: FilePptIcon,
}

export function DocumentList({
  documents,
}: {
  documents: InvestorDocument[]
}) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      {documents.map((document) => {
        const FileIcon = fileIcons[document.fileType] ?? FileTextIcon

        return (
          <Card key={document.id}>
            <CardContent className="flex flex-row items-center gap-3">
              <FileIcon className="size-8 shrink-0 text-muted-foreground" />
              <div className="flex flex-1 flex-col gap-1">
                <CardTitle>{document.title}</CardTitle>
                <CardDescription>
                  {document.category} ·{" "}
                  {new Date(document.uploadedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {document.fileSize}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={<a href={document.url} download />}
              >
                <DownloadIcon data-icon="inline-start" />
                Download
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
