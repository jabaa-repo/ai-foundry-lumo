import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, Calendar, Paperclip, X } from "lucide-react";
import { ChecklistInput, checklistToString, stringToChecklist } from "@/components/ChecklistInput";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
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
  const [projectBriefItems, setProjectBriefItems] = useState<ChecklistItem[]>([]);
  const [desiredOutcomesItems, setDesiredOutcomesItems] = useState<ChecklistItem[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
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
2. A project brief as a checklist of expected features (5-8 items) - these will be converted to engineering tasks later
3. Desired outcomes as a checklist (3-5 items)

Idea Title: ${idea.title}
Idea Description: ${idea.description}${fileContext}

Format your response as:
TAG: [single uppercase word]
BRIEF:
- [ ] Feature 1
- [ ] Feature 2
...
OUTCOMES:
- [ ] Outcome 1
- [ ] Outcome 2
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
        setProjectBriefItems(stringToChecklist(briefMatch[1].trim()));
      }
      if (outcomesMatch && outcomesMatch[1]) {
        setDesiredOutcomesItems(stringToChecklist(outcomesMatch[1].trim()));
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

  const handleConvert = async () => {
    if (!aiTag || aiTag.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please generate AI tag first",
      });
      return;
    }

    if (projectBriefItems.length === 0 || desiredOutcomesItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Project Brief and Desired Outcomes are required",
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
          project_brief: checklistToString(projectBriefItems),
          desired_outcomes: checklistToString(desiredOutcomesItems),
          due_date: dueDate || null,
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

      toast({
        title: "Success!",
        description: `Project ${projectNumber} created and moved to Business Innovation backlog`,
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
            <Label>Project Brief (Expected Features Checklist) *</Label>
            <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
              <ChecklistInput
                items={projectBriefItems}
                onChange={setProjectBriefItems}
                placeholder="Add expected feature..."
                disabled={aiGenerating}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              List expected features as checklist items - these will be converted to engineering tasks
            </p>
          </div>

          <div className="space-y-2">
            <Label>Desired Outcomes (Checklist) *</Label>
            <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
              <ChecklistInput
                items={desiredOutcomesItems}
                onChange={setDesiredOutcomesItems}
                placeholder="Add desired outcome..."
                disabled={aiGenerating}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              List desired outcomes as checklist items
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="pl-10"
                disabled={aiGenerating}
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
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading || !aiTag || projectBriefItems.length === 0 || desiredOutcomesItems.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convert to Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
