import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, previousBacklog, nextBacklog, additionalContext } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fetch project details
    const projectResponse = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${projectId}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    const projects = await projectResponse.json();
    const project = projects[0];

    if (!project) {
      throw new Error('Project not found');
    }

    // Fetch previous backlog tasks
    const tasksResponse = await fetch(
      `${supabaseUrl}/rest/v1/tasks?project_id=eq.${projectId}&backlog=eq.${previousBacklog}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const previousTasks = await tasksResponse.json();

    // Fetch task attachments for context
    const taskIds = previousTasks.map((t: any) => t.id);
    let attachments = [];
    if (taskIds.length > 0) {
      const attachmentsResponse = await fetch(
        `${supabaseUrl}/rest/v1/task_attachments?task_id=in.(${taskIds.join(',')})&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      attachments = await attachmentsResponse.json();
    }

    // Build context from previous work
    const previousWorkContext = previousTasks.map((task: any) => ({
      title: task.title,
      description: task.description,
      status: task.status,
    }));

    const backlogDescriptions: Record<string, string> = {
      'engineering': `Engineering & Development - Focus on technical implementation, architecture, and development tasks
      
Engineering Team Roles:
- AI System Architect: Translate to Technical Specifications – Convert business requirements into detailed, build-ready documentation.
- AI System Engineer: Build Enterprise-Scale Solutions – Implement the required systems, integrating AI components.
- AI Data Engineer: Analytics and Continuous Delivery – Establish analytics platforms, monitor results, and support CI/CD.`,
      'outcomes_adoption': 'Outcomes & Adoption - Focus on launch, user adoption, measuring outcomes, and iteration',
    };

    const systemPrompt = `You are a project management AI assistant. Generate actionable tasks for the ${nextBacklog} backlog phase.

Project Details:
- Title: ${project.title}
- Description: ${project.description}
- Project Brief: ${project.project_brief}
- Desired Outcomes: ${project.desired_outcomes}

Previous Backlog (${previousBacklog}) Completed Work:
${JSON.stringify(previousWorkContext, null, 2)}

Number of attachments/documents from previous phase: ${attachments.length}
${additionalContext || ''}

Current Backlog Phase: ${backlogDescriptions[nextBacklog] || nextBacklog}

Generate 4-6 specific, actionable tasks for the ${nextBacklog} phase that:
1. Build upon the work completed in the ${previousBacklog} phase
2. Are appropriate for the ${nextBacklog} stage
3. Have clear deliverables and success criteria
4. Include role assignments (accountable and responsible) based on the roles defined above
5. Each task should have 3-5 concrete checklist items (activities) that break down the work into actionable steps`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate tasks for this backlog phase.' }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_tasks',
            description: 'Generate tasks for the current backlog phase with checklist items',
            parameters: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      accountable_role: { type: 'string' },
                      responsible_role: { type: 'string' },
                      activities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '3-5 concrete checklist items for this task'
                      }
                    },
                    required: ['title', 'description', 'accountable_role', 'responsible_role', 'activities']
                  }
                }
              },
              required: ['tasks']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_tasks' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const generatedTasks = JSON.parse(toolCall.function.arguments).tasks;

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasks: generatedTasks,
        backlog: nextBacklog
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
