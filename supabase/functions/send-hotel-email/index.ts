import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HotelEmailRequest {
  hotelName: string;
  hotelEmail: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  hotelAddress?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      hotelName,
      hotelEmail,
      customerName,
      customerEmail,
      subject,
      message,
      hotelAddress,
      checkInDate,
      checkOutDate,
      guests,
    }: HotelEmailRequest = await req.json();

    console.log(`Sending email to hotel: ${hotelName} at ${hotelEmail}`);

    // Create a professional email template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #007BFF; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #007BFF; margin: 0;">Hotel Inquiry</h1>
          <p style="color: #666; margin: 5px 0 0 0;">From ${customerName}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Contact Information</h2>
          <p><strong>Name:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
        </div>

        ${checkInDate || checkOutDate || guests ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Stay Details</h2>
            ${checkInDate ? `<p><strong>Check-in Date:</strong> ${new Date(checkInDate).toLocaleDateString()}</p>` : ''}
            ${checkOutDate ? `<p><strong>Check-out Date:</strong> ${new Date(checkOutDate).toLocaleDateString()}</p>` : ''}
            ${guests ? `<p><strong>Number of Guests:</strong> ${guests}</p>` : ''}
          </div>
        ` : ''}

        <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Message</h2>
          <div style="white-space: pre-wrap; line-height: 1.6;">${message}</div>
        </div>

        <div style="border-top: 1px solid #dee2e6; padding-top: 20px; color: #666; font-size: 14px;">
          <p>This email was sent through your hotel's contact form. Please respond directly to the customer's email address: ${customerEmail}</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Hotel Inquiry <onboarding@resend.dev>",
      to: [hotelEmail],
      replyTo: customerEmail,
      subject: `Hotel Inquiry: ${subject}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Send confirmation email to customer
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #28a745; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #28a745; margin: 0;">Message Sent Successfully!</h1>
        </div>
        
        <p>Dear ${customerName},</p>
        
        <p>Your message has been successfully sent to <strong>${hotelName}</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Your message:</h3>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="white-space: pre-wrap; border-left: 3px solid #28a745; padding-left: 15px; margin: 10px 0;">${message}</div>
        </div>
        
        <p>The hotel should respond directly to this email address. If you don't hear back within 24-48 hours, you may want to contact them directly.</p>
        
        ${hotelAddress ? `<p><strong>Hotel Address:</strong> ${hotelAddress}</p>` : ''}
        
        <p>Thank you for using our service!</p>
      </div>
    `;

    await resend.emails.send({
      from: "Hotel Contact Service <onboarding@resend.dev>",
      to: [customerEmail],
      subject: `Confirmation: Your message to ${hotelName}`,
      html: confirmationHtml,
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-hotel-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);