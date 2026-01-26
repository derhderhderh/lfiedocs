"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Shield, Loader2, Plus, X, UserPlus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { TrustedContactFormData } from "@/lib/types"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, family, isLoading: authLoading, completeTrustedContactSetup } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState<TrustedContactFormData[]>([
    { fullName: "", email: "", relationship: "" },
  ])
  const [errors, setErrors] = useState<Record<number, Partial<TrustedContactFormData>>>({})

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
    } else if (!authLoading && user?.hasCompletedOnboarding) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  const addContact = () => {
    if (contacts.length < 5) {
      setContacts([...contacts, { fullName: "", email: "", relationship: "" }])
    }
  }

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      const newContacts = contacts.filter((_, i) => i !== index)
      setContacts(newContacts)
      const newErrors = { ...errors }
      delete newErrors[index]
      setErrors(newErrors)
    }
  }

  const updateContact = (
    index: number,
    field: keyof TrustedContactFormData,
    value: string
  ) => {
    const newContacts = [...contacts]
    newContacts[index] = { ...newContacts[index], [field]: value }
    setContacts(newContacts)

    // Clear error when user types
    if (errors[index]?.[field]) {
      const newErrors = { ...errors }
      delete newErrors[index][field]
      setErrors(newErrors)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<number, Partial<TrustedContactFormData>> = {}
    let isValid = true

    contacts.forEach((contact, index) => {
      const contactErrors: Partial<TrustedContactFormData> = {}

      if (!contact.fullName.trim()) {
        contactErrors.fullName = "Name is required"
        isValid = false
      }

      if (!contact.email.trim()) {
        contactErrors.email = "Email is required"
        isValid = false
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        contactErrors.email = "Please enter a valid email"
        isValid = false
      }

      if (Object.keys(contactErrors).length > 0) {
        newErrors[index] = contactErrors
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      await completeTrustedContactSetup(contacts)
      toast.success("Trusted contacts added successfully!")
      router.push("/dashboard")
    } catch (error) {
      console.error("[v0] Onboarding error:", error)
      toast.error("Failed to save trusted contacts")
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to LifeDocs Family
          </h1>
          <p className="mt-2 text-muted-foreground">
            {family?.name || "Your Family Vault"}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              1
            </div>
            <div className="h-1 w-16 bg-muted" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
              2
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-16 text-sm text-muted-foreground">
            <span>Trusted Contacts</span>
            <span>Dashboard</span>
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Add Trusted Contacts</CardTitle>
                <CardDescription>
                  These people will be able to access your documents in case of emergency
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Warning Banner */}
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  This step is required
                </p>
                <p className="mt-1 text-muted-foreground">
                  You must add at least one trusted contact before you can access your
                  family vault. They will receive an email notification about being
                  designated as your emergency contact.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {contacts.map((contact, index) => (
                <div
                  key={index}
                  className="relative rounded-lg border border-border p-4"
                >
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  <h4 className="mb-4 text-sm font-medium text-foreground">
                    Contact {index + 1}
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${index}`}>Full Name *</Label>
                      <Input
                        id={`name-${index}`}
                        placeholder="Jane Doe"
                        value={contact.fullName}
                        onChange={(e) =>
                          updateContact(index, "fullName", e.target.value)
                        }
                        disabled={isLoading}
                      />
                      {errors[index]?.fullName && (
                        <p className="text-sm text-destructive">
                          {errors[index].fullName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`email-${index}`}>Email Address *</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        placeholder="jane@example.com"
                        value={contact.email}
                        onChange={(e) =>
                          updateContact(index, "email", e.target.value)
                        }
                        disabled={isLoading}
                      />
                      {errors[index]?.email && (
                        <p className="text-sm text-destructive">
                          {errors[index].email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor={`relationship-${index}`}>
                        Relationship (Optional)
                      </Label>
                      <Input
                        id={`relationship-${index}`}
                        placeholder="e.g., Sibling, Close friend, Attorney"
                        value={contact.relationship || ""}
                        onChange={(e) =>
                          updateContact(index, "relationship", e.target.value)
                        }
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {contacts.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addContact}
                  className="w-full gap-2 bg-transparent"
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4" />
                  Add Another Contact
                </Button>
              )}

              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Continue to Dashboard"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Your trusted contacts will only receive access to your documents when an
          emergency is triggered by an authorized family member.
        </p>
      </div>
    </div>
  )
}
