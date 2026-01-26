import { NextRequest, NextResponse } from "next/server"
import { sendEmergencyResolvedNotification } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { contactEmail, contactName, familyName, resolvedByName } = await request.json()

    if (!contactEmail || !contactName || !familyName || !resolvedByName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    await sendEmergencyResolvedNotification({
      contactEmail,
      contactName,
      familyName,
      resolvedByName,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Email error:", error)
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}
