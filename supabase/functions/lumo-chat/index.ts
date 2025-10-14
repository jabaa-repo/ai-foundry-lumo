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
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the JWT from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify and get user from JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth verification failed:', userError);
      throw new Error('Unauthorized');
    }
    
    console.log('Authenticated user:', user.id);

    // Fetch user's data for context using admin client
    const { data: ideas } = await supabaseAdmin
      .from('ideas')
      .select('*')
      .eq('owner_id', user.id)
      .limit(50);

    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('owner_id', user.id)
      .limit(50);

    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .limit(20);

    // Build context for the AI
    const contextMessage = `
You are LUMO, an AI Chief of Staff assistant for project and task management. You help users manage their ideas, tasks, and projects.

Current user data:
- Ideas: ${ideas?.length || 0} total
  * Inbox: ${ideas?.filter(i => i.status === 'inbox').length || 0}
  * Triaged: ${ideas?.filter(i => i.status === 'triaged').length || 0}
  * Backlog: ${ideas?.filter(i => i.status === 'backlog').length || 0}
    - Business: ${ideas?.filter(i => i.status === 'backlog' && i.category === 'business').length || 0}
    - Software: ${ideas?.filter(i => i.status === 'backlog' && i.category === 'software').length || 0}
    - Adoption: ${ideas?.filter(i => i.status === 'backlog' && i.category === 'adoption').length || 0}
- Tasks: ${tasks?.length || 0} total
  * Todo: ${tasks?.filter(t => t.status === 'todo').length || 0}
  * In Progress: ${tasks?.filter(t => t.status === 'in_progress').length || 0}
  * Blocked: ${tasks?.filter(t => t.status === 'blocked').length || 0}
  * Done: ${tasks?.filter(t => t.status === 'done').length || 0}
- Projects: ${projects?.length || 0} total
  * Draft: ${projects?.filter(p => p.status === 'draft').length || 0}
  * Live: ${projects?.filter(p => p.status === 'live').length || 0}
  * Completed: ${projects?.filter(p => p.status === 'completed').length || 0}

Be professional, concise, and proactive. Provide actionable insights and suggestions.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: contextMessage },
          { role: 'user', content: message }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Save LLM action to database
    await supabaseAdmin.from('llm_actions').insert([{
      action_type: 'chat_response',
      user_id: user.id,
      input_payload: { message },
      response_raw: aiResponse,
      consumed: true
    }]);

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