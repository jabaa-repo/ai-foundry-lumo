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
  const navigate = useNavigate();

  useEffect(() => {
    if (project?.owner_id) {
      fetchOwner(project.owner_id);
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
          {project.project_brief && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-2">Project Brief</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.project_brief}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Desired Outcomes */}
          {project.desired_outcomes && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-2">Desired Outcomes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.desired_outcomes}
                </p>
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
