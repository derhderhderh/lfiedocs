"use client"

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db, collection, query, where, getDocs, orderBy } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Users,
  UserCheck,
  AlertTriangle,
  Plus,
  ArrowRight,
  Clock,
  Shield,
  Loader2,
} from "lucide-react"
import type { Document, TrustedContact, EmergencyEvent } from "@/lib/types"

interface DashboardStats {
  totalDocuments: number
  expiringDocuments: number
  familyMembers: number
  trustedContacts: number
  activeEmergency: boolean
}

export default function DashboardPage() {
  const { user, family } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    expiringDocuments: 0,
    familyMembers: 0,
    trustedContacts: 0,
    activeEmergency: false,
  })
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!db || !family?.id) return

      try {
        // Fetch documents
        const docsQuery = query(
          collection(db, "documents"),
          where("familyId", "==", family.id),
          orderBy("createdAt", "desc")
        )
        const docsSnapshot = await getDocs(docsQuery)
        const documents = docsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Document[]

        // Calculate expiring documents (within 30 days)
        const now = new Date()
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        const expiring = documents.filter((doc) => {
          if (!doc.expirationDate) return false
          const expDate = doc.expirationDate instanceof Date
            ? doc.expirationDate
            : new Date(doc.expirationDate)
          return expDate <= thirtyDaysFromNow && expDate >= now
        })

        // Fetch family members
        const usersQuery = query(
          collection(db, "users"),
          where("familyId", "==", family.id)
        )
        const usersSnapshot = await getDocs(usersQuery)

        // Fetch trusted contacts
        const contactsQuery = query(
          collection(db, "trusted_contacts"),
          where("familyId", "==", family.id)
        )
        const contactsSnapshot = await getDocs(contactsQuery)

        // Check for active emergency
        const emergencyQuery = query(
          collection(db, "emergency_events"),
          where("familyId", "==", family.id),
          where("status", "==", "active")
        )
        const emergencySnapshot = await getDocs(emergencyQuery)

        setStats({
          totalDocuments: documents.length,
          expiringDocuments: expiring.length,
          familyMembers: usersSnapshot.size,
          trustedContacts: contactsSnapshot.size,
          activeEmergency: !emergencySnapshot.empty,
        })

        setRecentDocuments(documents.slice(0, 5))
      } catch (error) {
        console.error("[v0] Failed to fetch dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [family?.id])

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.displayName?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here{"'"}s an overview of your family vault
        </p>
      </div>

      {/* Emergency Alert */}
      {stats.activeEmergency && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Emergency Access Active</p>
              <p className="text-sm text-destructive/80">
                Trusted contacts may have access to emergency vault documents
              </p>
            </div>
            <Button variant="destructive" size="sm" asChild>
              <Link href="/dashboard/emergency">View Details</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="mt-1 text-3xl font-bold">{stats.totalDocuments}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
            <Link
              href="/dashboard/documents"
              className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
            >
              View all documents
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="mt-1 text-3xl font-bold">{stats.expiringDocuments}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
            {stats.expiringDocuments > 0 && (
              <p className="mt-4 text-sm text-warning">
                {stats.expiringDocuments} document{stats.expiringDocuments > 1 ? "s" : ""} expiring within 30 days
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Family Members</p>
                <p className="mt-1 text-3xl font-bold">{stats.familyMembers}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            {user?.role === "family_manager" && (
              <Link
                href="/dashboard/family"
                className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
              >
                Manage members
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trusted Contacts</p>
                <p className="mt-1 text-3xl font-bold">{stats.trustedContacts}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <UserCheck className="h-6 w-6 text-success" />
              </div>
            </div>
            <Link
              href="/dashboard/contacts"
              className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
            >
              Manage contacts
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Documents */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks for your vault</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" asChild>
              <Link href="/dashboard/documents/new">
                <Plus className="h-4 w-4" />
                Upload Document
              </Link>
            </Button>
            {user?.role === "family_manager" && (
              <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" asChild>
                <Link href="/dashboard/family/add">
                  <Users className="h-4 w-4" />
                  Add Family Member
                </Link>
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" asChild>
              <Link href="/dashboard/contacts/add">
                <UserCheck className="h-4 w-4" />
                Add Trusted Contact
              </Link>
            </Button>
            {(user?.role === "family_manager" || user?.role === "parent") && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-destructive/50 bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
                asChild
              >
                <Link href="/dashboard/emergency/trigger">
                  <AlertTriangle className="h-4 w-4" />
                  Trigger Emergency
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Documents</CardTitle>
              <CardDescription>Your latest uploaded documents</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/documents">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">No documents yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload your first document to get started
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/documents/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Document
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/documents/${doc.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        {doc.isEmergencyVault ? (
                          <Shield className="h-5 w-5 text-primary" />
                        ) : (
                          <FileText className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">{doc.ownerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {doc.category}
                      </Badge>
                      {doc.isEmergencyVault && (
                        <Badge variant="outline" className="border-primary text-primary">
                          Vault
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Reminder */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Your vault is secure</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              All documents are encrypted at rest and only accessible by authorized family
              members. Trusted contacts can only access the emergency vault when an
              emergency is triggered by an authorized user.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
