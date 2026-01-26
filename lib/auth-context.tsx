"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  auth,
  db,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "./firebase"
import type { User } from "firebase/auth"
import type { FamilyUser, Family, SignUpFormData, SignInFormData, TrustedContactFormData } from "./types"

interface AuthContextType {
  firebaseUser: User | null
  user: FamilyUser | null
  family: Family | null
  isLoading: boolean
  isAuthenticated: boolean
  signUp: (data: SignUpFormData) => Promise<void>
  signIn: (data: SignInFormData) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  completeTrustedContactSetup: (contacts: TrustedContactFormData[]) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [user, setUser] = useState<FamilyUser | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserData = async (firebaseUser: User) => {
    if (!db) return

    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
    if (userDoc.exists()) {
      const userData = { id: userDoc.id, ...userDoc.data() } as FamilyUser

      // Convert Firestore timestamps to Date
      if (userData.createdAt && typeof userData.createdAt === "object" && "toDate" in userData.createdAt) {
        userData.createdAt = (userData.createdAt as { toDate: () => Date }).toDate()
      }
      if (userData.updatedAt && typeof userData.updatedAt === "object" && "toDate" in userData.updatedAt) {
        userData.updatedAt = (userData.updatedAt as { toDate: () => Date }).toDate()
      }

      setUser(userData)

      // Fetch family data
      if (userData.familyId) {
        const familyDoc = await getDoc(doc(db, "families", userData.familyId))
        if (familyDoc.exists()) {
          const familyData = { id: familyDoc.id, ...familyDoc.data() } as Family
          if (familyData.createdAt && typeof familyData.createdAt === "object" && "toDate" in familyData.createdAt) {
            familyData.createdAt = (familyData.createdAt as { toDate: () => Date }).toDate()
          }
          setFamily(familyData)
        }
      }
    }
  }

  useEffect(() => {
    if (!auth) {
      setIsLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      if (firebaseUser) {
        await fetchUserData(firebaseUser)
      } else {
        setUser(null)
        setFamily(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signUp = async (data: SignUpFormData) => {
    if (!auth || !db) throw new Error("Firebase not initialized")

    // Create Firebase auth user
    const credential = await createUserWithEmailAndPassword(auth, data.email, data.password)
    const firebaseUser = credential.user

    // Create family document
    const familyRef = doc(collection(db, "families"))
    const familyData: Omit<Family, "id"> = {
      name: data.familyName,
      createdAt: new Date(),
      createdBy: firebaseUser.uid,
      memberCount: 1,
      maxMembers: 4, // Basic plan default
    }
    await setDoc(familyRef, {
      ...familyData,
      createdAt: serverTimestamp(),
    })

    // Create user document
    const userData: Omit<FamilyUser, "id"> = {
      email: data.email,
      displayName: data.displayName,
      familyId: familyRef.id,
      role: "family_manager",
      createdAt: new Date(),
      updatedAt: new Date(),
      hasCompletedOnboarding: false,
      twoFactorEnabled: false,
    }
    await setDoc(doc(db, "users", firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Create audit log
    await addDoc(collection(db, "audit_logs"), {
      familyId: familyRef.id,
      userId: firebaseUser.uid,
      userName: data.displayName,
      action: "family_created",
      resourceType: "family",
      resourceId: familyRef.id,
      createdAt: serverTimestamp(),
    })

    await fetchUserData(firebaseUser)
  }

  const signIn = async (data: SignInFormData) => {
    if (!auth) throw new Error("Firebase not initialized")
    await signInWithEmailAndPassword(auth, data.email, data.password)
  }

  const signOut = async () => {
    if (!auth) throw new Error("Firebase not initialized")
    await firebaseSignOut(auth)
    setUser(null)
    setFamily(null)
  }

  const refreshUser = async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser)
    }
  }

  const completeTrustedContactSetup = async (contacts: TrustedContactFormData[]) => {
    if (!db || !user || !family) throw new Error("Not authenticated")

    // Add trusted contacts
    for (const contact of contacts) {
      await addDoc(collection(db, "trusted_contacts"), {
        familyId: family.id,
        addedByUserId: user.id,
        addedByUserName: user.displayName,
        fullName: contact.fullName,
        email: contact.email,
        relationship: contact.relationship || null,
        createdAt: serverTimestamp(),
        hasEmergencyAccess: false,
      })

      // Send notification email (via API route)
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
    }

    // Update user onboarding status
    await setDoc(
      doc(db, "users", user.id),
      {
        hasCompletedOnboarding: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    // Create audit log
    await addDoc(collection(db, "audit_logs"), {
      familyId: family.id,
      userId: user.id,
      userName: user.displayName,
      action: "trusted_contacts_setup_completed",
      resourceType: "trusted_contact",
      details: { contactCount: contacts.length },
      createdAt: serverTimestamp(),
    })

    await refreshUser()
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        family,
        isLoading,
        isAuthenticated: !!firebaseUser && !!user,
        signUp,
        signIn,
        signOut,
        refreshUser,
        completeTrustedContactSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
