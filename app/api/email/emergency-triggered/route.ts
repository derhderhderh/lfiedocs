import { NextRequest, NextResponse } from "next/server"
import { sendEmergencyTriggeredNotification } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { contactEmail, contactName, familyName, triggerType, triggeredByName, notes, accessToken } =
      await request.json()

    if (!contactEmail || !contactName || !familyName || !triggerType || !triggeredByName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    await sendEmergencyTriggeredNotification({
      contactEmail,
      contactName,
      familyName,
      triggerType,
      triggeredByName,
      notes,
      accessToken,
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
