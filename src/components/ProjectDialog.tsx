import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Calendar, User, CheckSquare, TrendingUp, Code, Target } from "lucide-react";
import { format } from "date-fns";
import WorkflowStepIndicator from "./WorkflowStepIndicator";
import { ChecklistInput, stringToChecklist, checklistToString } from "@/components/ChecklistInput";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  display_name: string | null;
}

interface ProjectDialogProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectDialog({ project, open, onOpenChange }: ProjectDialogProps) {
  const [owner, setOwner] = useState<Profile | null>(null);
  const [briefItems, setBriefItems] = useState(() => 
    project?.project_brief ? stringToChecklist(project.project_brief) : []
  );
  const [outcomesItems, setOutcomesItems] = useState(() => 
    project?.desired_outcomes ? stringToChecklist(project.desired_outcomes) : []
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleBriefChange = async (items: typeof briefItems) => {
    setBriefItems(items);
    if (project?.id) {
      const { error } = await supabase
        .from('projects')
        .update({ project_brief: checklistToString(items) })
        .eq('id', project.id);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update project brief",
        });
      }
    }
  };

  const handleOutcomesChange = async (items: typeof outcomesItems) => {
    setOutcomesItems(items);
    if (project?.id) {
      const { error } = await supabase
        .from('projects')
        .update({ desired_outcomes: checklistToString(items) })
        .eq('id', project.id);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update desired outcomes",
        });
      }
    }
  };

  useEffect(() => {
    if (project?.owner_id) {
      fetchOwner(project.owner_id);
    }
    
    // Update checklist items when project changes
    if (project?.project_brief) {
      setBriefItems(stringToChecklist(project.project_brief));
    }
    if (project?.desired_outcomes) {
      setOutcomesItems(stringToChecklist(project.desired_outcomes));
    }
  }, [project]);

  const fetchOwner = async (ownerId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ownerId)
      .single();
    
    if (data) {
      setOwner(data);
    }
  };

  const getBacklogIcon = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'engineering': return <Code className="h-5 w-5 text-green-500" />;
      case 'outcomes_adoption': return <Target className="h-5 w-5 text-purple-500" />;
      default: return null;
    }
  };

  const getBacklogTitle = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return 'Business & Innovation';
      case 'engineering': return 'Engineering';
      case 'outcomes_adoption': return 'Outcomes & Adoption';
      default: return backlog;
    }
  };

  const handleViewTasks = () => {
    navigate('/my-tasks');
    onOpenChange(false);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="space-y-3">
            <DialogTitle className="text-xl text-foreground">
              {project.title}
            </DialogTitle>
            {project.project_number && (
              <Badge variant="outline" className="w-fit">
                {project.project_number}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Backlog and Workflow */}
          <div className="flex items-center gap-4">
            {project.backlog && (
              <div className="flex items-center gap-2">
                {getBacklogIcon(project.backlog)}
                <span className="text-sm font-medium">{getBacklogTitle(project.backlog)}</span>
              </div>
            )}
            {project.workflow_step !== undefined && (
              <WorkflowStepIndicator step={project.workflow_step} />
            )}
          </div>

          {/* Description */}
          {project.description && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-2">Description</p>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Project Brief */}
          {briefItems.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-3">Project Brief (Expected Features)</p>
                <ChecklistInput
                  items={briefItems}
                  onChange={handleBriefChange}
                  placeholder="Add feature..."
                  disabled={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Desired Outcomes */}
          {outcomesItems.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-3">Desired Outcomes</p>
                <ChecklistInput
                  items={outcomesItems}
                  onChange={handleOutcomesChange}
                  placeholder="Add outcome..."
                  disabled={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Departments */}
          {project.departments && project.departments.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Departments Affected</p>
              <div className="flex flex-wrap gap-2">
                {project.departments.map((dept: string) => (
                  <Badge key={dept} variant="secondary">
                    {dept}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {owner && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Project Owner</p>
                  <p className="font-medium">{owner.display_name || 'Unknown'}</p>
                </div>
              </div>
            )}

            {project.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="font-medium">{format(new Date(project.due_date), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleViewTasks} className="bg-primary hover:bg-primary-hover">
              <CheckSquare className="mr-2 h-4 w-4" />
              View Task Lists
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
