import {
  DownloadIcon,
  FileDocIcon,
  FilePdfIcon,
  FilePptIcon,
  FileTextIcon,
  FileXlsIcon,
} from "@phosphor-icons/react/dist/ssr"

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
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents yet.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border border-b border-border">
      {documents.map((document) => {
        const FileIcon = fileIcons[document.fileType] ?? FileTextIcon

        return (
          <a
            key={document.id}
            href={document.url}
            download
            className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent/40"
          >
            <FileIcon className="size-6 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">
                {document.title}
              </span>
              <span className="text-2xs text-muted-foreground">
                {document.category} ·{" "}
                {new Date(document.uploadedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {document.fileSize}
              </span>
            </div>
            <DownloadIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </a>
        )
      })}
    </div>
  )
}
