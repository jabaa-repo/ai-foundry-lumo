import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WORKFLOW_CONTEXT = {
  1: { name: "Diagnose Current Situation", division: "Business Innovation", roles: ["business_analyst", "ai_process_reengineer", "ai_innovation_executive"] },
  2: { name: "Redesign with AI", division: "Business Innovation", roles: ["business_analyst", "ai_process_reengineer", "ai_innovation_executive"] },
  3: { name: "Identify Leap of Faith Assumptions", division: "Business Innovation", roles: ["business_analyst", "ai_process_reengineer", "ai_innovation_executive"] },
  4: { name: "Translate to Technical Specifications", division: "Engineering", roles: ["ai_system_architect", "ai_system_engineer", "ai_data_engineer"] },
  5: { name: "Build Enterprise-Scale Solutions", division: "Engineering", roles: ["ai_system_architect", "ai_system_engineer", "ai_data_engineer"] },
  6: { name: "Analytics and Continuous Delivery", division: "Engineering", roles: ["ai_system_architect", "ai_system_engineer", "ai_data_engineer"] },
  7: { name: "Monitor and Improve", division: "Adoption", roles: ["outcomes_analytics_executive", "education_implementation_executive", "change_leadership_architect"] },
  8: { name: "Training and Talent", division: "Adoption", roles: ["outcomes_analytics_executive", "education_implementation_executive", "change_leadership_architect"] },
  9: { name: "Outcomes and Rollout Planning", division: "Adoption", roles: ["outcomes_analytics_executive", "education_implementation_executive", "change_leadership_architect"] },
};

const ROLE_NAMES = {
  business_analyst: "Business Analyst",
  ai_process_reengineer: "AI Process Reengineer",
  ai_innovation_executive: "AI Innovation Executive",
  ai_system_architect: "AI System Architect",
  ai_system_engineer: "AI System Engineer",
  ai_data_engineer: "AI Data Engineer",
  outcomes_analytics_executive: "Outcomes & Analytics Executive",
  education_implementation_executive: "Education & Implementation Executive",
  change_leadership_architect: "Change Leadership Architect",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectData, additionalContext } = await req.json();
    
    if (!projectData) {
      throw new Error('Project data is required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const workflowStep = projectData.workflow_step || 1;
    const workflowInfo = WORKFLOW_CONTEXT[workflowStep as keyof typeof WORKFLOW_CONTEXT];

    const systemPrompt = `You are an AI Transformation Project assistant. Generate 3-5 specific, actionable tasks for the current workflow step.

Project: ${projectData.title}
Description: ${projectData.description || 'N/A'}
Workflow Step ${workflowStep}: ${workflowInfo.name}
Division: ${workflowInfo.division}

Available roles for this step: ${workflowInfo.roles.map(r => ROLE_NAMES[r as keyof typeof ROLE_NAMES]).join(', ')}

For each task, suggest:
1. A clear, specific task title
2. Which role should be RESPONSIBLE (does the work): choose from the available roles
3. Which role should be ACCOUNTABLE (owns the outcome): choose from the available roles
4. A brief description

Consider the project brief and desired outcomes:
${projectData.project_brief || 'N/A'}
${projectData.desired_outcomes || 'N/A'}${additionalContext || ''}`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate tasks for step ${workflowStep}: ${workflowInfo.name}` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_tasks",
            description: "Generate actionable tasks with role assignments",
            parameters: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Clear, specific task title" },
                      description: { type: "string", description: "Brief task description" },
                      responsible_role: { 
                        type: "string", 
                        enum: workflowInfo.roles,
                        description: "Role ID who does the work"
                      },
                      accountable_role: { 
                        type: "string", 
                        enum: workflowInfo.roles,
                        description: "Role ID who owns the outcome"
                      }
                    },
                    required: ["title", "description", "responsible_role", "accountable_role"]
                  }
                }
              },
              required: ["tasks"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_tasks" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('AI Response:', JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tasks generated by AI');
    }

    const tasksData = JSON.parse(toolCall.function.arguments);
    const generatedTasks = tasksData.tasks.map((task: any) => ({
      title: task.title,
      description: task.description,
      responsible_role: task.responsible_role,
      responsible_role_name: ROLE_NAMES[task.responsible_role as keyof typeof ROLE_NAMES],
      accountable_role: task.accountable_role,
      accountable_role_name: ROLE_NAMES[task.accountable_role as keyof typeof ROLE_NAMES],
    }));

    // Return tasks for review - don't insert yet
    return new Response(
      JSON.stringify({ 
        tasks: generatedTasks,
        workflowStep: workflowInfo,
        message: `Generated ${generatedTasks.length} tasks for review`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-tasks function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
