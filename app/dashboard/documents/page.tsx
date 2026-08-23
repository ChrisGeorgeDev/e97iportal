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
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
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
