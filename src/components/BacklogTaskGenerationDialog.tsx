import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Plus, Trash2, Paperclip, X, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ManualTask {
  id: string;
  title: string;
  description: string;
  accountable_role: string;
  responsible_role: string;
}

interface BacklogTaskGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentBacklog: string;
  nextBacklog: string;
  onSuccess: () => void;
}

export default function BacklogTaskGenerationDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  currentBacklog, 
  nextBacklog,
  onSuccess 
}: BacklogTaskGenerationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [manualTasks, setManualTasks] = useState<ManualTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAccountable, setNewTaskAccountable] = useState("");
  const [newTaskResponsible, setNewTaskResponsible] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const { toast } = useToast();

  // Fetch project details when dialog opens
  useEffect(() => {
    if (open && projectId) {
      fetchProjectDetails();
    }
  }, [open, projectId]);

  const fetchProjectDetails = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('title, description, project_brief, desired_outcomes')
      .eq('id', projectId)
      .single();

    if (!error && data) {
      setProjectDetails(data);
    }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please attach a file smaller than 5MB",
      });
      return;
    }

    setAttachedFile(file);
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

  const handleGenerateTasks = async () => {
    setAiGenerating(true);
    try {
      const fileContext = fileContent ? `\n\nAdditional Context from Attached File:\n${fileContent}` : '';
      
      const { data, error } = await supabase.functions.invoke('generate-backlog-tasks', {
        body: {
          projectId,
          previousBacklog: currentBacklog,
          nextBacklog,
          additionalContext: fileContext
        }
      });

      if (error) throw error;

      if (data?.tasks) {
        setGeneratedTasks(data.tasks.map((task: any) => ({
          ...task,
          activities: task.activities || []
        })));
        
        toast({
          title: "Tasks Generated",
          description: `${data.tasks.length} tasks generated for ${nextBacklog} phase`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate tasks",
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
      accountable_role: newTaskAccountable.trim(),
      responsible_role: newTaskResponsible.trim(),
    };
    
    setManualTasks([...manualTasks, task]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskAccountable("");
    setNewTaskResponsible("");
  };

  const removeManualTask = (id: string) => {
    setManualTasks(manualTasks.filter(t => t.id !== id));
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

  const handleSubmit = async () => {
    const allTasks = [
      ...generatedTasks.map(t => ({
        title: t.title,
        description: t.description,
        accountable_role: t.accountable_role,
        responsible_role: t.responsible_role,
        activities: t.activities || []
      })),
      ...manualTasks.map(t => ({
        title: t.title,
        description: t.description,
        accountable_role: t.accountable_role,
        responsible_role: t.responsible_role,
        activities: []
      }))
    ];

    if (allTasks.length === 0) {
      toast({
        variant: "destructive",
        title: "No Tasks",
        description: "Please generate or add at least one task",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert tasks
      const tasksToInsert = allTasks.map(task => ({
        project_id: projectId,
        title: task.title,
        description: task.description,
        accountable_role: task.accountable_role,
        responsible_role: task.responsible_role,
        backlog: nextBacklog as 'business_innovation' | 'engineering' | 'outcomes_adoption',
        status: 'in_progress' as const,
      }));

      const { data: insertedTasks, error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)
        .select();

      if (tasksError) throw tasksError;

      // Insert task activities
      if (insertedTasks) {
        const activitiesToInsert = insertedTasks.flatMap((task, index) => {
          const activities = allTasks[index].activities || [];
          return activities.map((activityTitle: string) => ({
            task_id: task.id,
            title: activityTitle,
            completed: false,
          }));
        });

        if (activitiesToInsert.length > 0) {
          const { error: activitiesError } = await supabase
            .from('task_activities')
            .insert(activitiesToInsert);

          if (activitiesError) throw activitiesError;
        }
      }

      // Update project backlog to next stage
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          backlog: nextBacklog as 'business_innovation' | 'engineering' | 'outcomes_adoption',
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `${allTasks.length} tasks added and project moved to ${nextBacklog} phase`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create tasks",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Tasks for {nextBacklog === 'engineering' ? 'Engineering' : 'Outcomes & Adoption'}
          </DialogTitle>
          <DialogDescription>
            AI will analyze the project brief and previous backlog work to generate relevant tasks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Brief Info */}
          {projectDetails && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold text-sm">Project Context</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><span className="font-medium">Title:</span> {projectDetails.title}</p>
                      {projectDetails.project_brief && (
                        <p><span className="font-medium">Brief:</span> {projectDetails.project_brief}</p>
                      )}
                      {projectDetails.desired_outcomes && (
                        <p><span className="font-medium">Desired Outcomes:</span> {projectDetails.desired_outcomes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Attachment */}
          <div className="space-y-2">
            <Label>Attach Additional Context (Optional)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('backlog-file-input')?.click()}
                disabled={!!attachedFile}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attach File
              </Button>
              <input
                id="backlog-file-input"
                type="file"
                className="hidden"
                onChange={handleFileAttach}
                accept=".txt,.doc,.docx,.pdf"
              />
              {attachedFile && (
                <div className="flex items-center gap-2 text-sm">
                  <span>{attachedFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* AI Generation */}
          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleGenerateTasks}
              disabled={aiGenerating}
              className="w-full"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Tasks...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Tasks with AI
                </>
              )}
            </Button>

            {/* Generated Tasks */}
            {generatedTasks.length > 0 && (
              <div className="space-y-2">
                <Label>AI Generated Tasks ({generatedTasks.length})</Label>
                {generatedTasks.map((task, taskIndex) => (
                  <Card key={taskIndex} className="border-primary/20">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              A: {task.accountable_role}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              R: {task.responsible_role}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGeneratedTask(taskIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Task Activities */}
                      {task.activities && task.activities.length > 0 && (
                        <div className="space-y-2 pl-4 border-l-2">
                          <Label className="text-xs">Checklist Items:</Label>
                          {task.activities.map((activity: string, actIndex: number) => (
                            <div key={actIndex} className="flex items-center gap-2">
                              <Input
                                value={activity}
                                onChange={(e) => updateTaskActivity(taskIndex, actIndex, e.target.value)}
                                className="text-sm h-8"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTaskActivity(taskIndex, actIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addTaskActivity(taskIndex)}
                            className="w-full"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Checklist Item
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Manual Task Addition */}
          <div className="space-y-3">
            <Label>Add Tasks Manually</Label>
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
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Accountable role"
                  value={newTaskAccountable}
                  onChange={(e) => setNewTaskAccountable(e.target.value)}
                />
                <Input
                  placeholder="Responsible role"
                  value={newTaskResponsible}
                  onChange={(e) => setNewTaskResponsible(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addManualTask}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Manual Task
              </Button>
            </div>

            {manualTasks.length > 0 && (
              <div className="space-y-2">
                <Label>Manual Tasks ({manualTasks.length})</Label>
                {manualTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            {task.accountable_role && (
                              <Badge variant="outline" className="text-xs">
                                A: {task.accountable_role}
                              </Badge>
                            )}
                            {task.responsible_role && (
                              <Badge variant="outline" className="text-xs">
                                R: {task.responsible_role}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeManualTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || (generatedTasks.length === 0 && manualTasks.length === 0)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Tasks...
              </>
            ) : (
              <>
                Create {generatedTasks.length + manualTasks.length} Tasks
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
