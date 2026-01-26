"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
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
  AlertTriangle,
  Loader2,
  UserCheck,
  Shield,
  Skull,
  HeartPulse,
  Key,
} from "lucide-react"
import { toast } from "sonner"
import type { EmergencyTriggerType, TrustedContact, FamilyUser } from "@/lib/types"

const triggerTypes: {
  value: EmergencyTriggerType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    value: "death",
    label: "Death",
    description: "A family member has passed away",
    icon: Skull,
  },
  {
    value: "medical_incapacity",
    label: "Medical Incapacity",
    description: "A family member is medically incapacitated",
    icon: HeartPulse,
  },
  {
    value: "emergency_access",
    label: "Emergency Access",
    description: "General emergency requiring trusted contact access",
    icon: Key,
  },
]

export default function TriggerEmergencyPage() {
  const router = useRouter()
  const { user, family } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyUser[]>([])
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    triggerType: "" as EmergencyTriggerType | "",
    notes: "",
    confirmUnderstanding: false,
    affectedUserIds: [] as string[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const canTriggerEmergency = user?.role === "family_manager" || user?.role === "parent"

  useEffect(() => {
    if (user && !canTriggerEmergency) {
      router.push("/dashboard/emergency")
    }
  }, [user, canTriggerEmergency, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!db || !family?.id) return

      try {
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

        // Fetch family members
        const membersQuery = query(
          collection(db, "users"),
          where("familyId", "==", family.id)
        )
        const membersSnapshot = await getDocs(membersQuery)
        const members = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FamilyUser[]
        setFamilyMembers(members)
      } catch (error) {
        console.error("[v0] Failed to fetch data:", error)
      }
    }

    fetchData()
  }, [family?.id])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.triggerType) {
      newErrors.triggerType = "Please select an emergency type"
    }

    if (!formData.confirmUnderstanding) {
      newErrors.confirm = "You must confirm that you understand the consequences"
    }

    if (formData.affectedUserIds.length === 0) {
      newErrors.affectedUsers = "Please select at least one affected family member"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setConfirmDialogOpen(true)
  }

  const handleTriggerEmergency = async () => {
    if (!db || !user || !family) return

    setIsLoading(true)
    try {
      // Create emergency event
      const emergencyRef = await addDoc(collection(db, "emergency_events"), {
        familyId: family.id,
        triggeredByUserId: user.id,
        triggeredByUserName: user.displayName,
        triggerType: formData.triggerType,
        status: "active",
        triggeredAt: serverTimestamp(),
        notes: formData.notes.trim() || null,
        affectedUserIds: formData.affectedUserIds,
      })

      // Grant access to all trusted contacts
      for (const contact of trustedContacts) {
        await updateDoc(doc(db, "trusted_contacts", contact.id), {
          hasEmergencyAccess: true,
          emergencyAccessGrantedAt: serverTimestamp(),
        })
      }

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "emergency_triggered",
        resourceType: "emergency",
        resourceId: emergencyRef.id,
        details: {
          triggerType: formData.triggerType,
          affectedUsers: formData.affectedUserIds.length,
          trustedContactsNotified: trustedContacts.length,
        },
        createdAt: serverTimestamp(),
      })

      // Send notification emails to all trusted contacts
      for (const contact of trustedContacts) {
        await fetch("/api/email/emergency-triggered", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactEmail: contact.email,
            contactName: contact.fullName,
            familyName: family.name,
            triggerType: formData.triggerType,
            triggeredByName: user.displayName,
            notes: formData.notes,
          }),
        })
      }

      toast.success("Emergency triggered. All trusted contacts have been notified.")
      router.push("/dashboard/emergency")
    } catch (error) {
      console.error("[v0] Failed to trigger emergency:", error)
      toast.error("Failed to trigger emergency")
    } finally {
      setIsLoading(false)
      setConfirmDialogOpen(false)
    }
  }

  const toggleAffectedUser = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      affectedUserIds: prev.affectedUserIds.includes(userId)
        ? prev.affectedUserIds.filter((id) => id !== userId)
        : [...prev.affectedUserIds, userId],
    }))
  }

  const selectAllUsers = () => {
    setFormData((prev) => ({
      ...prev,
      affectedUserIds: familyMembers.map((m) => m.id),
    }))
  }

  if (!canTriggerEmergency) {
    return null
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/emergency">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trigger Emergency</h1>
          <p className="text-muted-foreground">
            Grant trusted contacts access to the emergency vault
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-destructive bg-destructive/10">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              This action has serious consequences
            </p>
            <p className="mt-1 text-destructive/80">
              Triggering an emergency will immediately notify all trusted contacts and
              grant them access to view emergency vault documents. Only proceed if this is
              a genuine emergency situation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pre-requisites check */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck
                className={`h-5 w-5 ${trustedContacts.length > 0 ? "text-success" : "text-destructive"}`}
              />
              <div>
                <p className="font-medium text-foreground">
                  {trustedContacts.length} Trusted Contact{trustedContacts.length !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {trustedContacts.length > 0
                    ? "Will be notified"
                    : "Add contacts first"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Emergency Vault</p>
                <p className="text-sm text-muted-foreground">Will become accessible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Emergency Details</CardTitle>
            <CardDescription>
              Select the type of emergency and provide any relevant details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Emergency Type */}
            <div className="space-y-3">
              <Label>Emergency Type *</Label>
              <RadioGroup
                value={formData.triggerType}
                onValueChange={(value) =>
                  setFormData({ ...formData, triggerType: value as EmergencyTriggerType })
                }
              >
                {triggerTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                      formData.triggerType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                    <div className="flex flex-1 items-start gap-3">
                      <type.icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor={type.value} className="cursor-pointer font-medium">
                          {type.label}
                        </Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
              {errors.triggerType && (
                <p className="text-sm text-destructive">{errors.triggerType}</p>
              )}
            </div>

            {/* Affected Family Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Affected Family Members *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={selectAllUsers}>
                  Select All
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Select whose documents should be accessible to trusted contacts
              </p>
              <div className="space-y-2">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      formData.affectedUserIds.includes(member.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={formData.affectedUserIds.includes(member.id)}
                      onCheckedChange={() => toggleAffectedUser(member.id)}
                    />
                    <Label
                      htmlFor={`member-${member.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      {member.displayName}
                      {member.id === user?.id && (
                        <span className="ml-2 text-muted-foreground">(you)</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.affectedUsers && (
                <p className="text-sm text-destructive">{errors.affectedUsers}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Provide any additional context that trusted contacts should know..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Confirmation */}
            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                formData.confirmUnderstanding
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <Checkbox
                id="confirm"
                checked={formData.confirmUnderstanding}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, confirmUnderstanding: !!checked })
                }
              />
              <Label htmlFor="confirm" className="cursor-pointer text-sm leading-relaxed">
                I understand that triggering this emergency will immediately notify all
                trusted contacts and grant them access to view emergency vault documents.
                This action is logged and cannot be undone, but can be resolved later.
              </Label>
            </div>
            {errors.confirm && (
              <p className="text-sm text-destructive">{errors.confirm}</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="flex-1"
            disabled={isLoading || trustedContacts.length === 0}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Trigger Emergency
          </Button>
        </div>
      </form>

      {/* Final Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Emergency Trigger
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to trigger an emergency. This will:
              <ul className="mt-3 list-inside list-disc space-y-1 text-left">
                <li>Notify {trustedContacts.length} trusted contact{trustedContacts.length !== 1 ? "s" : ""} via email</li>
                <li>Grant them access to emergency vault documents</li>
                <li>Create a permanent audit log entry</li>
              </ul>
              <p className="mt-3 font-medium">Are you absolutely sure?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTriggerEmergency}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                "Yes, Trigger Emergency"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
