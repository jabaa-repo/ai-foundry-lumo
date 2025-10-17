import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, Calendar, Paperclip, X, Sparkles, CheckCircle2, XCircle, Plus, Trash2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ManualTask {
  id: string;
  title: string;
  description: string;
}

interface ConvertToProjectDialogProps {
  idea: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ConvertToProjectDialog({ idea, open, onOpenChange, onSuccess }: ConvertToProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [aiTag, setAiTag] = useState("");
  const [projectBrief, setProjectBrief] = useState("");
  const [desiredOutcomes, setDesiredOutcomes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [workflowInfo, setWorkflowInfo] = useState<any>(null);
  const [manualTasks, setManualTasks] = useState<ManualTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [isRewritingTasks, setIsRewritingTasks] = useState(false);
  const { toast } = useToast();

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please attach a file smaller than 5MB",
      });
      return;
    }

    setAttachedFile(file);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFileContent("");
  };

  const removeGeneratedTask = (index: number) => {
    setGeneratedTasks(generatedTasks.filter((_, i) => i !== index));
  };

  const updateTaskActivity = (taskIndex: number, activityIndex: number, newValue: string) => {
    const updated = [...generatedTasks];
    updated[taskIndex].activities[activityIndex] = newValue;
    setGeneratedTasks(updated);
  };

  const deleteTaskActivity = (taskIndex: number, activityIndex: number) => {
    const updated = [...generatedTasks];
    updated[taskIndex].activities.splice(activityIndex, 1);
    setGeneratedTasks(updated);
  };

  const addTaskActivity = (taskIndex: number) => {
    const updated = [...generatedTasks];
    if (!updated[taskIndex].activities) {
      updated[taskIndex].activities = [];
    }
    updated[taskIndex].activities.push('New activity');
    setGeneratedTasks(updated);
  };

  const handleGenerateAI = async () => {
    if (!idea?.title || !idea?.description) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Idea must have title and description",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to use AI assistance",
      });
      return;
    }

    setAiGenerating(true);
    try {
      const fileContext = fileContent ? `\n\nAttached File Content:\n${fileContent}` : '';
      
      const { data, error } = await supabase.functions.invoke('lumo-chat', {
        body: { 
          message: `Based on this idea, generate:
1. A single-word tag (in UPPERCASE) that captures the essence of this project
2. A project brief listing expected features (5-8 items as bullet points with - or •)
3. Desired outcomes as bullet points (3-5 items with - or •)

Idea Title: ${idea.title}
Idea Description: ${idea.description}${fileContext}

Format your response as:
TAG: [single uppercase word]
BRIEF:
- Feature 1
- Feature 2
...
OUTCOMES:
- Outcome 1
- Outcome 2
...`
        }
      });

      if (error) throw error;

      const response = data.response;
      
      const tagMatch = response.match(/TAG:\s*([A-Z]+)/);
      const briefMatch = response.match(/BRIEF:\s*(.+?)(?=\nOUTCOMES:|$)/s);
      const outcomesMatch = response.match(/OUTCOMES:\s*(.+?)$/s);
      
      if (tagMatch && tagMatch[1]) {
        setAiTag(tagMatch[1].trim());
      }
      if (briefMatch && briefMatch[1]) {
        const briefText = briefMatch[1].trim();
        setProjectBrief(briefText);
      }
      if (outcomesMatch && outcomesMatch[1]) {
        const outcomesText = outcomesMatch[1].trim();
        setDesiredOutcomes(outcomesText);
      }

      toast({
        title: "AI Generated",
        description: "Project details generated. Review and edit as needed.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate AI content",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const addManualTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const task: ManualTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
    };
    
    setManualTasks([...manualTasks, task]);
    setNewTaskTitle("");
    setNewTaskDesc("");
  };

  const removeManualTask = (id: string) => {
    setManualTasks(manualTasks.filter(t => t.id !== id));
  };

  const handleRewriteTasks = async () => {
    if (manualTasks.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one task first",
      });
      return;
    }

    setIsRewritingTasks(true);
    try {
      const tasksPrompt = manualTasks.map(t => `Title: ${t.title}\nDescription: ${t.description}`).join('\n\n');
      
      const { data, error } = await supabase.functions.invoke('lumo-chat', {
        body: { 
          message: `Rewrite these tasks in a professional, consistent tone and style. Keep the same meaning but make them clearer and more actionable:

${tasksPrompt}

Format each task as:
TASK:
Title: [rewritten title]
Description: [rewritten description]
---`
        }
      });

      if (error) throw error;

      const response = data.response;
      const taskBlocks = response.split('---').filter((b: string) => b.trim());
      
      const rewrittenTasks = taskBlocks.map((block: string) => {
        const titleMatch = block.match(/Title:\s*(.+)/);
        const descMatch = block.match(/Description:\s*(.+)/s);
        
        return {
          id: crypto.randomUUID(),
          title: titleMatch?.[1]?.trim() || '',
          description: descMatch?.[1]?.trim() || '',
        };
      }).filter(t => t.title);

      setManualTasks(rewrittenTasks);
      
      toast({
        title: "Tasks Rewritten",
        description: "AI has rewritten your tasks in a consistent style",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to rewrite tasks",
      });
    } finally {
      setIsRewritingTasks(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!idea?.title || !idea?.description) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Idea must have title and description",
      });
      return;
    }

    if (!aiTag || !projectBrief.trim() || !desiredOutcomes.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please generate project details first",
      });
      return;
    }

    setIsGeneratingTasks(true);
    try {
      const projectData = {
        title: idea.title,
        description: idea.description,
        project_brief: projectBrief,
        desired_outcomes: desiredOutcomes,
        workflow_step: 1
      };

      const fileContext = fileContent ? `\n\nAdditional Context from Attached File:\n${fileContent}` : '';

      const { data, error } = await supabase.functions.invoke('generate-tasks', {
        body: { 
          projectData,
          additionalContext: fileContext
        }
      });

      if (error) throw error;

      if (data?.tasks) {
        // Generate activities for each task
        const tasksWithActivities = await Promise.all(
          data.tasks.map(async (task: any) => {
            try {
              const activityResponse = await supabase.functions.invoke('lumo-chat', {
                body: {
                  message: `Generate 3-5 specific, actionable activities (subtasks) for this task:
                  
Task: ${task.title}
Description: ${task.description}
${fileContext}

Return only a simple bullet list of activities, one per line starting with "- "`
                }
              });

              if (activityResponse.data) {
                const activities = activityResponse.data.response
                  .split('\n')
                  .filter((line: string) => line.trim().startsWith('-'))
                  .map((line: string) => line.replace(/^-\s*/, '').trim());
                
                return { ...task, activities };
              }
              return { ...task, activities: [] };
            } catch {
              return { ...task, activities: [] };
            }
          })
        );

        setGeneratedTasks(tasksWithActivities);
        setWorkflowInfo(data.workflowStep);
        toast({
          title: "Tasks Generated",
          description: `Generated ${tasksWithActivities.length} tasks with activities`,
        });
      }
    } catch (error: any) {
      console.error('Task generation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate tasks",
      });
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const handleConvert = async () => {
    if (!aiTag || aiTag.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please generate AI tag first",
      });
      return;
    }

    if (!projectBrief.trim() || !desiredOutcomes.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Project Brief and Desired Outcomes are required",
      });
      return;
    }

    if (!dueDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Due date is required",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate project number
      const { data: projectNumber, error: rpcError } = await (supabase as any).rpc('generate_project_number', {
        ai_tag: aiTag.toUpperCase()
      });

      if (rpcError) throw rpcError;

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: idea.title,
          description: idea.description,
          project_brief: projectBrief,
          desired_outcomes: desiredOutcomes,
          due_date: dueDate,
          project_number: projectNumber,
          departments: idea.departments || [],
          owner_id: user.id,
          responsible_id: idea.responsible_id,
          accountable_id: idea.accountable_id,
          consulted_ids: idea.consulted_ids || [],
          informed_ids: idea.informed_ids || [],
          workflow_step: 1,
          backlog: 'business_innovation',
          status: 'recent',
          last_activity_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Update idea to mark as converted and link to project
      const { error: ideaError } = await supabase
        .from('ideas')
        .update({
          project_id: project.id,
          status: 'inbox' as any
        } as any)
        .eq('id', idea.id);

      if (ideaError) throw ideaError;

      // Combine all tasks
      const allTasks = [...generatedTasks, ...manualTasks];

      // Insert tasks if any
      if (allTasks.length > 0) {
        const tasksToInsert = allTasks.map((task: any) => ({
          title: task.title,
          description: task.description,
          idea_id: idea.id,
          project_id: project.id,
          owner_id: user.id,
          status: 'unassigned' as const,
          backlog: 'business_innovation' as const,
          responsible_role: task.responsible_role_name || null,
          accountable_role: task.accountable_role_name || null
        }));

        const { data: createdTasks, error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert)
          .select();

        if (tasksError) {
          console.error('Error creating tasks:', tasksError);
          toast({
            variant: "destructive",
            title: "Warning",
            description: "Project created but some tasks failed to save",
          });
        } else if (createdTasks) {
          // Insert activities for tasks that have them
          for (let i = 0; i < createdTasks.length; i++) {
            const task = createdTasks[i];
            const sourceTask = allTasks[i];
            
            if (sourceTask.activities && sourceTask.activities.length > 0) {
              const activitiesToInsert = sourceTask.activities.map((activity: string) => ({
                task_id: task.id,
                title: activity,
                completed: false
              }));

              await supabase.from('task_activities').insert(activitiesToInsert);
            }
          }
        }
      }

      toast({
        title: "Success!",
        description: `Project ${projectNumber} created${allTasks.length > 0 ? ` with ${allTasks.length} tasks` : ''} and moved to Business Innovation backlog`,
      });
      
      // Close both dialogs and refresh
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-card border-border overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <DialogTitle>Convert to Project: {idea?.title}</DialogTitle>
          </div>
          <DialogDescription>
            Transform this idea into a tracked project with a unique project number
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Attach File (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileAttach}
                accept=".txt,.md,.doc,.docx,.pdf"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={aiGenerating}
                className="flex-1"
              >
                <Paperclip className="mr-2 h-4 w-4" />
                {attachedFile ? attachedFile.name : "Attach File for AI Context"}
              </Button>
              {attachedFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  disabled={aiGenerating}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Attach a file to provide additional context for AI generation (max 5MB)
            </p>
          </div>

          <Button
            type="button"
            onClick={handleGenerateAI}
            disabled={aiGenerating}
            className="w-full"
          >
            {aiGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI Generating Project Details...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Generate Project Details with AI
              </>
            )}
          </Button>

          <div className="space-y-2">
            <Label>Project Tag *</Label>
            <Input
              placeholder="e.g., LOAN, PAYMENT"
              value={aiTag}
              onChange={(e) => setAiTag(e.target.value.toUpperCase())}
              className="uppercase"
              disabled={aiGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Format: TAG-DDMMYYYY-001
            </p>
          </div>

          <div className="space-y-2">
            <Label>Project Brief (Expected Features) *</Label>
            <Textarea
              value={projectBrief}
              onChange={(e) => setProjectBrief(e.target.value)}
              placeholder="- Feature 1&#10;- Feature 2&#10;- Feature 3"
              rows={6}
              disabled={aiGenerating}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              List expected features using bullet points (- or •)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Desired Outcomes *</Label>
            <Textarea
              value={desiredOutcomes}
              onChange={(e) => setDesiredOutcomes(e.target.value)}
              placeholder="- Outcome 1&#10;- Outcome 2&#10;- Outcome 3"
              rows={4}
              disabled={aiGenerating}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              List desired outcomes using bullet points (- or •)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="pl-10"
                disabled={aiGenerating}
                required
              />
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-semibold mb-1">Project Setup</p>
            <p className="text-sm text-muted-foreground">
              <strong>Title:</strong> {idea?.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Backlog:</strong> Business Innovation (Step 1)
            </p>
            {idea?.departments && idea.departments.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Tags:</strong> {idea.departments.join(', ')}
              </p>
            )}
            {aiTag && (
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Number Preview:</strong> {aiTag}-{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '')}-001
              </p>
            )}
          </div>

          {/* Task Generation Section */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-base">AI Task Generation (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateTasks}
                disabled={isGeneratingTasks || !aiTag || !projectBrief.trim()}
                className="border-primary text-primary hover:bg-primary/10"
              >
                {isGeneratingTasks ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Tasks with AI
                  </>
                )}
              </Button>
            </div>
            
            {generatedTasks.length > 0 && (
              <Card className="border-primary/20">
                <CardContent className="pt-4 space-y-3">
                   <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {generatedTasks.length} Tasks Generated
                      </p>
                      {workflowInfo && (
                        <p className="text-xs text-muted-foreground">
                          For {workflowInfo.name} ({workflowInfo.division})
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setGeneratedTasks([])}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  </div>
                  
                   <div className="space-y-2 max-h-64 overflow-y-auto">
                     {generatedTasks.map((task: any, index: number) => (
                       <Card key={index} className="bg-muted/50">
                         <CardContent className="pt-3 space-y-2">
                           <div className="flex items-start justify-between gap-2">
                             <div className="flex-1">
                               <p className="text-sm font-medium">{task.title}</p>
                               <p className="text-xs text-muted-foreground">{task.description}</p>
                             </div>
                             <Button
                               type="button"
                               variant="ghost"
                               size="icon"
                               onClick={() => removeGeneratedTask(index)}
                               className="h-7 w-7 flex-shrink-0"
                             >
                               <Trash2 className="h-3.5 w-3.5" />
                             </Button>
                           </div>
                           <div className="flex gap-2 flex-wrap">
                             <Badge variant="outline" className="text-xs">
                               <strong>R:</strong> {task.responsible_role_name}
                             </Badge>
                             <Badge variant="outline" className="text-xs">
                               <strong>A:</strong> {task.accountable_role_name}
                             </Badge>
                           </div>
                           {task.activities && task.activities.length > 0 && (
                             <div className="mt-2 pl-2 border-l-2 border-border space-y-1.5">
                               <div className="flex items-center justify-between">
                                 <p className="text-xs font-medium">Activities:</p>
                                 <Button
                                   type="button"
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => addTaskActivity(index)}
                                   className="h-6 text-xs px-2"
                                 >
                                   <Plus className="h-3 w-3 mr-1" />
                                   Add
                                 </Button>
                               </div>
                               <div className="space-y-1">
                                 {task.activities.map((activity: string, i: number) => (
                                   <div key={i} className="flex items-center gap-1.5 group">
                                     <span className="text-muted-foreground">•</span>
                                     <Input
                                       value={activity}
                                       onChange={(e) => updateTaskActivity(index, i, e.target.value)}
                                       className="text-xs h-7 flex-1 bg-background"
                                     />
                                     <Button
                                       type="button"
                                       variant="ghost"
                                       size="icon"
                                       onClick={() => deleteTaskActivity(index, i)}
                                       className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                     >
                                       <X className="h-3 w-3" />
                                     </Button>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                         </CardContent>
                       </Card>
                     ))}
                   </div>
                  
                   <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/10 p-2 rounded">
                     <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                     <p>
                       These tasks with activities will be created when you convert to project.
                     </p>
                   </div>
                 </CardContent>
               </Card>
             )}

            {/* Manual Task Addition */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base">Manual Tasks (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRewriteTasks}
                  disabled={isRewritingTasks || manualTasks.length === 0}
                  className="border-primary text-primary hover:bg-primary/10"
                  size="sm"
                >
                  {isRewritingTasks ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Rewriting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3 w-3" />
                      AI Rewrite
                    </>
                  )}
                </Button>
              </div>

              <Card className="border-border">
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-2">
                    <Input
                      placeholder="Task title"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Task description"
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      type="button"
                      onClick={addManualTask}
                      disabled={!newTaskTitle.trim()}
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                  </div>

                  {manualTasks.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {manualTasks.map((task) => (
                        <Card key={task.id} className="bg-muted/50">
                          <CardContent className="pt-3 pb-3 pr-3 flex justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground">{task.description}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeManualTask(task.id)}
                              className="h-8 w-8 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
           </div>
         </div>

         <div className="flex justify-end gap-2">
           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
             Cancel
           </Button>
           <Button onClick={handleConvert} disabled={loading || !aiTag || !projectBrief.trim() || !desiredOutcomes.trim() || !dueDate}>
             {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             Convert to Project
           </Button>
         </div>
      </DialogContent>
    </Dialog>
  );
}
