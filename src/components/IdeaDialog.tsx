import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, Sparkles, X, Trash2, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ConvertToProjectDialog from "./ConvertToProjectDialog";
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

interface Idea {
  id: string;
  idea_id: string;
  title: string;
  description: string;
  possible_outcome: string;
  status: 'inbox' | 'business_backlog' | 'engineering_backlog' | 'outcomes_backlog' | 'archived';
  category: string | null;
  departments?: string[];
}

const DEPARTMENT_OPTIONS = [
  "Marketing",
  "Business Operations",
  "Card Banking",
  "Technology",
  "Customer Service",
  "Finance",
];

interface IdeaDialogProps {
  idea: Idea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function IdeaDialog({ idea, open, onOpenChange, onSuccess }: IdeaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description);
      setDepartments(idea.departments || []);
    } else {
      setTitle("");
      setDescription("");
      setDepartments([]);
    }
  }, [idea]);

  const addDepartment = (dept: string) => {
    if (dept && !departments.includes(dept)) {
      setDepartments([...departments, dept]);
      setNewDepartment("");
    }
  };

  const removeDepartment = (dept: string) => {
    setDepartments(departments.filter(d => d !== dept));
  };

  const handleAISuggestDepartments = async () => {
    if (!title.trim() && !description.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a title or description first",
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

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lumo-chat', {
        body: { 
          message: `Based on this idea, suggest 2-4 relevant departments from this list: Marketing, Business Operations, Card Banking, Technology, Customer Service, Finance.

Title: ${title}
Description: ${description}

Return ONLY the department names as a comma-separated list, nothing else.`
        }
      });

      if (error) throw error;

      const response = data.response;
      
      // Parse comma-separated departments
      const suggestedDepts = response
        .split(',')
        .map((d: string) => d.trim())
        .filter((d: string) => DEPARTMENT_OPTIONS.includes(d));
      
      if (suggestedDepts.length > 0) {
        setDepartments(suggestedDepts);
        toast({
          title: "AI Assistant",
          description: `Suggested ${suggestedDepts.length} relevant departments`,
        });
      } else {
        toast({
          title: "AI Assistant",
          description: "Couldn't identify specific departments. Please select manually.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get AI suggestions",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIRewrite = async () => {
    if (!title.trim() && !description.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a title or description first",
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

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lumo-chat', {
        body: { 
          message: `Improve and rewrite this idea to make it clearer and more compelling:
          
Title: ${title}
Description: ${description}

Please provide:
1. An improved title (concise and clear)
2. An enhanced description (2-3 sentences, professional and actionable)

Format your response as:
TITLE: [improved title]
DESCRIPTION: [improved description]`
        }
      });

      if (error) throw error;

      const response = data.response;
      
      // Parse the AI response
      const titleMatch = response.match(/TITLE:\s*(.+?)(?=\n|DESCRIPTION:|$)/s);
      const descMatch = response.match(/DESCRIPTION:\s*(.+?)$/s);
      
      if (titleMatch && titleMatch[1]) {
        setTitle(titleMatch[1].trim());
      }
      if (descMatch && descMatch[1]) {
        setDescription(descMatch[1].trim());
      }

      toast({
        title: "AI Assistant",
        description: "Content improved! Feel free to edit further.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get AI assistance",
      });
    } finally {
      setAiLoading(false);
    }
  };


  const handleDelete = async () => {
    if (!idea) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', idea.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Idea deleted permanently",
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
      setShowDeleteDialog(false);
    }
  };

  const handleArchive = async () => {
    if (!idea) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert into archived_ideas
      const { error: insertError } = await supabase
        .from('archived_ideas')
        .insert({
          user_id: user.id,
          title: idea.title,
          description: idea.description,
          possible_outcome: idea.possible_outcome,
          departments: idea.departments || [],
          category: idea.category,
          idea_id: idea.idea_id,
        });

      if (insertError) throw insertError;

      // Delete from ideas
      const { error: deleteError } = await supabase
        .from('ideas')
        .delete()
        .eq('id', idea.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Idea archived successfully",
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
      setShowArchiveDialog(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (idea) {
        // Update existing idea
        const { error } = await supabase
          .from('ideas')
          .update({
            title,
            description,
            departments,
          })
          .eq('id', idea.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Idea updated successfully",
        });
      } else {
        // Create new idea in inbox
        const { error } = await supabase
          .from('ideas')
          .insert([{
            title,
            description,
            possible_outcome: '',
            status: 'inbox',
            user_id: user.id,
            owner_id: user.id,
            departments,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Idea added to inbox",
        });
      }

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">
              {idea ? "Edit Idea" : "Add New Idea"}
            </DialogTitle>
            {idea && !(idea as any).is_project && (
              <Button
                type="button"
                variant="default"
                onClick={() => setShowConvertDialog(true)}
                className="bg-primary hover:bg-primary-hover"
                size="sm"
              >
                <Rocket className="mr-2 h-4 w-4" />
                Move to Project
              </Button>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter your idea title"
              className="border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              placeholder="Describe your idea"
              className="border-border resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Departments Affected</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAISuggestDepartments}
                disabled={aiLoading || (!title.trim() && !description.trim())}
                className="text-xs h-7"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI Suggest
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto p-2 border rounded-md">
              {DEPARTMENT_OPTIONS.map((dept) => (
                <Badge
                  key={dept}
                  variant={departments.includes(dept) ? "default" : "outline"}
                  className="cursor-pointer flex-shrink-0"
                  onClick={() => departments.includes(dept) ? removeDepartment(dept) : addDepartment(dept)}
                >
                  {dept}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom department..."
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDepartment(newDepartment);
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addDepartment(newDepartment)}
                disabled={!newDepartment.trim()}
              >
                Add
              </Button>
            </div>
            {departments.length > 0 && (
              <div className="flex gap-1 flex-wrap max-h-24 overflow-y-auto p-2 border rounded-md bg-muted/30">
                {departments.map((dept) => (
                  <Badge key={dept} variant="secondary" className="gap-1 flex-shrink-0">
                    {dept}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeDepartment(dept)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAIRewrite}
            disabled={aiLoading}
            className="w-full border-primary/50 hover:bg-primary/10"
          >
            {aiLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI is improving your content...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Improve with AI Assistant
              </>
            )}
          </Button>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border gap-2 flex-shrink-0">
            <div className="flex gap-2">
              {idea && !(idea as any).is_project && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowArchiveDialog(true)}
                    className="border-border"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                   <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : idea ? (
                  "Update Idea"
                ) : (
                  "Add to Inbox"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      <ConvertToProjectDialog
        idea={idea}
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        onSuccess={() => {
          onSuccess();
          onOpenChange(false);
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Idea</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this idea? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Idea</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this idea? You can view it later in Archived Ideas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}