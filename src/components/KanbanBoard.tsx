import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, User, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
}

interface Idea {
  id: string;
  idea_id: string;
  title: string;
  description: string;
  possible_outcome: string;
  status: 'inbox' | 'business_backlog' | 'engineering_backlog' | 'outcomes_backlog' | 'archived';
  category: string | null;
  created_at: string;
  owner_id?: string;
  responsible_id?: string;
  accountable_id?: string;
  departments?: string[];
}

interface Profile {
  id: string;
  display_name: string | null;
}

interface KanbanBoardProps {
  ideas: Idea[];
  onIdeaClick: (idea: Idea) => void;
}

const COLUMNS = [
  { id: 'inbox' as const, title: 'Inbox', color: 'bg-accent/20' },
  { id: 'business_backlog' as const, title: 'Business & Innovation', color: 'bg-primary/10' },
  { id: 'engineering_backlog' as const, title: 'Software Engineering', color: 'bg-primary/20' },
  { id: 'outcomes_backlog' as const, title: 'Adoption & Outcomes', color: 'bg-accent/30' },
];

export default function KanbanBoard({ ideas, onIdeaClick }: KanbanBoardProps) {
  const [ideaTasks, setIdeaTasks] = useState<Record<string, Task[]>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    const fetchTasks = async () => {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, idea_id')
        .in('idea_id', ideas.map(i => i.id));

      if (tasks) {
        const tasksByIdea: Record<string, Task[]> = {};
        tasks.forEach(task => {
          if (task.idea_id) {
            if (!tasksByIdea[task.idea_id]) tasksByIdea[task.idea_id] = [];
            tasksByIdea[task.idea_id].push(task as Task);
          }
        });
        setIdeaTasks(tasksByIdea);
      }
    };

    const fetchProfiles = async () => {
      const ownerIds = ideas
        .map(i => i.owner_id)
        .filter((id): id is string => !!id);
      
      if (ownerIds.length === 0) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ownerIds);

      if (data) {
        const profilesMap: Record<string, Profile> = {};
        data.forEach(profile => {
          profilesMap[profile.id] = profile;
        });
        setProfiles(profilesMap);
      }
    };

    if (ideas.length > 0) {
      fetchTasks();
      fetchProfiles();
    }
  }, [ideas]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((column) => {
        const columnIdeas = ideas.filter((idea) => idea.status === column.id);
        
        return (
          <div key={column.id} className="space-y-3">
            <div className={`rounded-lg p-3 ${column.color}`}>
              <h3 className="font-bold text-sm text-foreground">{column.title}</h3>
              <Badge variant="secondary" className="mt-1">
                {columnIdeas.length} items
              </Badge>
            </div>
            
            <div className="space-y-3">
              {columnIdeas.map((idea) => {
                const tasks = ideaTasks[idea.id] || [];
                const completedTasks = tasks.filter(t => t.status === 'done').length;
                const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
                
                return (
                  <Card
                    key={idea.id}
                    className="cursor-pointer hover:shadow-hover transition-all border-border bg-card"
                    onClick={() => onIdeaClick(idea)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
                          {idea.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {idea.idea_id}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {idea.description}
                      </p>
                      
                      {/* Owner and Date */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        {idea.owner_id && profiles[idea.owner_id] && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{profiles[idea.owner_id].display_name || 'Unknown'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(idea.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>

                      {/* Department Tags */}
                      {idea.departments && idea.departments.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {idea.departments.map((dept, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {tasks.length > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {completedTasks}/{tasks.length} tasks
                          </span>
                          <Progress value={progress} className="h-1.5 flex-1" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}