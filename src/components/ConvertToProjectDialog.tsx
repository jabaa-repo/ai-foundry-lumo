import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket } from "lucide-react";
import { WORKFLOW_STEPS } from "./WorkflowStepIndicator";

interface ConvertToProjectDialogProps {
  idea: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ConvertToProjectDialog({ idea, open, onOpenChange, onSuccess }: ConvertToProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [initials, setInitials] = useState("");
  const [workflowStep, setWorkflowStep] = useState("1");
  const { toast } = useToast();

  const handleConvert = async () => {
    if (!initials || initials.length < 2 || initials.length > 4) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter 2-4 character initials",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate project number
      const { data: projectNumber, error: rpcError } = await (supabase as any).rpc('generate_project_number', {
        user_initials: initials.toUpperCase()
      });

      if (rpcError) throw rpcError;

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          project_number: projectNumber,
          title: idea.title,
          description: idea.description,
          owner_id: user.id,
          responsible_id: idea.responsible_id,
          accountable_id: idea.accountable_id,
          consulted_ids: idea.consulted_ids || [],
          informed_ids: idea.informed_ids || [],
          workflow_step: parseInt(workflowStep),
          status: 'recent',
          last_activity_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Update idea to mark as converted
      const { error: ideaError } = await supabase
        .from('ideas')
        .update({
          is_project: true,
          project_number: projectNumber,
          status: 'inbox' as any
        } as any)
        .eq('id', idea.id);

      if (ideaError) throw ideaError;

      // Log audit
      await (supabase as any).from('audit_log').insert({
        entity_type: 'project',
        entity_id: project.id,
        action: 'convert_idea_to_project',
        actor_id: user.id,
        details: { idea_id: idea.id, project_number: projectNumber, workflow_step: parseInt(workflowStep) }
      });

      toast({
        title: "Success!",
        description: `Project ${projectNumber} created from idea`,
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
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
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
          <div className="space-y-2">
            <Label>Your Initials (2-4 characters) *</Label>
            <Input
              placeholder="e.g., NM, JD, ABC"
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              maxLength={4}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Format: DDMMYY + Initials + 0001
            </p>
          </div>

          <div className="space-y-2">
            <Label>Starting Workflow Step</Label>
            <Select value={workflowStep} onValueChange={setWorkflowStep}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STEPS.filter(s => s.step > 0).map((step) => (
                  <SelectItem key={step.step} value={step.step.toString()}>
                    Step {step.step}: {step.name} {step.division && `(${step.division})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-semibold mb-1">Project Preview</p>
            <p className="text-sm text-muted-foreground">
              <strong>Title:</strong> {idea?.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Number:</strong> Will be auto-generated
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading || !initials}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convert to Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
