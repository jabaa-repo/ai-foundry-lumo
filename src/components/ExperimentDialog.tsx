import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ExperimentDialogProps {
  experiment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ExperimentDialog({ experiment, open, onOpenChange, onSuccess }: ExperimentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    project_id: "",
    hypothesis: "",
    method: "",
    data_required: "",
    start_date: "",
    target_end_date: "",
    latest_update: "",
    results: "",
    status: "draft",
    decision: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProjects();
      if (experiment) {
        setFormData({
          title: experiment.title || "",
          project_id: experiment.project_id || "",
          hypothesis: experiment.hypothesis || "",
          method: experiment.method || "",
          data_required: experiment.data_required?.join(", ") || "",
          start_date: experiment.start_date?.split('T')[0] || "",
          target_end_date: experiment.target_end_date?.split('T')[0] || "",
          latest_update: experiment.latest_update || "",
          results: experiment.results || "",
          status: experiment.status || "draft",
          decision: experiment.decision || "",
        });
      } else {
        setFormData({
          title: "",
          project_id: "",
          hypothesis: "",
          method: "",
          data_required: "",
          start_date: "",
          target_end_date: "",
          latest_update: "",
          results: "",
          status: "draft",
          decision: "",
        });
      }
    }
  }, [open, experiment]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, title, project_number')
      .order('created_at', { ascending: false });
    setProjects(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const dataArray = formData.data_required 
        ? formData.data_required.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (experiment) {
        // Update existing
        const { error } = await supabase
          .from('experiments')
          .update({
            title: formData.title,
            project_id: formData.project_id || null,
            hypothesis: formData.hypothesis,
            method: formData.method,
            data_required: dataArray,
            start_date: formData.start_date || null,
            target_end_date: formData.target_end_date || null,
            latest_update: formData.latest_update,
            results: formData.results,
            status: formData.status,
            decision: formData.decision || null,
          })
          .eq('id', experiment.id);

        if (error) throw error;

        // Log audit
        await (supabase as any).from('audit_log').insert({
          entity_type: 'experiment',
          entity_id: experiment.id,
          action: 'update_experiment',
          actor_id: user.id,
          details: { status: formData.status, decision: formData.decision }
        });

      } else {
        // Create new
        if (!formData.project_id) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please select a project",
          });
          setLoading(false);
          return;
        }

        // Generate experiment ID
        const { data: expId } = await (supabase as any).rpc('generate_experiment_id', {
          proj_id: formData.project_id
        });

        const { error } = await (supabase as any)
          .from('experiments')
          .insert({
            experiment_id: expId,
            title: formData.title,
            project_id: formData.project_id,
            hypothesis: formData.hypothesis,
            method: formData.method,
            data_required: dataArray,
            start_date: formData.start_date || null,
            target_end_date: formData.target_end_date || null,
            latest_update: formData.latest_update,
            results: formData.results,
            status: formData.status,
            decision: formData.decision || null,
          });

        if (error) throw error;

        // Log audit
        await (supabase as any).from('audit_log').insert({
          entity_type: 'experiment',
          entity_id: expId,
          action: 'create_experiment',
          actor_id: user.id,
          details: { project_id: formData.project_id }
        });
      }

      toast({
        title: "Success",
        description: experiment ? "Experiment updated" : "Experiment created",
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
      <DialogContent className="sm:max-w-[700px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{experiment ? "Edit Experiment" : "New Experiment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Project *</Label>
            <Select value={formData.project_id} onValueChange={(val) => setFormData({ ...formData, project_id: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.project_number ? `${proj.project_number} - ` : ''}{proj.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hypothesis *</Label>
            <Textarea
              value={formData.hypothesis}
              onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <Textarea
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Required (comma-separated)</Label>
            <Input
              value={formData.data_required}
              onChange={(e) => setFormData({ ...formData, data_required: e.target.value })}
              placeholder="dataset1, dataset2, dataset3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Target End Date</Label>
              <Input
                type="date"
                value={formData.target_end_date}
                onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.status === 'completed' && (
            <div className="space-y-2">
              <Label>Decision</Label>
              <Select value={formData.decision} onValueChange={(val) => setFormData({ ...formData, decision: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select decision..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continue">Continue</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="modify">Modify</SelectItem>
                  <SelectItem value="abandon">Abandon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Latest Update</Label>
            <Textarea
              value={formData.latest_update}
              onChange={(e) => setFormData({ ...formData, latest_update: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Results</Label>
            <Textarea
              value={formData.results}
              onChange={(e) => setFormData({ ...formData, results: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {experiment ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
