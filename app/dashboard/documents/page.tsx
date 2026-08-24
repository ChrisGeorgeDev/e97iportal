import { FolderIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr"

import { DocumentList } from "@/components/document-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDocuments, getResourceDocuments } from "@/lib/documents"

export default async function DocumentsPage() {
  const [documents, resources] = await Promise.all([
    getDocuments(),
    getResourceDocuments(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
      <Tabs defaultValue="documents" className="pt-8">
        <TabsList className="h-auto w-full gap-3 bg-transparent pb-8">
          <TabsTrigger
            value="documents"
            className="h-auto flex-1 flex-col items-start gap-1 rounded-none border border-border bg-transparent px-4 py-3 text-left data-active:border-primary data-active:bg-primary/5 data-active:after:opacity-0"
          >
            <div className="flex items-center gap-2">
              <FolderIcon className="size-5 text-primary" weight="fill" />
              <span className="text-sm font-semibold text-foreground">
                My Documents
              </span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
             Related to your investments
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="resources"
            className="h-auto flex-1 flex-col items-start gap-1 rounded-none border border-border bg-transparent px-4 py-3 text-left data-active:border-primary data-active:bg-primary/5 data-active:after:opacity-0"
          >
            <div className="flex items-center gap-2">
              <UsersThreeIcon className="size-5 text-primary" weight="fill" />
              <span className="text-sm font-semibold text-foreground">
                Shared Resources
              </span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              Available to all investors
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="documents">
          <DocumentList documents={documents} />
        </TabsContent>
        <TabsContent value="resources">
          <DocumentList documents={resources} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
