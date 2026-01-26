"use client"

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db, collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  UserCheck,
  Plus,
  MoreVertical,
  Trash2,
  Loader2,
  Mail,
  Calendar,
  Users,
  Shield,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import type { TrustedContact } from "@/lib/types"

export default function TrustedContactsPage() {
  const { user, family } = useAuth()
  const [contacts, setContacts] = useState<TrustedContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<TrustedContact | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchContacts = async () => {
      if (!db || !family?.id) return

      try {
        const contactsQuery = query(
          collection(db, "trusted_contacts"),
          where("familyId", "==", family.id)
        )
        const snapshot = await getDocs(contactsQuery)
        const contactsList = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            notifiedAt: data.notifiedAt?.toDate?.() || (data.notifiedAt ? new Date(data.notifiedAt) : undefined),
            emergencyAccessGrantedAt: data.emergencyAccessGrantedAt?.toDate?.() || undefined,
            emergencyAccessExpiresAt: data.emergencyAccessExpiresAt?.toDate?.() || undefined,
          } as TrustedContact
        })

        // Sort by created date
        contactsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        setContacts(contactsList)
      } catch (error) {
        console.error("[v0] Failed to fetch trusted contacts:", error)
        toast.error("Failed to load trusted contacts")
      } finally {
        setIsLoading(false)
      }
    }

    fetchContacts()
  }, [family?.id])

  const handleDelete = async () => {
    if (!contactToDelete || !db || !user || !family) return

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "trusted_contacts", contactToDelete.id))

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "trusted_contact_removed",
        resourceType: "trusted_contact",
        details: { contactName: contactToDelete.fullName },
        createdAt: serverTimestamp(),
      })

      setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id))
      toast.success("Trusted contact removed successfully")
    } catch (error) {
      console.error("[v0] Failed to delete contact:", error)
      toast.error("Failed to remove contact")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setContactToDelete(null)
    }
  }

  const handleResendNotification = async (contact: TrustedContact) => {
    if (!user || !family) return

    setResendingEmail(contact.id)
    try {
      await fetch("/api/email/trusted-contact-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: contact.email,
          contactName: contact.fullName,
          addedByName: user.displayName,
          familyName: family.name,
        }),
      })
      toast.success("Notification email sent")
    } catch (error) {
      console.error("[v0] Failed to resend notification:", error)
      toast.error("Failed to send notification")
    } finally {
      setResendingEmail(null)
    }
  }

  // Group contacts by who added them
  const contactsByAdder = contacts.reduce(
    (acc, contact) => {
      const key = contact.addedByUserId
      if (!acc[key]) {
        acc[key] = {
          addedByName: contact.addedByUserName,
          contacts: [],
        }
      }
      acc[key].contacts.push(contact)
      return acc
    },
    {} as Record<string, { addedByName: string; contacts: TrustedContact[] }>
  )

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
          <h1 className="text-2xl font-bold text-foreground">Trusted Contacts</h1>
          <p className="text-muted-foreground">
            People who can access your vault in emergencies
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contacts/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {contacts.filter((c) => !c.hasEmergencyAccess).length}
                </p>
                <p className="text-sm text-muted-foreground">Standby</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {contacts.filter((c) => c.hasEmergencyAccess).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <UserCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No trusted contacts yet
            </h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Add trusted contacts who can access your vault in emergencies
            </p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/contacts/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(contactsByAdder).map(([adderId, { addedByName, contacts: adderContacts }]) => (
            <Card key={adderId}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">
                    Added by {adderId === user?.id ? "you" : addedByName}
                  </CardTitle>
                </div>
                <CardDescription>
                  {adderContacts.length} contact{adderContacts.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adderContacts.map((contact) => {
                    const initials = contact.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">
                                {contact.fullName}
                              </p>
                              {contact.hasEmergencyAccess && (
                                <Badge variant="destructive" className="text-xs">
                                  Active Access
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                              {contact.relationship && (
                                <span>{contact.relationship}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Added {contact.createdAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={contact.hasEmergencyAccess ? "destructive" : "secondary"}
                          >
                            {contact.hasEmergencyAccess ? "Has Access" : "Standby"}
                          </Badge>
                          {(adderId === user?.id || user?.role === "family_manager") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleResendNotification(contact)}
                                  disabled={resendingEmail === contact.id}
                                >
                                  {resendingEmail === contact.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                  )}
                                  Resend Notification
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setContactToDelete(contact)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Contact
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="font-medium text-foreground">About Trusted Contacts</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Trusted contacts have NO access to your documents under normal circumstances
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>
                Access is ONLY granted when a Family Manager or Parent triggers an emergency
              </span>
            </li>
            <li className="flex items-start gap-2">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                Emergency access is temporary and can be revoked when the emergency is resolved
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Trusted Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {contactToDelete?.fullName} as a trusted
              contact? They will no longer be able to access your documents in emergencies.
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
                  Removing...
                </>
              ) : (
                "Remove Contact"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
