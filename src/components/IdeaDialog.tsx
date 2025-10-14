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

interface Idea {
  id: string;
  title: string;
  description: string;
  possible_outcome: string;
  status: 'inbox' | 'business_backlog' | 'engineering_backlog' | 'outcomes_backlog' | 'archived';
}

interface IdeaDialogProps {
  idea: Idea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function IdeaDialog({ idea, open, onOpenChange, onSuccess }: IdeaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [possibleOutcome, setPossibleOutcome] = useState("");
  const [status, setStatus] = useState<string>("inbox");
  const { toast } = useToast();

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description);
      setPossibleOutcome(idea.possible_outcome);
      setStatus(idea.status);
    } else {
      setTitle("");
      setDescription("");
      setPossibleOutcome("");
      setStatus("inbox");
    }
  }, [idea]);

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
            description,
            possible_outcome: possibleOutcome,
            status: status as any,
          })
          .eq('id', idea.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Idea updated successfully",
        });
      } else {
        // Create new idea
        const { error } = await supabase
          .from('ideas')
          .insert([{
            title,
            description,
            possible_outcome: possibleOutcome,
            status: status as any,
            user_id: user.id,
            owner: user.id,
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
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="border-border resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Possible Outcome *</Label>
            <Textarea
              id="outcome"
              value={possibleOutcome}
              onChange={(e) => setPossibleOutcome(e.target.value)}
              required
              rows={3}
              className="border-border resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="inbox">Inbox</SelectItem>
                <SelectItem value="business_backlog">Business & Innovation Backlog</SelectItem>
                <SelectItem value="engineering_backlog">Software Engineering Backlog</SelectItem>
                <SelectItem value="outcomes_backlog">Adoption & Outcomes Backlog</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
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
                "Add Idea"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}