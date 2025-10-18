import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

const createUserSchema = z.object({
  email: z.string().trim().email("Invalid email format").max(255, "Email too long"),
  display_name: z.string().trim().min(1, "Display name required").max(100, "Display name too long"),
  role: z.enum(["system_admin", "project_owner", "team_member", "management"], {
    errorMap: () => ({ message: "Invalid role" }),
  }),
  position: z.string().trim().max(100).optional(),
  team: z.string().trim().max(100).optional(),
});

Deno.serve(async (req: Request) => {
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
      },
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has admin privileges
    const { data: userRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).single();

    if (!userRole || !["system_admin", "project_owner"].includes(userRole.role)) {
      throw new Error("Insufficient permissions");
    }

    const requestBody = await req.json();

    // Validate input
    const validationResult = createUserSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input data",
          details: validationResult.error.errors,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const { email, display_name, role, position, team } = validationResult.data;

    // Map team names to database enum values
    const teamMapping: Record<string, string> = {
      "Business Innovation": "business_innovation",
      Engineering: "engineering",
      Adoption: "adoption_outcomes",
      "Outcomes & Adoption": "adoption_outcomes",
    };

    const dbTeam = team ? teamMapping[team] || null : null;

    // Generate a strong temporary password (12+ characters with complexity)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((x) => chars[x % chars.length])
      .join("");

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
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: role,
    });

    if (roleError) {
      throw roleError;
    }

    // Update profile with team and position if provided
    if (position || dbTeam) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          team: dbTeam,
          position: position || null,
        })
        .eq("id", newUser.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        throw profileError; // Throw error so user knows something went wrong
      }
    }

    // Mark in profile that password needs to be changed
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ needs_password_change: true })
      .eq("id", newUser.user.id);

    if (profileUpdateError) {
      console.error("Profile update error:", profileUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        temporary_password: tempPassword,
        message: "User created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error in create-user-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
