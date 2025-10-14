import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Rocket } from "lucide-react";
import ConvertToProjectDialog from "./ConvertToProjectDialog";

interface Idea {
  id: string;
  idea_id: string;
  title: string;
  description: string;
  possible_outcome: string;
  status: 'inbox' | 'triaged' | 'backlog' | 'moved' | 'archived';
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
  const [possibleOutcome, setPossibleOutcome] = useState("");
  const [status, setStatus] = useState<string>("inbox");
  const [category, setCategory] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [accountableId, setAccountableId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, display_name');
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, display_name');
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description);
      setPossibleOutcome(idea.possible_outcome);
      setStatus(idea.status);
      setCategory(idea.category || "");
      setResponsibleId((idea as any).responsible_id || "");
      setAccountableId((idea as any).accountable_id || "");
    } else {
      setTitle("");
      setDescription("");
      setPossibleOutcome("");
      setStatus("inbox");
      setCategory("");
      setResponsibleId("");
      setAccountableId("");
    }
  }, [idea]);

  const handleAIAssist = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a title first",
      });
      return;
    }

    // Check if user is authenticated
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
          message: `Help me create a brief for this idea: "${title}". 
          Provide: 
          1. A detailed description (2-3 sentences)
          2. A possible outcome or benefit (1-2 sentences)
          Be supportive and encouraging in your tone.`
        }
      });

      if (error) {
        console.error('AI assist error:', error);
        throw error;
      }

      // Parse the AI response and populate fields
      const response = data.response;
      
      // Simple parsing - split response into description and outcome
      const parts = response.split(/outcome|benefit/i);
      if (parts.length >= 2) {
        setDescription(parts[0].replace(/description:/i, '').trim());
        setPossibleOutcome(parts[1].trim());
      } else {
        setDescription(response);
      }

      toast({
        title: "AI Assistant",
        description: "Brief generated successfully! Feel free to edit.",
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
            possible_outcome: possibleOutcome,
            status: status as any,
            category: category || null,
            responsible_id: responsibleId || null,
            accountable_id: accountableId || null,
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
            category: category || null,
            owner_id: user.id,
            responsible_id: responsibleId || null,
            accountable_id: accountableId || null,
          } as any]);

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

          {!idea && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAIAssist}
              disabled={aiLoading || !title.trim()}
              className="w-full border-primary/50 hover:bg-primary/10"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI is helping...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get AI Help with Brief
                </>
              )}
            </Button>
          )}

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="inbox">Inbox</SelectItem>
                  <SelectItem value="triaged">Triaged</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="moved">Moved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category || "none"} onValueChange={(val) => setCategory(val === "none" ? "" : val)}>
                <SelectTrigger className="border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="business">Business & Innovation</SelectItem>
                  <SelectItem value="software">Software Engineering</SelectItem>
                  <SelectItem value="adoption">Adoption & Outcomes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Label className="text-sm font-semibold">RACI Assignment</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="responsible">Responsible</Label>
                <Select value={responsibleId || "none"} onValueChange={(val) => setResponsibleId(val === "none" ? "" : val)}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name || 'User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountable">Accountable</Label>
                <Select value={accountableId || "none"} onValueChange={(val) => setAccountableId(val === "none" ? "" : val)}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name || 'User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            {idea && !(idea as any).is_project && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConvertDialog(true)}
              >
                <Rocket className="mr-2 h-4 w-4" />
                Convert to Project
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
                  "Add Idea"
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