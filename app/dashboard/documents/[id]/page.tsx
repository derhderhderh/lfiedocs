"use client"

import React from "react"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db, doc, getDoc, deleteDoc, updateDoc, serverTimestamp, addDoc, collection } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ArrowLeft,
  FileText,
  Shield,
  Clock,
  Calendar,
  User,
  Tag,
  Loader2,
  Download,
  Trash2,
  Save,
  Edit2,
} from "lucide-react"
import { toast } from "sonner"
import type { Document, DocumentCategory } from "@/lib/types"
import { DOCUMENT_CATEGORIES } from "@/lib/types"

export default function DocumentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string
  const { user, family } = useAuth()
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    category: "" as DocumentCategory | "",
    expirationDate: "",
    isEmergencyVault: false,
  })

  useEffect(() => {
    const fetchDocument = async () => {
      if (!db || !documentId || !family?.id) return

      try {
        const docRef = doc(db, "documents", documentId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          
          // Security check: ensure document belongs to user's family
          if (data.familyId !== family.id) {
            toast.error("Document not found")
            router.push("/dashboard/documents")
            return
          }

          // Additional check for family members
          if (user?.role === "family_member" && data.ownerUserId !== user.id) {
            toast.error("You don't have permission to view this document")
            router.push("/dashboard/documents")
            return
          }

          const documentData: Document = {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
            expirationDate: data.expirationDate?.toDate?.() || (data.expirationDate ? new Date(data.expirationDate) : undefined),
          } as Document

          setDocument(documentData)
          setEditData({
            title: documentData.title,
            description: documentData.description || "",
            category: documentData.category,
            expirationDate: documentData.expirationDate
              ? documentData.expirationDate.toISOString().split("T")[0]
              : "",
            isEmergencyVault: documentData.isEmergencyVault,
          })
        } else {
          toast.error("Document not found")
          router.push("/dashboard/documents")
        }
      } catch (error) {
        console.error("[v0] Failed to fetch document:", error)
        toast.error("Failed to load document")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [documentId, family?.id, user, router])

  const handleSave = async () => {
    if (!db || !document || !user || !family) return

    setIsSaving(true)
    try {
      const docRef = doc(db, "documents", document.id)
      await updateDoc(docRef, {
        title: editData.title.trim(),
        description: editData.description.trim() || null,
        category: editData.category,
        expirationDate: editData.expirationDate
          ? new Date(editData.expirationDate)
          : null,
        isEmergencyVault: editData.isEmergencyVault,
        updatedAt: serverTimestamp(),
      })

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "document_updated",
        resourceType: "document",
        resourceId: document.id,
        details: { title: editData.title },
        createdAt: serverTimestamp(),
      })

      // Update local state
      setDocument({
        ...document,
        title: editData.title.trim(),
        description: editData.description.trim() || undefined,
        category: editData.category as DocumentCategory,
        expirationDate: editData.expirationDate
          ? new Date(editData.expirationDate)
          : undefined,
        isEmergencyVault: editData.isEmergencyVault,
        updatedAt: new Date(),
      })

      setIsEditing(false)
      toast.success("Document updated successfully")
    } catch (error) {
      console.error("[v0] Failed to update document:", error)
      toast.error("Failed to update document")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!db || !document || !user || !family) return

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "documents", document.id))

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "document_deleted",
        resourceType: "document",
        details: { title: document.title },
        createdAt: serverTimestamp(),
      })

      toast.success("Document deleted successfully")
      router.push("/dashboard/documents")
    } catch (error) {
      console.error("[v0] Failed to delete document:", error)
      toast.error("Failed to delete document")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
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

  if (!document) {
    return null
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/documents">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{document.title}</h1>
            <p className="text-muted-foreground">Document details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => {
                  setIsEditing(false)
                  setEditData({
                    title: document.title,
                    description: document.description || "",
                    category: document.category,
                    expirationDate: document.expirationDate
                      ? document.expirationDate.toISOString().split("T")[0]
                      : "",
                    isEmergencyVault: document.isEmergencyVault,
                  })
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="capitalize">
          {document.category}
        </Badge>
        {document.isEmergencyVault && (
          <Badge variant="outline" className="border-primary text-primary">
            <Shield className="mr-1 h-3 w-3" />
            Emergency Vault
          </Badge>
        )}
        {document.expirationDate && isExpired(document.expirationDate) && (
          <Badge variant="destructive">Expired</Badge>
        )}
        {document.expirationDate &&
          isExpiringSoon(document.expirationDate) &&
          !isExpired(document.expirationDate) && (
            <Badge variant="outline" className="border-warning text-warning">
              <Clock className="mr-1 h-3 w-3" />
              Expiring Soon
            </Badge>
          )}
      </div>

      {/* Document Details */}
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
          <CardDescription>
            {isEditing ? "Edit document details" : "View and manage document details"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <>
              {/* Edit Mode */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editData.title}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) =>
                    setEditData({ ...editData, description: e.target.value })
                  }
                  disabled={isSaving}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editData.category}
                  onValueChange={(value) =>
                    setEditData({ ...editData, category: value as DocumentCategory })
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={editData.expirationDate}
                  onChange={(e) =>
                    setEditData({ ...editData, expirationDate: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Emergency Vault</p>
                    <p className="text-sm text-muted-foreground">
                      Only accessible during emergencies
                    </p>
                  </div>
                </div>
                <Switch
                  checked={editData.isEmergencyVault}
                  onCheckedChange={(checked) =>
                    setEditData({ ...editData, isEmergencyVault: checked })
                  }
                  disabled={isSaving}
                />
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Owner</p>
                    <p className="text-foreground">{document.ownerName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <p className="capitalize text-foreground">{document.category}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-foreground">
                      {document.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {document.expirationDate && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Expires
                      </p>
                      <p
                        className={
                          isExpired(document.expirationDate)
                            ? "text-destructive"
                            : isExpiringSoon(document.expirationDate)
                              ? "text-warning"
                              : "text-foreground"
                        }
                      >
                        {document.expirationDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {document.description && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="mt-1 text-foreground">{document.description}</p>
                </div>
              )}

              {document.fileName && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Attached File</p>
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {document.fileName}
                      </p>
                      {document.fileSize && (
                        <p className="text-sm text-muted-foreground">
                          {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                    {document.fileUrl && (
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{document.title}"? This action cannot
              be undone.
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
