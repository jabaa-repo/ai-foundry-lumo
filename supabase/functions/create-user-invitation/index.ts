import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  display_name: string;
  role: string;
  position?: string;
  team?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has admin privileges
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || !["system_admin", "project_owner"].includes(userRole.role)) {
      throw new Error("Insufficient permissions");
    }

    const { email, display_name, role, position, team }: CreateUserRequest = await req.json();

    // Generate a random password for the invitation
    const tempPassword = crypto.randomUUID();

    // Create the user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name,
      },
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    // Create user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleError) {
      throw roleError;
    }

    // Update profile with team and position if provided
    if (position || team) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          team: team || null,
          position: position || null,
        })
        .eq("id", newUser.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    }

    // Send password reset email to allow user to set their own password
    const { data: recoveryData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${req.headers.get("origin")}/auth`,
      },
    });

    if (resetError) {
      console.error("Reset link error:", resetError);
      throw new Error("Failed to generate password reset link");
    }

    // Send invitation email via fetch to Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Hubo!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${display_name}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You have been invited to join Hubo. Your account has been created with the following role: <strong>${role.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong>.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Click the button below to set your password and access your account:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoveryData.properties.action_link}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                Set Your Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              <strong>Hubo</strong><br>
              From source to success
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hubo <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to Hubo - Set Your Password",
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error("Email send error:", emailError);
      throw new Error("Failed to send invitation email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        message: "User created successfully. Password reset email sent.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in create-user-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
