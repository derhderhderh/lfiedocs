"use client"

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db, collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  Loader2,
  UserCheck,
  FileText,
  History,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import type { EmergencyEvent, TrustedContact, Document } from "@/lib/types"

const triggerTypeLabels = {
  death: "Death",
  medical_incapacity: "Medical Incapacity",
  emergency_access: "Emergency Access Request",
}

export default function EmergencyPage() {
  const { user, family } = useAuth()
  const [activeEmergency, setActiveEmergency] = useState<EmergencyEvent | null>(null)
  const [pastEmergencies, setPastEmergencies] = useState<EmergencyEvent[]>([])
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([])
  const [vaultDocuments, setVaultDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [isResolving, setIsResolving] = useState(false)

  const canTriggerEmergency = user?.role === "family_manager" || user?.role === "parent"

  useEffect(() => {
    const fetchData = async () => {
      if (!db || !family?.id) return

      try {
        // Fetch emergency events
        const emergencyQuery = query(
          collection(db, "emergency_events"),
          where("familyId", "==", family.id)
        )
        const emergencySnapshot = await getDocs(emergencyQuery)
        const emergencies = emergencySnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            triggeredAt: data.triggeredAt?.toDate?.() || new Date(data.triggeredAt),
            resolvedAt: data.resolvedAt?.toDate?.() || undefined,
          } as EmergencyEvent
        })

        // Separate active and past emergencies
        const active = emergencies.find((e) => e.status === "active")
        const past = emergencies
          .filter((e) => e.status === "resolved")
          .sort((a, b) => {
            const dateA = b.resolvedAt || b.triggeredAt
            const dateB = a.resolvedAt || a.triggeredAt
            return dateA.getTime() - dateB.getTime()
          })

        setActiveEmergency(active || null)
        setPastEmergencies(past)

        // Fetch trusted contacts
        const contactsQuery = query(
          collection(db, "trusted_contacts"),
          where("familyId", "==", family.id)
        )
        const contactsSnapshot = await getDocs(contactsQuery)
        const contacts = contactsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TrustedContact[]
        setTrustedContacts(contacts)

        // Fetch emergency vault documents
        const docsQuery = query(
          collection(db, "documents"),
          where("familyId", "==", family.id),
          where("isEmergencyVault", "==", true)
        )
        const docsSnapshot = await getDocs(docsQuery)
        const docs = docsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Document[]
        setVaultDocuments(docs)
      } catch (error) {
        console.error("[v0] Failed to fetch emergency data:", error)
        toast.error("Failed to load emergency information")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [family?.id])

  const handleResolveEmergency = async () => {
    if (!activeEmergency || !db || !user || !family) return

    setIsResolving(true)
    try {
      // Update emergency event
      await updateDoc(doc(db, "emergency_events", activeEmergency.id), {
        status: "resolved",
        resolvedAt: serverTimestamp(),
        resolvedByUserId: user.id,
      })

      // Revoke access from all trusted contacts
      const contactsQuery = query(
        collection(db, "trusted_contacts"),
        where("familyId", "==", family.id),
        where("hasEmergencyAccess", "==", true)
      )
      const contactsSnapshot = await getDocs(contactsQuery)
      
      for (const contactDoc of contactsSnapshot.docs) {
        await updateDoc(doc(db, "trusted_contacts", contactDoc.id), {
          hasEmergencyAccess: false,
          emergencyAccessExpiresAt: null,
        })
      }

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "emergency_resolved",
        resourceType: "emergency",
        resourceId: activeEmergency.id,
        createdAt: serverTimestamp(),
      })

      // Send notification emails to trusted contacts
      for (const contact of trustedContacts) {
        await fetch("/api/email/emergency-resolved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactEmail: contact.email,
            contactName: contact.fullName,
            familyName: family.name,
            resolvedByName: user.displayName,
          }),
        })
      }

      setActiveEmergency(null)
      setPastEmergencies([
        { ...activeEmergency, status: "resolved", resolvedAt: new Date() },
        ...pastEmergencies,
      ])
      setTrustedContacts(
        trustedContacts.map((c) => ({ ...c, hasEmergencyAccess: false }))
      )

      toast.success("Emergency resolved. All trusted contact access has been revoked.")
    } catch (error) {
      console.error("[v0] Failed to resolve emergency:", error)
      toast.error("Failed to resolve emergency")
    } finally {
      setIsResolving(false)
      setResolveDialogOpen(false)
    }
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
          <h1 className="text-2xl font-bold text-foreground">Emergency Access</h1>
          <p className="text-muted-foreground">
            Manage emergency vault access for trusted contacts
          </p>
        </div>
        {canTriggerEmergency && !activeEmergency && (
          <Button variant="destructive" asChild>
            <Link href="/dashboard/emergency/trigger">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Trigger Emergency
            </Link>
          </Button>
        )}
      </div>

      {/* Active Emergency Alert */}
      {activeEmergency && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive">
                  <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
                </div>
                <div>
                  <CardTitle className="text-destructive">Emergency Active</CardTitle>
                  <CardDescription className="text-destructive/80">
                    Triggered {activeEmergency.triggeredAt.toLocaleDateString()} by{" "}
                    {activeEmergency.triggeredByUserName}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="destructive" className="text-sm">
                {triggerTypeLabels[activeEmergency.triggerType]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive/90">
              All trusted contacts have been notified and granted temporary access to the
              emergency vault documents.
            </p>
            {activeEmergency.notes && (
              <div className="rounded-lg bg-destructive/20 p-3">
                <p className="text-sm font-medium text-destructive">Notes:</p>
                <p className="mt-1 text-sm text-destructive/80">{activeEmergency.notes}</p>
              </div>
            )}
            {(user?.role === "family_manager" || user?.role === "parent") && (
              <Button
                variant="outline"
                onClick={() => setResolveDialogOpen(true)}
                className="gap-2 border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <XCircle className="h-4 w-4" />
                Resolve Emergency
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Overview */}
      {!activeEmergency && (
        <Card className="border-success/30 bg-success/10">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success">
              <CheckCircle className="h-6 w-6 text-success-foreground" />
            </div>
            <div>
              <p className="font-medium text-success">No Active Emergency</p>
              <p className="text-sm text-success/80">
                Your emergency vault is secure. Trusted contacts do not have access.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{trustedContacts.length}</p>
                <p className="text-sm text-muted-foreground">Trusted Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vaultDocuments.length}</p>
                <p className="text-sm text-muted-foreground">Vault Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pastEmergencies.length}</p>
                <p className="text-sm text-muted-foreground">Past Emergencies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trusted Contacts with Access Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Trusted Contact Access
          </CardTitle>
          <CardDescription>
            Current access status for all trusted contacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trustedContacts.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <p className="text-muted-foreground">No trusted contacts configured</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/dashboard/contacts/add">Add a trusted contact</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {trustedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{contact.fullName}</p>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                  </div>
                  <Badge
                    variant={contact.hasEmergencyAccess ? "destructive" : "secondary"}
                  >
                    {contact.hasEmergencyAccess ? "Has Access" : "No Access"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Vault Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Emergency Vault Documents
          </CardTitle>
          <CardDescription>
            Documents that will be accessible to trusted contacts during emergencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vaultDocuments.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <p className="text-muted-foreground">No documents in the emergency vault</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/dashboard/documents/new">Upload a document</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {vaultDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{doc.ownerName}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {doc.category}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Emergencies */}
      {pastEmergencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Emergency History
            </CardTitle>
            <CardDescription>
              Record of past emergency events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastEmergencies.map((emergency) => (
                <div
                  key={emergency.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {triggerTypeLabels[emergency.triggerType]}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          Resolved
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Triggered {emergency.triggeredAt.toLocaleDateString()} by{" "}
                        {emergency.triggeredByUserName}
                        {emergency.resolvedAt && (
                          <> | Resolved {emergency.resolvedAt.toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="font-medium text-foreground">How Emergency Access Works</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span className="font-medium text-foreground">Trigger</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                A Family Manager or Parent triggers an emergency event
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span className="font-medium text-foreground">Notify</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                All trusted contacts receive email notifications with access details
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <span className="font-medium text-foreground">Access</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Contacts can view emergency vault documents until access is revoked
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resolve Emergency Dialog */}
      <AlertDialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Emergency</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access from all trusted contacts and close the emergency
              event. All contacts will be notified via email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResolving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolveEmergency} disabled={isResolving}>
              {isResolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve Emergency"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
