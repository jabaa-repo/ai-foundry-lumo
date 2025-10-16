import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Calendar, User, CheckSquare, TrendingUp, Code, Target, Trash2, Archive } from "lucide-react";
import { format } from "date-fns";
import WorkflowStepIndicator from "./WorkflowStepIndicator";
import { ChecklistInput, stringToChecklist, checklistToString } from "@/components/ChecklistInput";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  display_name: string | null;
}

interface ProjectDialogProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectDeleted?: () => void;
}

export default function ProjectDialog({ project, open, onOpenChange, onProjectDeleted }: ProjectDialogProps) {
  const [owner, setOwner] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [briefItems, setBriefItems] = useState(() => 
    project?.project_brief ? stringToChecklist(project.project_brief) : []
  );
  const [outcomesItems, setOutcomesItems] = useState(() => 
    project?.desired_outcomes ? stringToChecklist(project.desired_outcomes) : []
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchCurrentUser();
  }, []);

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
    navigate(`/my-tasks?projectId=${project?.id}`);
    onOpenChange(false);
  };

  const handleDeletePermanently = async () => {
    if (!project?.id) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Project Deleted",
        description: "The project has been permanently deleted.",
      });

      onOpenChange(false);
      onProjectDeleted?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete project",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleArchive = async () => {
    if (!project?.id) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Project Archived",
        description: "The project has been moved to the archive.",
      });

      onOpenChange(false);
      onProjectDeleted?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to archive project",
      });
    } finally {
      setIsDeleting(false);
      setShowArchiveDialog(false);
    }
  };

  const isOwner = currentUserId && project?.owner_id === currentUserId;

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl text-foreground">
                {project.title}
              </DialogTitle>
              {project.project_number && (
                <Badge variant="outline" className="font-mono text-sm">
                  {project.project_number}
                </Badge>
              )}
            </div>
            {project.backlog && project.status !== 'completed' && (
              <div className="flex items-center gap-2">
                {getBacklogIcon(project.backlog)}
                <span className="text-sm font-medium">{getBacklogTitle(project.backlog)}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">

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
                <p className="text-sm font-semibold mb-3">Project Brief (Expected Features)</p>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.project_brief}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desired Outcomes */}
          {project.desired_outcomes && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-3">Desired Outcomes</p>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.desired_outcomes}
                </div>
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
          <div className="flex justify-between gap-2 pt-4 border-t border-border">
            <div className="flex gap-2">
              {isOwner && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowArchiveDialog(true)}
                    className="text-muted-foreground"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleViewTasks} className="bg-primary hover:bg-primary-hover">
                <CheckSquare className="mr-2 h-4 w-4" />
                View Task Lists
              </Button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project Permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project 
                "{project?.title}" and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePermanently}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Archive Confirmation Dialog */}
        <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move the project "{project?.title}" to the archive. 
                You can restore it later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchive}
                disabled={isDeleting}
              >
                {isDeleting ? "Archiving..." : "Archive Project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
