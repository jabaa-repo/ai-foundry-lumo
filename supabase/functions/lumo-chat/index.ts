import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch user's data for context
    const { data: ideas } = await supabaseClient
      .from('ideas')
      .select('*')
      .limit(50);

    const { data: tasks } = await supabaseClient
      .from('tasks')
      .select('*')
      .limit(50);

    const { data: projects } = await supabaseClient
      .from('projects')
      .select('*')
      .limit(20);

    // Build context for the AI
    const contextMessage = `
You are LUMO, an AI Chief of Staff assistant for project and task management. You help users manage their ideas, tasks, and projects.

Current user data:
- Ideas: ${ideas?.length || 0} total
  * Inbox: ${ideas?.filter(i => i.status === 'inbox').length || 0}
  * Business Backlog: ${ideas?.filter(i => i.status === 'business_backlog').length || 0}
  * Engineering Backlog: ${ideas?.filter(i => i.status === 'engineering_backlog').length || 0}
  * Outcomes Backlog: ${ideas?.filter(i => i.status === 'outcomes_backlog').length || 0}
- Tasks: ${tasks?.length || 0} total
  * Todo: ${tasks?.filter(t => t.status === 'todo').length || 0}
  * In Progress: ${tasks?.filter(t => t.status === 'in_progress').length || 0}
  * Blocked: ${tasks?.filter(t => t.status === 'blocked').length || 0}
  * Done: ${tasks?.filter(t => t.status === 'done').length || 0}
- Projects: ${projects?.length || 0} total

Be professional, concise, and proactive. Provide actionable insights and suggestions.
`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: contextMessage },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Save chat message to database
    await supabaseClient.from('chat_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: aiResponse }
    ]);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lumo-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});