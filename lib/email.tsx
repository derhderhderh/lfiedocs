import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || "LifeDocs Family <noreply@lifedocs.family>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lifedocs.family"

export async function sendTrustedContactNotification({
  contactEmail,
  contactName,
  addedByName,
  familyName,
}: {
  contactEmail: string
  contactName: string
  addedByName: string
  familyName: string
}) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: contactEmail,
    subject: `You've been designated as a trusted contact for ${familyName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">LifeDocs Family</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${contactName},</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>${addedByName}</strong> has designated you as a trusted contact for their family vault in LifeDocs Family.
          </p>
          
          <div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #0d9488; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase;">What This Means</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>You currently have <strong>NO access</strong> to any documents</li>
              <li>If an emergency is triggered, you will receive an email with access details</li>
              <li>Emergency access is temporary and only granted during genuine emergencies</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            You don't need to take any action at this time. You will only be contacted again if an emergency situation arises.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you have questions or did not expect this notification, please contact ${addedByName} directly.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Best regards,<br />
            The LifeDocs Family Team
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    throw error
  }

  return data
}

export async function sendEmergencyTriggeredNotification({
  contactEmail,
  contactName,
  familyName,
  triggerType,
  triggeredByName,
  notes,
  accessToken,
}: {
  contactEmail: string
  contactName: string
  familyName: string
  triggerType: string
  triggeredByName: string
  notes?: string
  accessToken?: string
}) {
  const accessUrl = accessToken ? `${APP_URL}/emergency-access?token=${accessToken}` : APP_URL

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: contactEmail,
    subject: `URGENT: Emergency Access Granted - ${familyName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">URGENT: Emergency Access Granted</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${contactName},</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            An emergency has been triggered for <strong>${familyName}</strong> by <strong>${triggeredByName}</strong>.
          </p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 24px 0; border-radius: 8px;">
            <p style="color: #991b1b; margin: 0 0 8px 0; font-size: 14px;"><strong>Emergency Type:</strong> ${triggerType}</p>
            ${notes ? `<p style="color: #991b1b; margin: 0; font-size: 14px;"><strong>Additional Notes:</strong> ${notes}</p>` : ""}
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You now have temporary access to the family's emergency vault documents.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${accessUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Access Emergency Vault
            </a>
          </div>
          
          <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #854d0e; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase;">Important</h3>
            <ul style="color: #713f12; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
              <li>This access is temporary and may be revoked at any time</li>
              <li>All access is logged for audit purposes</li>
              <li>Please handle all information with care and sensitivity</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you believe this notification was sent in error, please contact the family directly.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Best regards,<br />
            The LifeDocs Family Team
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    throw error
  }

  return data
}

export async function sendEmergencyResolvedNotification({
  contactEmail,
  contactName,
  familyName,
  resolvedByName,
}: {
  contactEmail: string
  contactName: string
  familyName: string
  resolvedByName: string
}) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: contactEmail,
    subject: `Emergency Resolved - ${familyName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Emergency Resolved</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${contactName},</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            The emergency for <strong>${familyName}</strong> has been resolved by <strong>${resolvedByName}</strong>.
          </p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              Your access to the family's emergency vault has been revoked. You can no longer view any documents from this family.
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for being available during this time. Your support means a lot to the family.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you have any questions, please contact the family directly.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Best regards,<br />
            The LifeDocs Family Team
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    throw error
  }

  return data
}

export async function sendMemberInvitation({
  memberEmail,
  memberName,
  tempPassword,
  familyName,
  invitedByName,
}: {
  memberEmail: string
  memberName: string
  tempPassword: string
  familyName: string
  invitedByName: string
}) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: memberEmail,
    subject: `You've been added to ${familyName} on LifeDocs Family`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to LifeDocs Family</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${memberName},</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>${invitedByName}</strong> has added you to <strong>${familyName}</strong> on LifeDocs Family.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            LifeDocs Family is a secure platform for storing important family documents and preparing for emergencies.
          </p>
          
          <div style="background: #f0fdfa; border: 1px solid #99f6e4; padding: 20px; margin: 24px 0; border-radius: 8px;">
            <h3 style="color: #0d9488; margin: 0 0 16px 0; font-size: 16px;">To Get Started:</h3>
            <ol style="color: #374151; margin: 0; padding-left: 20px; line-height: 2;">
              <li>Visit <a href="${APP_URL}" style="color: #0d9488;">${APP_URL}</a></li>
              <li>Sign in with your email: <strong>${memberEmail}</strong></li>
              <li>Use this temporary password: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></li>
              <li>Set up your trusted contacts (required before accessing the vault)</li>
            </ol>
          </div>
          
          <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #854d0e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> Please change your password after logging in for the first time.
            </p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/auth/signin" style="display: inline-block; background: #0d9488; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Sign In Now
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you did not expect this invitation or have questions, please contact ${invitedByName} directly.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Best regards,<br />
            The LifeDocs Family Team
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    throw error
  }

  return data
}
