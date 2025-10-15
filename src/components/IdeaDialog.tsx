import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, Sparkles } from "lucide-react";
import ConvertToProjectDialog from "./ConvertToProjectDialog";

interface Idea {
  id: string;
  idea_id: string;
  title: string;
  description: string;
  possible_outcome: string;
  status: 'inbox' | 'business_backlog' | 'engineering_backlog' | 'outcomes_backlog' | 'archived';
  category: string | null;
}

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
  const { toast } = useToast();

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description);
    } else {
      setTitle("");
      setDescription("");
    }
  }, [idea]);

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
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {idea ? "Edit Idea" : "Add New Idea"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex justify-between items-center pt-4 border-t border-border">
            {idea && !(idea as any).is_project && (
              <Button
                type="button"
                variant="default"
                onClick={() => setShowConvertDialog(true)}
                className="bg-primary hover:bg-primary-hover"
              >
                <Rocket className="mr-2 h-4 w-4" />
                Move to Project
              </Button>
            )}
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
    </Dialog>
  );
}