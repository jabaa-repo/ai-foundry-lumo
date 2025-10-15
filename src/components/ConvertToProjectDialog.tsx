import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket } from "lucide-react";

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
  const [aiGenerating, setAiGenerating] = useState(false);
  const { toast } = useToast();

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
      const { data, error } = await supabase.functions.invoke('lumo-chat', {
        body: { 
          message: `Based on this idea, generate:
1. A single-word tag (in UPPERCASE) that captures the essence of this project
2. A comprehensive project brief (2-3 paragraphs)
3. Clear desired outcomes (3-5 bullet points)

Idea Title: ${idea.title}
Idea Description: ${idea.description}

Format your response as:
TAG: [single uppercase word]
BRIEF: [project brief]
OUTCOMES: [desired outcomes]`
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
        setProjectBrief(briefMatch[1].trim());
      }
      if (outcomesMatch && outcomesMatch[1]) {
        setDesiredOutcomes(outcomesMatch[1].trim());
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

    if (!projectBrief || !desiredOutcomes) {
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
          project_brief: projectBrief,
          desired_outcomes: desiredOutcomes,
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
      
      onSuccess();
      onOpenChange(false);
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
            <DialogTitle>Convert to Project</DialogTitle>
          </div>
          <DialogDescription>
            Transform this idea into a tracked project with a unique project number
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            <Label>Project Brief *</Label>
            <Textarea
              placeholder="Comprehensive project description..."
              value={projectBrief}
              onChange={(e) => setProjectBrief(e.target.value)}
              rows={4}
              disabled={aiGenerating}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Desired Outcomes *</Label>
            <Textarea
              placeholder="Expected results and success criteria..."
              value={desiredOutcomes}
              onChange={(e) => setDesiredOutcomes(e.target.value)}
              rows={4}
              disabled={aiGenerating}
              className="resize-none"
            />
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-semibold mb-1">Project Setup</p>
            <p className="text-sm text-muted-foreground">
              <strong>Title:</strong> {idea?.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Backlog:</strong> Business Innovation (Step 1)
            </p>
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
          <Button onClick={handleConvert} disabled={loading || !aiTag || !projectBrief || !desiredOutcomes}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convert to Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
