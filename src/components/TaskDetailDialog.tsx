import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Send, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  start_date?: string;
  assigned_to?: string;
  responsible_role?: string;
  accountable_role?: string;
}

interface TaskActivity {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  created_at: string;
  profiles?: {
    display_name?: string;
  };
}

interface Profile {
  id: string;
  display_name?: string;
  avatar_url?: string;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: () => void;
}

export function TaskDetailDialog({ task, open, onOpenChange, onTaskUpdate }: TaskDetailDialogProps) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newActivity, setNewActivity] = useState("");
  const [isGeneratingActivities, setIsGeneratingActivities] = useState(false);
  const [assignedUser, setAssignedUser] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      fetchActivities();
      fetchComments();
      fetchActivityLog();
      setAssignedUser(task.assigned_to || "");
      setStartDate(task.start_date ? format(new Date(task.start_date), "yyyy-MM-dd") : "");
      setDueDate(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "");
    }
  }, [task]);

  useEffect(() => {
    if (searchQuery.startsWith("@")) {
      const query = searchQuery.slice(1);
      if (query.length > 0) {
        searchUsers(query);
      }
    } else {
      setShowSearch(false);
    }
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${query}%`)
      .limit(5);

    if (!error && data) {
      setSearchResults(data);
      setShowSearch(true);
    }
  };

  const fetchActivities = async () => {
    if (!task) return;
    
    const { data, error } = await supabase
      .from("task_activities")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setActivities(data);
    }
  };

  const fetchComments = async () => {
    if (!task) return;

    const { data: commentsData, error } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });

    if (error || !commentsData) return;

    // Fetch user profiles separately
    const userIds = commentsData.map((c) => c.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const commentsWithProfiles = commentsData.map((comment) => ({
      ...comment,
      profiles: profiles?.find((p) => p.id === comment.user_id),
    }));

    setComments(commentsWithProfiles);
  };

  const fetchActivityLog = async () => {
    if (!task) return;

    const { data: logData, error } = await supabase
      .from("task_activity_log")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });

    if (error || !logData) return;

    // Fetch user profiles separately
    const userIds = logData.map((l) => l.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    const logsWithProfiles = logData.map((log) => ({
      ...log,
      profiles: profiles?.find((p) => p.id === log.user_id),
    }));

    setActivityLog(logsWithProfiles);
  };

  const logActivity = async (action: string, details?: string) => {
    if (!task) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("task_activity_log").insert({
      task_id: task.id,
      user_id: user.id,
      action,
      details,
    });

    fetchActivityLog();
  };

  const handleActivityToggle = async (activityId: string, completed: boolean) => {
    const { error } = await supabase
      .from("task_activities")
      .update({ completed })
      .eq("id", activityId);

    if (error) {
      toast({ title: "Error", description: "Failed to update activity", variant: "destructive" });
      return;
    }

    fetchActivities();
    logActivity(completed ? "completed_activity" : "uncompleted_activity", activities.find(a => a.id === activityId)?.title);
  };

  const handleAddActivity = async () => {
    if (!task || !newActivity.trim()) return;

    const { error } = await supabase.from("task_activities").insert({
      task_id: task.id,
      title: newActivity.trim(),
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add activity", variant: "destructive" });
      return;
    }

    setNewActivity("");
    fetchActivities();
    logActivity("added_activity", newActivity.trim());
  };

  const handleGenerateActivities = async () => {
    if (!task) return;

    setIsGeneratingActivities(true);
    try {
      const { data, error } = await supabase.functions.invoke("lumo-chat", {
        body: {
          message: `Generate 5-7 specific, actionable activities for this task: "${task.title}". Description: ${task.description || "No description"}. Return only a JSON array of activity titles as strings.`,
          type: "generate_activities",
        },
      });

      if (error) throw error;

      const activitiesText = data.response;
      let generatedActivities: string[] = [];
      
      try {
        generatedActivities = JSON.parse(activitiesText);
      } catch {
        generatedActivities = activitiesText.split("\n").filter((line: string) => line.trim().length > 0);
      }

      for (const activityTitle of generatedActivities) {
        await supabase.from("task_activities").insert({
          task_id: task.id,
          title: activityTitle.replace(/^[-*•]\s*/, "").trim(),
        });
      }

      fetchActivities();
      logActivity("generated_activities", `Generated ${generatedActivities.length} activities with AI`);
      toast({ title: "Success", description: "Activities generated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate activities", variant: "destructive" });
    } finally {
      setIsGeneratingActivities(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
      return;
    }

    setNewComment("");
    fetchComments();
    logActivity("added_comment");
  };

  const handleAssignUser = async (userId: string, displayName: string) => {
    if (!task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: userId })
      .eq("id", task.id);

    if (error) {
      toast({ title: "Error", description: "Failed to assign user", variant: "destructive" });
      return;
    }

    setAssignedUser(userId);
    setSearchQuery("");
    setShowSearch(false);
    logActivity("assigned_user", displayName);
    onTaskUpdate();
  };

  const handleUpdateDates = async () => {
    if (!task) return;

    const updates: any = {};
    if (startDate) updates.start_date = new Date(startDate).toISOString();
    if (dueDate) updates.due_date = new Date(dueDate).toISOString();

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update dates", variant: "destructive" });
      return;
    }

    logActivity("updated_dates", `Start: ${startDate || "N/A"}, Due: ${dueDate || "N/A"}`);
    onTaskUpdate();
    toast({ title: "Success", description: "Dates updated successfully" });
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {/* Responsible and Accountable */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Responsible</label>
                    <p className="text-sm text-muted-foreground">{task.responsible_role || "Not assigned"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Accountable</label>
                    <p className="text-sm text-muted-foreground">{task.accountable_role || "Not assigned"}</p>
                  </div>
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button onClick={handleUpdateDates} size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Update Dates
                </Button>

                <Separator />

                {/* Assign to Team Member */}
                <div>
                  <label className="text-sm font-medium">Assign to Team Member</label>
                  <div className="relative mt-1">
                    <Input
                      placeholder="Type @ to search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {showSearch && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-10">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleAssignUser(user.id, user.display_name || "Unknown")}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={user.avatar_url || ""} />
                              <AvatarFallback>{user.display_name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.display_name || "Unknown User"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Activities */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Activities</label>
                    <Button
                      onClick={handleGenerateActivities}
                      disabled={isGeneratingActivities}
                      size="sm"
                      variant="outline"
                    >
                      {isGeneratingActivities ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate with AI
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={activity.completed}
                          onCheckedChange={(checked) => handleActivityToggle(activity.id, checked as boolean)}
                        />
                        <span className={activity.completed ? "line-through text-muted-foreground" : ""}>
                          {activity.title}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new activity..."
                      value={newActivity}
                      onChange={(e) => setNewActivity(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddActivity()}
                    />
                    <Button onClick={handleAddActivity} size="sm">Add</Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar>
                      <AvatarImage src={comment.profiles?.avatar_url || ""} />
                      <AvatarFallback>{comment.profiles?.display_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.profiles?.display_name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleAddComment} size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {activityLog.map((log) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm")}
                    </span>
                    <div>
                      <span className="font-medium">{log.profiles?.display_name || "Someone"}</span>
                      <span className="text-muted-foreground"> {log.action.replace(/_/g, " ")}</span>
                      {log.details && <span className="text-muted-foreground">: {log.details}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
