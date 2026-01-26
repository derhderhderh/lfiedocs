"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, updateDoc, serverTimestamp, addDoc, collection, getDoc } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, UserPlus, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import type { UserRole } from "@/lib/types"

function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
  let password = ""
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default function AddFamilyMemberPage() {
  const router = useRouter()
  const { user, family } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    role: "family_member" as UserRole,
    tempPassword: generateTempPassword(),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Only Family Managers can add members
    if (user && user.role !== "family_manager") {
      router.push("/dashboard/family")
    }
  }, [user, router])

  const copyPassword = async () => {
    await navigator.clipboard.writeText(formData.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Password copied to clipboard")
  }

  const regeneratePassword = () => {
    setFormData({ ...formData, tempPassword: generateTempPassword() })
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Name is required"
    }

    if (!formData.tempPassword) {
      newErrors.tempPassword = "Password is required"
    } else if (formData.tempPassword.length < 8) {
      newErrors.tempPassword = "Password must be at least 8 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !auth || !db || !user || !family) return

    setIsLoading(true)
    try {
      // Create the new user in Firebase Auth
      // Note: This will sign out the current user, so we need to handle this
      const credential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.tempPassword
      )
      const newUser = credential.user

      // Create user document
      await setDoc(doc(db, "users", newUser.uid), {
        email: formData.email,
        displayName: formData.displayName.trim(),
        familyId: family.id,
        role: formData.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        hasCompletedOnboarding: false,
        twoFactorEnabled: false,
      })

      // Update family member count
      const familyDoc = await getDoc(doc(db, "families", family.id))
      const currentCount = familyDoc.data()?.memberCount || 1
      await updateDoc(doc(db, "families", family.id), {
        memberCount: currentCount + 1,
      })

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "member_added",
        resourceType: "user",
        details: { 
          newMember: formData.displayName,
          role: formData.role,
        },
        createdAt: serverTimestamp(),
      })

      // Send invitation email (via API route)
      await fetch("/api/email/member-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberEmail: formData.email,
          memberName: formData.displayName,
          tempPassword: formData.tempPassword,
          familyName: family.name,
          invitedByName: user.displayName,
        }),
      })

      toast.success("Family member added successfully! An invitation email has been sent.")
      router.push("/dashboard/family")
    } catch (error: unknown) {
      console.error("[v0] Failed to add family member:", error)
      if (error instanceof Error && error.message.includes("email-already-in-use")) {
        toast.error("This email is already registered")
      } else {
        toast.error("Failed to add family member")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (user?.role !== "family_manager") {
    return null
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/family">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Family Member</h1>
          <p className="text-muted-foreground">Invite a new member to your family vault</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Member Information</CardTitle>
            <CardDescription>
              Enter the details for the new family member. They will receive an email
              with login instructions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name *</Label>
              <Input
                id="displayName"
                placeholder="Jane Smith"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                disabled={isLoading}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName}</p>
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
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">
                    <div>
                      <p className="font-medium">Parent</p>
                      <p className="text-xs text-muted-foreground">
                        Can view dependent documents and trigger emergencies
                      </p>
                    </div>
                  </SelectItem>
                  <SelectItem value="family_member">
                    <div>
                      <p className="font-medium">Family Member</p>
                      <p className="text-xs text-muted-foreground">
                        Can only view and manage their own documents
                      </p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Temporary Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tempPassword">Temporary Password *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regeneratePassword}
                  disabled={isLoading}
                >
                  Regenerate
                </Button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="tempPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.tempPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, tempPassword: e.target.value })
                    }
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                  disabled={isLoading}
                  className="bg-transparent"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.tempPassword && (
                <p className="text-sm text-destructive">{errors.tempPassword}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Share this password with the new member. They{"'"}ll be asked to set up
                their trusted contacts on first login.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground">What happens next?</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>1. An invitation email will be sent to the new member</li>
              <li>2. They{"'"}ll sign in with the temporary password</li>
              <li>3. They must set up their trusted contacts before accessing the vault</li>
              <li>4. They can then upload and manage their documents</li>
            </ul>
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
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Member...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
