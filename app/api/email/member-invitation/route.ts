import { NextRequest, NextResponse } from "next/server"
import { sendMemberInvitation } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { memberEmail, memberName, tempPassword, familyName, invitedByName } =
      await request.json()

    if (!memberEmail || !memberName || !tempPassword || !familyName || !invitedByName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    await sendMemberInvitation({
      memberEmail,
      memberName,
      tempPassword,
      familyName,
      invitedByName,
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
