import { NextRequest, NextResponse } from "next/server"
import { sendTrustedContactNotification } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { contactEmail, contactName, addedByName, familyName } = await request.json()

    if (!contactEmail || !contactName || !addedByName || !familyName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    await sendTrustedContactNotification({
      contactEmail,
      contactName,
      addedByName,
      familyName,
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
