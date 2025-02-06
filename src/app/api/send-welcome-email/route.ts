import { createTransport } from "nodemailer";

// Simplified Nodemailer configuration
const transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

// Track emails sent to prevent duplicates
const emailsSent = new Set<string>();

export async function POST(request: Request) {
  try {
    const { email, name, isNewUser } = await request.json();

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Email and name are required" }),
        { status: 400 }
      );
    }

    if (!isNewUser || emailsSent.has(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Welcome email already sent or user is not new",
        }),
        { status: 200 }
      );
    }

    const mailOptions = {
      from: {
        name: "PromptPilot Team",
        address: process.env.SMTP_USER as string,
      },
      to: email,
      subject: "Welcome to PromptPilot - Let's Enhance Your AI Prompts! 🚀",
      headers: {
        "List-Unsubscribe": `<https://promptpilot7.vercel.app>`,
      },
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="width: 100%; background-color: #f8fafc; padding: 40px 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700;">Welcome to PromptPilot! 🚀</h1>
              </div>

              <!-- Main Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #1F2937; font-size: 22px; margin: 0 0 20px;">Hello ${name},</h2>
                
                <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  Thank you for joining PromptPilot! We're excited to help you create more powerful and effective AI prompts.
                </p>

                <!-- Feature Grid -->
                <div style="background: #F8FAFC; border-radius: 12px; padding: 24px; margin: 30px 0;">
                  <h3 style="color: #1F2937; font-size: 18px; margin: 0 0 20px;">🎯 What you can do with PromptPilot:</h3>
                  <ul style="color: #4B5563; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 12px;">Transform simple prompts into powerful, detailed instructions</li>
                    <li style="margin-bottom: 12px;">Leverage our multilingual support for both English and Hindi</li>
                    <li style="margin-bottom: 12px;">Get instant AI-powered refinements for better results</li>
                    <li style="margin-bottom: 0;">Access a growing library of prompt templates</li>
                  </ul>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="https://promptpilot7.vercel.app" 
                     style="display: inline-block; background: #4F46E5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Start Enhancing Prompts →
                  </a>
                </div>

                <!-- Pro Tip -->
                <div style="background: #EEF2FF; border-left: 4px solid #4F46E5; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
                  <h4 style="color: #1F2937; font-size: 16px; margin: 0 0 8px;">🎯 Pro Tip:</h4>
                  <p style="color: #4B5563; font-size: 14px; margin: 0;">
                    Start with a simple prompt and let our AI enhance it for better results!
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                <div style="margin-bottom: 20px;">
                  <a href="https://twitter.com/itsmeekaran" style="color: #4F46E5; text-decoration: none; margin: 0 10px;">Twitter</a>
                  <a href="https://karandev.in" style="color: #4F46E5; text-decoration: none; margin: 0 10px;">Portfolio</a>
                </div>
                <p style="color: #6B7280; font-size: 12px; margin: 0 0 10px;">
                  © ${new Date().getFullYear()} Karan. All rights reserved.
                </p>
                <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                  You're receiving this email because you signed up for PromptPilot.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to PromptPilot, ${name}!

Thank you for joining PromptPilot. We're excited to help you create more powerful and effective AI prompts.

What you can do with PromptPilot:
• Transform simple prompts into powerful, detailed instructions
• Leverage our multilingual support for both English and Hindi
• Get instant AI-powered refinements for better results
• Access a growing library of prompt templates

Get started now at: https://promptpilot7.vercel.app

Pro Tip: Start with a simple prompt and let our AI enhance it for better results!

© ${new Date().getFullYear()} Karan. All rights reserved.`,
    };

    const info = await transporter.sendMail(mailOptions);
    emailsSent.add(email);

    console.log("Welcome email sent successfully:", info.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: info.messageId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send welcome email",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
