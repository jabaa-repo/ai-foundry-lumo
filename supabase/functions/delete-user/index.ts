import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    if (!userRole || userRole.role !== 'system_admin') {
      throw new Error("Only system administrators can delete users");
    }

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Prevent self-deletion
    if (userId === user.id) {
      throw new Error("You cannot delete your own account");
    }

    // Clean up dependent references to avoid FK violations
    // 1) Check tasks assigned count
    const { count: beforeCount, error: beforeCountErr } = await supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId);
    if (beforeCountErr) console.error('Count check (before) failed:', beforeCountErr);

    // 2) Unassign tasks assigned to this user
    const { error: tasksUnassignError } = await supabaseAdmin
      .from('tasks')
      .update({ assigned_to: null })
      .eq('assigned_to', userId);
    if (tasksUnassignError) {
      console.error('Failed to unassign tasks:', tasksUnassignError);
    }

    // 3) Also clear other potential user references to avoid future FK blocks
    await supabaseAdmin.from('tasks').update({ owner_id: null }).eq('owner_id', userId);
    await supabaseAdmin.from('tasks').update({ accountable_id: null }).eq('accountable_id', userId);
    await supabaseAdmin.from('projects').update({ owner_id: null }).eq('owner_id', userId);
    await supabaseAdmin.from('projects').update({ responsible_id: null }).eq('responsible_id', userId);
    await supabaseAdmin.from('projects').update({ accountable_id: null }).eq('accountable_id', userId);

    // 4) Remove task responsible assignments
    const { error: respDeleteError } = await supabaseAdmin
      .from('task_responsible_users')
      .delete()
      .eq('user_id', userId);
    if (respDeleteError) {
      console.error('Failed to delete task responsible entries:', respDeleteError);
    }

    // 5) Verify no tasks still assigned to the user
    const { count: afterCount, error: afterCountErr } = await supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId);
    if (afterCountErr) console.error('Count check (after) failed:', afterCountErr);
    console.log('Assigned tasks count before/after cleanup:', beforeCount, afterCount);

    if ((afterCount ?? 0) > 0) {
      throw new Error(`Cannot delete user: ${afterCount} tasks still assigned`);
    }

    // 6) Now delete the user using admin API (profiles/user_roles will cascade)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in delete-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
