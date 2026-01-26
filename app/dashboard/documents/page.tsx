"use client"

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db, collection, query, where, getDocs, orderBy, deleteDoc, doc } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  Shield,
  Clock,
  Loader2,
  Download,
} from "lucide-react"
import { toast } from "sonner"
import type { Document, DocumentCategory } from "@/lib/types"
import { DOCUMENT_CATEGORIES } from "@/lib/types"

export default function DocumentsPage() {
  const { user, family } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [ownerFilter, setOwnerFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get unique owners from documents
  const uniqueOwners = Array.from(
    new Map(documents.map((d) => [d.ownerUserId, { id: d.ownerUserId, name: d.ownerName }])).values()
  )

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!db || !family?.id || !user) return

      try {
        let docsQuery
        
        // Family members can only see their own documents
        // Parents and Family Managers can see all documents
        if (user.role === "family_member") {
          docsQuery = query(
            collection(db, "documents"),
            where("familyId", "==", family.id),
            where("ownerUserId", "==", user.id),
            orderBy("createdAt", "desc")
          )
        } else {
          docsQuery = query(
            collection(db, "documents"),
            where("familyId", "==", family.id),
            orderBy("createdAt", "desc")
          )
        }

        const snapshot = await getDocs(docsQuery)
        const docs = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
            expirationDate: data.expirationDate?.toDate?.() || (data.expirationDate ? new Date(data.expirationDate) : undefined),
          } as Document
        })

        setDocuments(docs)
        setFilteredDocuments(docs)
      } catch (error) {
        console.error("[v0] Failed to fetch documents:", error)
        toast.error("Failed to load documents")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocuments()
  }, [family?.id, user])

  // Filter documents based on search and filters
  useEffect(() => {
    let filtered = [...documents]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.ownerName.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((doc) => doc.category === categoryFilter)
    }

    // Owner filter
    if (ownerFilter !== "all") {
      filtered = filtered.filter((doc) => doc.ownerUserId === ownerFilter)
    }

    setFilteredDocuments(filtered)
  }, [documents, searchQuery, categoryFilter, ownerFilter])

  const handleDelete = async () => {
    if (!documentToDelete || !db) return

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "documents", documentToDelete.id))
      setDocuments((prev) => prev.filter((d) => d.id !== documentToDelete.id))
      toast.success("Document deleted successfully")
    } catch (error) {
      console.error("[v0] Failed to delete document:", error)
      toast.error("Failed to delete document")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const isExpiringSoon = (date: Date | undefined) => {
    if (!date) return false
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return date <= thirtyDaysFromNow && date >= now
  }

  const isExpired = (date: Date | undefined) => {
    if (!date) return false
    return date < new Date()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">
            Manage your family{"'"}s important documents
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user?.role !== "family_member" && uniqueOwners.length > 1 && (
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {uniqueOwners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-foreground">
              {documents.length === 0 ? "No documents yet" : "No documents found"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {documents.length === 0
                ? "Upload your first document to get started"
                : "Try adjusting your search or filters"}
            </p>
            {documents.length === 0 && (
              <Button className="mt-4" asChild>
                <Link href="/dashboard/documents/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Document
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="group relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    {doc.isEmergencyVault ? (
                      <Shield className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/documents/${doc.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {doc.fileUrl && (
                        <DropdownMenuItem asChild>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setDocumentToDelete(doc)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3">
                  <CardTitle className="line-clamp-1 text-base">{doc.title}</CardTitle>
                  <CardDescription className="mt-1">{doc.ownerName}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {doc.category}
                  </Badge>
                  {doc.isEmergencyVault && (
                    <Badge variant="outline" className="border-primary text-primary">
                      Emergency Vault
                    </Badge>
                  )}
                  {doc.expirationDate && isExpired(doc.expirationDate) && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                  {doc.expirationDate && isExpiringSoon(doc.expirationDate) && !isExpired(doc.expirationDate) && (
                    <Badge variant="outline" className="border-warning text-warning">
                      <Clock className="mr-1 h-3 w-3" />
                      Expiring Soon
                    </Badge>
                  )}
                </div>
                {doc.expirationDate && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Expires: {doc.expirationDate.toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              <Link
                href={`/dashboard/documents/${doc.id}`}
                className="absolute inset-0"
                aria-label={`View ${doc.title}`}
              />
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
