"use client"

import React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db, collection, addDoc, serverTimestamp } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, UserPlus, Loader2, Shield, Mail, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function AddTrustedContactPage() {
  const router = useRouter()
  const { user, family } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    relationship: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Name is required"
    }

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !db || !user || !family) return

    setIsLoading(true)
    try {
      // Add trusted contact
      await addDoc(collection(db, "trusted_contacts"), {
        familyId: family.id,
        addedByUserId: user.id,
        addedByUserName: user.displayName,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        relationship: formData.relationship.trim() || null,
        createdAt: serverTimestamp(),
        hasEmergencyAccess: false,
      })

      // Send notification email
      await fetch("/api/email/trusted-contact-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: formData.email,
          contactName: formData.fullName,
          addedByName: user.displayName,
          familyName: family.name,
        }),
      })

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "trusted_contact_added",
        resourceType: "trusted_contact",
        details: { contactName: formData.fullName },
        createdAt: serverTimestamp(),
      })

      toast.success("Trusted contact added successfully! They have been notified via email.")
      router.push("/dashboard/contacts")
    } catch (error) {
      console.error("[v0] Failed to add trusted contact:", error)
      toast.error("Failed to add trusted contact")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/contacts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Trusted Contact</h1>
          <p className="text-muted-foreground">
            Add someone you trust for emergency access
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-warning/30 bg-warning/10">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Choose your trusted contacts carefully
            </p>
            <p className="mt-1 text-muted-foreground">
              These individuals will be able to access your emergency vault documents
              when an emergency is triggered. Only add people you trust completely with
              sensitive information.
            </p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Enter the details of your trusted contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Jane Doe"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
              <p className="text-xs text-muted-foreground">
                They will receive an email notification about being designated as your
                trusted contact
              </p>
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship (Optional)</Label>
              <Input
                id="relationship"
                placeholder="e.g., Sibling, Close friend, Attorney, Accountant"
                value={formData.relationship}
                onChange={(e) =>
                  setFormData({ ...formData, relationship: e.target.value })
                }
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground">No Current Access</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Trusted contacts cannot see any of your documents until an emergency
                    is triggered
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Email Notification</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    They{"'"}ll be notified by email that they{"'"}ve been designated as
                    your emergency contact
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Contact...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Trusted Contact
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
