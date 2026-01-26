"use client"

import React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { db, doc, updateDoc, serverTimestamp, addDoc, collection } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Shield,
  Bell,
  Key,
  Loader2,
  Save,
  Mail,
  Users,
} from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, family, refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false)
  const [familyName, setFamilyName] = useState(family?.name || "")

  const handleSaveProfile = async () => {
    if (!db || !user || !family) return

    setIsLoading(true)
    try {
      // Update user document
      await updateDoc(doc(db, "users", user.id), {
        displayName: displayName.trim(),
        twoFactorEnabled,
        updatedAt: serverTimestamp(),
      })

      // Update family name if user is manager
      if (user.role === "family_manager" && familyName !== family.name) {
        await updateDoc(doc(db, "families", family.id), {
          name: familyName.trim(),
        })
      }

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "settings_updated",
        resourceType: "user",
        createdAt: serverTimestamp(),
      })

      await refreshUser()
      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("[v0] Failed to save settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setIsLoading(false)
    }
  }

  const roleLabels = {
    family_manager: "Family Manager",
    parent: "Parent",
    family_member: "Family Member",
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Role</p>
                <p className="text-sm text-muted-foreground">
                  Your permission level in the family
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              {user?.role ? roleLabels[user.role] : "Unknown"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Family Settings (Manager only) */}
      {user?.role === "family_manager" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Settings
            </CardTitle>
            <CardDescription>
              Manage your family vault settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">Family Name</Label>
              <Input
                id="familyName"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Family Members</p>
                <p className="text-sm text-muted-foreground">
                  {family?.memberCount || 1} member{(family?.memberCount || 1) > 1 ? "s" : ""} in your family
                </p>
              </div>
              <Badge variant="outline">
                Max: {family?.maxMembers || 4}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
              disabled={isLoading}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Password</Label>
            <Button variant="outline" className="w-full bg-transparent" disabled>
              Change Password
            </Button>
            <p className="text-xs text-muted-foreground">
              Password change is handled through Firebase Authentication
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
            </div>
            <Switch checked disabled />
          </div>

          <p className="text-sm text-muted-foreground">
            Email notifications for emergencies and document expirations cannot be disabled
            for security reasons.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
