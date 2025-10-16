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
import { Calendar, Send, Paperclip, Download, Trash2, X, Check } from "lucide-react";
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

interface ResponsibleUser {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
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

interface TaskAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

interface CommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
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
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [commentAttachments, setCommentAttachments] = useState<Record<string, CommentAttachment[]>>({});
  const [accountableUser, setAccountableUser] = useState<string>("");
  const [accountableUserProfile, setAccountableUserProfile] = useState<Profile | null>(null);
  const [responsibleUsers, setResponsibleUsers] = useState<ResponsibleUser[]>([]);
  const [accountableSearchQuery, setAccountableSearchQuery] = useState("");
  const [responsibleSearchQuery, setResponsibleSearchQuery] = useState("");
  const [accountableSearchResults, setAccountableSearchResults] = useState<Profile[]>([]);
  const [responsibleSearchResults, setResponsibleSearchResults] = useState<Profile[]>([]);
  const [showAccountableSearch, setShowAccountableSearch] = useState(false);
  const [showResponsibleSearch, setShowResponsibleSearch] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalTask, setOriginalTask] = useState<Task | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      fetchActivities();
      fetchComments();
      fetchActivityLog();
      fetchTaskAttachments();
      fetchResponsibleUsers();
      setAccountableUser(task.assigned_to || "");
      
      // Fetch accountable user profile
      if (task.assigned_to) {
        fetchAccountableUserProfile(task.assigned_to);
      } else {
        setAccountableUserProfile(null);
      }
      
      const currentStartDate = task.start_date ? format(new Date(task.start_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      setStartDate(currentStartDate);
      setDueDate(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "");
      setOriginalTask(task);
      setHasChanges(false);
    }
  }, [task]);

  useEffect(() => {
    if (accountableSearchQuery.startsWith("@")) {
      const query = accountableSearchQuery.slice(1);
      if (query.length > 0) {
        searchUsers(query, "accountable");
      }
    } else {
      setShowAccountableSearch(false);
    }
  }, [accountableSearchQuery]);

  useEffect(() => {
    if (responsibleSearchQuery.startsWith("@")) {
      const query = responsibleSearchQuery.slice(1);
      if (query.length > 0) {
        searchUsers(query, "responsible");
      }
    } else {
      setShowResponsibleSearch(false);
    }
  }, [responsibleSearchQuery]);

  const searchUsers = async (query: string, type: "accountable" | "responsible") => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${query}%`)
      .limit(5);

    if (!error && data) {
      if (type === "accountable") {
        setAccountableSearchResults(data);
        setShowAccountableSearch(true);
      } else {
        setResponsibleSearchResults(data);
        setShowResponsibleSearch(true);
      }
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
    
    // Fetch attachments for each comment
    for (const comment of commentsData) {
      fetchCommentAttachments(comment.id);
    }
  };

  const fetchTaskAttachments = async () => {
    if (!task) return;

    const { data, error } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTaskAttachments(data);
    }
  };

  const fetchCommentAttachments = async (commentId: string) => {
    const { data, error } = await supabase
      .from("comment_attachments")
      .select("*")
      .eq("comment_id", commentId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCommentAttachments((prev) => ({ ...prev, [commentId]: data }));
    }
  };

  const fetchResponsibleUsers = async () => {
    if (!task) return;

    const { data, error } = await supabase
      .from("task_responsible_users")
      .select("id, user_id")
      .eq("task_id", task.id);

    if (error || !data) return;

    // Fetch profiles for responsible users
    const userIds = data.map((r) => r.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const usersWithProfiles = data.map((ru) => ({
        ...ru,
        display_name: profiles?.find((p) => p.id === ru.user_id)?.display_name,
        avatar_url: profiles?.find((p) => p.id === ru.user_id)?.avatar_url,
      }));

      setResponsibleUsers(usersWithProfiles);
    } else {
      setResponsibleUsers([]);
    }
  };

  const fetchAccountableUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", userId)
      .single();

    if (data) {
      setAccountableUserProfile(data);
    }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, commentId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    setUploadingFile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${task.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      if (commentId) {
        const { error: dbError } = await supabase.from("comment_attachments").insert({
          comment_id: commentId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        });

        if (dbError) throw dbError;
        fetchCommentAttachments(commentId);
      } else {
        const { error: dbError } = await supabase.from("task_attachments").insert({
          task_id: task.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        });

        if (dbError) throw dbError;
        fetchTaskAttachments();
      }

      toast({ title: "Success", description: "File uploaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("task-attachments")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
    }
  };

  const handleDeleteFile = async (attachmentId: string, filePath: string, isComment: boolean) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove([filePath]);

      if (storageError) throw storageError;

      const table = isComment ? "comment_attachments" : "task_attachments";
      const { error: dbError } = await supabase
        .from(table)
        .delete()
        .eq("id", attachmentId);

      if (dbError) throw dbError;

      if (isComment) {
        // Refresh comment attachments
        const commentId = Object.keys(commentAttachments).find(
          (id) => commentAttachments[id].some((att) => att.id === attachmentId)
        );
        if (commentId) fetchCommentAttachments(commentId);
      } else {
        fetchTaskAttachments();
      }

      toast({ title: "Success", description: "File deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete file", variant: "destructive" });
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

  const handleAssignAccountable = async (userId: string, displayName: string) => {
    setAccountableUser(userId);
    setAccountableSearchQuery("");
    setShowAccountableSearch(false);
    setHasChanges(true);
    await fetchAccountableUserProfile(userId);
  };

  const handleAssignResponsible = async (userId: string, displayName: string) => {
    if (!task) return;
    
    // Check if already added
    if (responsibleUsers.some(u => u.user_id === userId)) {
      toast({ title: "Already Added", description: "This person is already assigned as responsible" });
      return;
    }

    const { error } = await supabase
      .from("task_responsible_users")
      .insert({ task_id: task.id, user_id: userId });

    if (error) {
      toast({ title: "Error", description: "Failed to assign responsible person", variant: "destructive" });
      return;
    }

    setResponsibleSearchQuery("");
    setShowResponsibleSearch(false);
    fetchResponsibleUsers();
    logActivity("assigned_responsible", displayName);
    setHasChanges(true);
  };

  const handleRemoveResponsible = async (responsibleId: string, displayName?: string) => {
    const { error } = await supabase
      .from("task_responsible_users")
      .delete()
      .eq("id", responsibleId);

    if (error) {
      toast({ title: "Error", description: "Failed to remove responsible person", variant: "destructive" });
      return;
    }

    fetchResponsibleUsers();
    logActivity("removed_responsible", displayName || "Unknown");
    setHasChanges(true);
  };

  const handleDone = async () => {
    if (!task) return;

    // Validate required fields
    if (!accountableUser) {
      toast({ 
        title: "Required Field Missing", 
        description: "Please assign an accountable person", 
        variant: "destructive" 
      });
      return;
    }

    if (!startDate || !dueDate) {
      toast({ 
        title: "Required Fields Missing", 
        description: "Please set both start date and due date", 
        variant: "destructive" 
      });
      return;
    }

    const updates: any = {
      assigned_to: accountableUser,
      start_date: new Date(startDate).toISOString(),
      due_date: new Date(dueDate).toISOString(),
    };

    // Update status to 'todo' if accountable person was just assigned
    if (originalTask?.assigned_to !== accountableUser) {
      updates.status = 'todo';
    }

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
      return;
    }

    if (originalTask?.assigned_to !== accountableUser) {
      logActivity("assigned_accountable", accountableUser);
    }
    logActivity("updated_task", "Task details saved");
    
    setHasChanges(false);
    setOriginalTask({ ...task, ...updates });
    onTaskUpdate();
    toast({ title: "Success", description: "Changes saved successfully" });
    onOpenChange(false); // Close modal after successful save
  };

  if (!task) return null;

  const AccountableUserDisplay = ({ userId, onRemove }: { userId: string; onRemove: () => void }) => {
    if (!accountableUserProfile) return null;
    
    return (
      <div className="mt-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-accent rounded-md text-sm w-fit">
          <Avatar className="w-4 h-4">
            <AvatarImage src={accountableUserProfile.avatar_url || ""} />
            <AvatarFallback>{accountableUserProfile.display_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <span>{accountableUserProfile.display_name || "Unknown"}</span>
          <button
            onClick={onRemove}
            className="ml-1 hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
          <Button 
            onClick={handleDone} 
            disabled={!hasChanges}
            size="sm"
          >
            <Check className="w-4 h-4 mr-2" />
            Done
          </Button>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-12rem)] pr-4">
              <div className="space-y-4">
                {/* Task Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">File Attachments</label>
                    <label htmlFor="task-file-upload">
                      <Button variant="outline" size="sm" disabled={uploadingFile} asChild>
                        <span className="cursor-pointer">
                          <Paperclip className="w-4 h-4 mr-2" />
                          Upload File
                        </span>
                      </Button>
                    </label>
                    <input
                      id="task-file-upload"
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e)}
                    />
                  </div>
                  {taskAttachments.length > 0 && (
                    <div className="space-y-2">
                      {taskAttachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 border rounded-md">
                          <span className="text-sm truncate flex-1">{attachment.file_name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadFile(attachment.file_path, attachment.file_name)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFile(attachment.id, attachment.file_path, false)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Task Checklists */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Task Checklists</label>

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

                  <div className="flex gap-2 items-start">
                    <Input
                      placeholder="Add new task checklist..."
                      value={newActivity}
                      onChange={(e) => setNewActivity(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddActivity()}
                      className="flex-1"
                    />
                    <Button onClick={handleAddActivity} size="sm" className="shrink-0">Add</Button>
                  </div>
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">
                      Start Date <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setHasChanges(true);
                      }}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Due Date <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        setHasChanges(true);
                      }}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <Separator />

                {/* Assign Accountable and Responsible */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">
                      Assign Accountable Person <span className="text-destructive">*</span>
                    </label>
                    <div className="relative mt-1">
                      <Input
                        placeholder="Type @ to search..."
                        value={accountableSearchQuery}
                        onChange={(e) => setAccountableSearchQuery(e.target.value)}
                        required
                      />
                      {showAccountableSearch && accountableSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                          {accountableSearchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleAssignAccountable(user.id, user.display_name || "Unknown")}
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
                    {accountableUser && (
                      <AccountableUserDisplay userId={accountableUser} onRemove={() => {
                        setAccountableUser("");
                        setHasChanges(true);
                      }} />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assign Responsible Persons</label>
                    <div className="relative mt-1">
                      <Input
                        placeholder="Type @ to search..."
                        value={responsibleSearchQuery}
                        onChange={(e) => setResponsibleSearchQuery(e.target.value)}
                      />
                      {showResponsibleSearch && responsibleSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                          {responsibleSearchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleAssignResponsible(user.id, user.display_name || "Unknown")}
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
                    {responsibleUsers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {responsibleUsers.map((user) => (
                          <div key={user.id} className="flex items-center gap-1 px-2 py-1 bg-accent rounded-md text-sm">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={user.avatar_url || ""} />
                              <AvatarFallback>{user.display_name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <span>{user.display_name || "Unknown"}</span>
                            <button
                              onClick={() => handleRemoveResponsible(user.id, user.display_name)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="overflow-hidden">
            <ScrollArea className="h-[calc(90vh-12rem)] pr-4">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex gap-3">
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
                        
                        {/* Comment Attachments */}
                        {commentAttachments[comment.id]?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {commentAttachments[comment.id].map((attachment) => (
                              <div key={attachment.id} className="flex items-center justify-between p-2 border rounded-md text-xs">
                                <span className="truncate flex-1">{attachment.file_name}</span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadFile(attachment.file_path, attachment.file_name)}
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteFile(attachment.id, attachment.file_path, true)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="space-y-2 pt-4 border-t">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex justify-between items-center gap-2">
                    <label htmlFor="new-comment-file">
                      <Button variant="outline" size="sm" disabled={uploadingFile} asChild>
                        <span className="cursor-pointer">
                          <Paperclip className="w-4 h-4 mr-2" />
                          Attach File
                        </span>
                      </Button>
                    </label>
                    <input
                      id="new-comment-file"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Store file temporarily until comment is added
                          // For now, we'll handle it on send
                        }
                      }}
                    />
                    <Button onClick={handleAddComment} size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="overflow-hidden">
            <ScrollArea className="h-[calc(90vh-12rem)] pr-4">
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
