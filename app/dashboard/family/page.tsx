"use client"

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db, collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, addDoc } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Plus,
  MoreVertical,
  Crown,
  Shield,
  User,
  Trash2,
  Loader2,
  Mail,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"
import type { FamilyUser, UserRole } from "@/lib/types"

const roleLabels: Record<UserRole, string> = {
  family_manager: "Family Manager",
  parent: "Parent",
  family_member: "Family Member",
}

const roleIcons: Record<UserRole, React.ElementType> = {
  family_manager: Crown,
  parent: Shield,
  family_member: User,
}

export default function FamilyMembersPage() {
  const { user, family } = useAuth()
  const [members, setMembers] = useState<FamilyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<FamilyUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false)
  const [memberToChangeRole, setMemberToChangeRole] = useState<FamilyUser | null>(null)
  const [newRole, setNewRole] = useState<UserRole>("family_member")
  const [isChangingRole, setIsChangingRole] = useState(false)

  const isManager = user?.role === "family_manager"

  useEffect(() => {
    const fetchMembers = async () => {
      if (!db || !family?.id) return

      try {
        const membersQuery = query(
          collection(db, "users"),
          where("familyId", "==", family.id)
        )
        const snapshot = await getDocs(membersQuery)
        const membersList = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
            lastLoginAt: data.lastLoginAt?.toDate?.() || (data.lastLoginAt ? new Date(data.lastLoginAt) : undefined),
          } as FamilyUser
        })

        // Sort: Family Manager first, then by name
        membersList.sort((a, b) => {
          if (a.role === "family_manager") return -1
          if (b.role === "family_manager") return 1
          return a.displayName.localeCompare(b.displayName)
        })

        setMembers(membersList)
      } catch (error) {
        console.error("[v0] Failed to fetch family members:", error)
        toast.error("Failed to load family members")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [family?.id])

  const handleDeleteMember = async () => {
    if (!memberToDelete || !db || !user || !family) return

    setIsDeleting(true)
    try {
      // Delete user document
      await deleteDoc(doc(db, "users", memberToDelete.id))

      // Update family member count
      await updateDoc(doc(db, "families", family.id), {
        memberCount: members.length - 1,
      })

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "member_removed",
        resourceType: "user",
        details: { removedMember: memberToDelete.displayName },
        createdAt: serverTimestamp(),
      })

      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id))
      toast.success("Member removed successfully")
    } catch (error) {
      console.error("[v0] Failed to delete member:", error)
      toast.error("Failed to remove member")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setMemberToDelete(null)
    }
  }

  const handleRoleChange = async () => {
    if (!memberToChangeRole || !db || !user || !family) return

    setIsChangingRole(true)
    try {
      await updateDoc(doc(db, "users", memberToChangeRole.id), {
        role: newRole,
        updatedAt: serverTimestamp(),
      })

      // Create audit log
      await addDoc(collection(db, "audit_logs"), {
        familyId: family.id,
        userId: user.id,
        userName: user.displayName,
        action: "role_changed",
        resourceType: "user",
        details: {
          member: memberToChangeRole.displayName,
          oldRole: memberToChangeRole.role,
          newRole: newRole,
        },
        createdAt: serverTimestamp(),
      })

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberToChangeRole.id ? { ...m, role: newRole } : m
        )
      )
      toast.success("Role updated successfully")
    } catch (error) {
      console.error("[v0] Failed to change role:", error)
      toast.error("Failed to update role")
    } finally {
      setIsChangingRole(false)
      setRoleChangeDialogOpen(false)
      setMemberToChangeRole(null)
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
          <h1 className="text-2xl font-bold text-foreground">Family Members</h1>
          <p className="text-muted-foreground">
            Manage who has access to your family vault
          </p>
        </div>
        {isManager && (
          <Button asChild>
            <Link href="/dashboard/family/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
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
                <p className="text-2xl font-bold">
                  {members.filter((m) => m.role === "parent" || m.role === "family_manager").length}
                </p>
                <p className="text-sm text-muted-foreground">Parents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter((m) => m.role === "family_member").length}
                </p>
                <p className="text-sm text-muted-foreground">Family Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            {family?.name || "Your family"} has {members.length} member{members.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const RoleIcon = roleIcons[member.role]
              const initials = member.displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)

              return (
                <div
                  key={member.id}
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
                          {member.displayName}
                        </p>
                        {member.id === user?.id && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {member.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={member.role === "family_manager" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      <RoleIcon className="h-3 w-3" />
                      {roleLabels[member.role]}
                    </Badge>
                    {isManager && member.id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setMemberToChangeRole(member)
                              setNewRole(member.role === "parent" ? "family_member" : "parent")
                              setRoleChangeDialogOpen(true)
                            }}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setMemberToDelete(member)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Member
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

      {/* Permission Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="font-medium text-foreground">Role Permissions</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Family Manager</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Manages subscription</li>
                <li>Adds/removes members</li>
                <li>Views all documents</li>
                <li>Triggers emergencies</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Parent</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Views dependent docs</li>
                <li>Manages own documents</li>
                <li>Triggers emergencies</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Family Member</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Views own documents only</li>
                <li>Manages own documents</li>
                <li>Cannot trigger emergency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToDelete?.displayName} from your
              family? They will lose access to the family vault and all their documents
              will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Dialog */}
      <AlertDialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Member Role</AlertDialogTitle>
            <AlertDialogDescription>
              Change the role for {memberToChangeRole?.displayName}. This will affect
              their permissions in the family vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="family_member">Family Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} disabled={isChangingRole}>
              {isChangingRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
