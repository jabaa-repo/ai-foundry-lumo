import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, User, Calendar, TrendingUp, Code, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import WorkflowStepIndicator from "./WorkflowStepIndicator";
import { MoveToNextBacklogButton } from "./MoveToNextBacklogButton";
import { MoveToCompletedButton } from "./MoveToCompletedButton";

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
  projects: any[];
  onIdeaClick: (idea: Idea) => void;
  onProjectClick: (project: any) => void;
  onProjectUpdate?: () => void;
}

export default function KanbanBoard({ ideas, projects, onIdeaClick, onProjectClick, onProjectUpdate }: KanbanBoardProps) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [projectTaskStats, setProjectTaskStats] = useState<Record<string, { total: number; completed: number }>>({});

  useEffect(() => {
    // Fetch profiles for both idea owners and project owners
    const ideaOwnerIds = ideas
      .map(idea => idea.owner_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const projectOwnerIds = projects
      .map(project => project.owner_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const uniqueOwnerIds = [...new Set([...ideaOwnerIds, ...projectOwnerIds])];
    
    if (uniqueOwnerIds.length > 0) {
      fetchProfiles(uniqueOwnerIds);
    }

    // Fetch task stats for all projects
    if (projects.length > 0) {
      fetchTaskStats(projects.map(p => p.id));
    }
  }, [ideas, projects]);

  const fetchProfiles = async (userIds: string[]) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (!error && data) {
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);
      setProfiles(profileMap);
    }
  };

  const fetchTaskStats = async (projectIds: string[]) => {
    // Fetch projects to get their current backlog
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, backlog')
      .in('id', projectIds);

    if (projectsError || !projectsData) return;

    // Create a map of project_id to backlog
    const projectBacklogMap = projectsData.reduce((acc, p) => {
      acc[p.id] = p.backlog;
      return acc;
    }, {} as Record<string, string>);

    const { data, error } = await supabase
      .from('tasks')
      .select('project_id, status, backlog')
      .in('project_id', projectIds);

    if (!error && data) {
      const statsMap = data.reduce((acc, task) => {
        if (!task.project_id) return acc;
        
        // Only count tasks from the current backlog
        const currentBacklog = projectBacklogMap[task.project_id];
        if (task.backlog !== currentBacklog) return acc;
        
        if (!acc[task.project_id]) {
          acc[task.project_id] = { total: 0, completed: 0 };
        }
        
        acc[task.project_id].total++;
        if (task.status === 'done') {
          acc[task.project_id].completed++;
        }
        
        return acc;
      }, {} as Record<string, { total: number; completed: number }>);
      
      setProjectTaskStats(statsMap);
    }
  };

  const inboxIdeas = ideas.filter(idea => idea.status === 'inbox');

  const projectsByBacklog = {
    business_innovation: projects.filter(p => p.backlog === 'business_innovation' && p.status !== 'completed'),
    engineering: projects.filter(p => p.backlog === 'engineering' && p.status !== 'completed'),
    outcomes_adoption: projects.filter(p => p.backlog === 'outcomes_adoption' && p.status !== 'completed'),
    completed: projects.filter(p => p.status === 'completed'),
  };

  const getBacklogIcon = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return <TrendingUp className="h-4 w-4" />;
      case 'engineering': return <Code className="h-4 w-4" />;
      case 'outcomes_adoption': return <Target className="h-4 w-4" />;
      case 'completed': return <CheckSquare className="h-4 w-4" />;
      default: return null;
    }
  };

  const getBacklogTitle = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return 'Business & Innovation';
      case 'engineering': return 'Engineering';
      case 'outcomes_adoption': return 'Outcomes & Adoption';
      case 'completed': return 'Completed Projects';
      default: return backlog;
    }
  };

  const getBacklogColor = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return 'border-blue-500/30 bg-blue-500/5';
      case 'engineering': return 'border-green-500/30 bg-green-500/5';
      case 'outcomes_adoption': return 'border-purple-500/30 bg-purple-500/5';
      case 'completed': return 'border-emerald-500/30 bg-emerald-500/5';
      default: return 'border-border';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Inbox Column */}
      <div className="space-y-3">
        <Card className="bg-muted/50 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Inbox
              <Badge variant="secondary" className="ml-auto">
                {inboxIdeas.length}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="space-y-3">
          {inboxIdeas.map((idea) => (
            <Card
              key={idea.id}
              className="cursor-pointer hover:shadow-hover transition-all border-border"
              onClick={() => onIdeaClick(idea)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium leading-tight">
                  {idea.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {idea.description}
                </p>
                {idea.departments && idea.departments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {idea.departments.slice(0, 2).map((dept) => (
                      <Badge key={dept} variant="outline" className="text-xs">
                        {dept}
                      </Badge>
                    ))}
                    {idea.departments.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{idea.departments.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Backlog Columns */}
      {(['business_innovation', 'engineering', 'outcomes_adoption', 'completed'] as const).map((backlog) => (
        <div key={backlog} className="space-y-3">
          <Card className={`border-2 ${getBacklogColor(backlog)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {getBacklogIcon(backlog)}
                {getBacklogTitle(backlog)}
                <Badge variant="secondary" className="ml-auto">
                  {projectsByBacklog[backlog].length}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>

          <div className="space-y-3">
            {projectsByBacklog[backlog].map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-hover transition-all border-border"
                onClick={() => onProjectClick(project)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {project.title}
                  </CardTitle>
                  {project.project_number && (
                    <Badge variant="outline" className="w-fit text-xs mt-1">
                      {project.project_number}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {project.description}
                    </p>
                  )}
                  
                  {project.departments && project.departments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.departments.slice(0, 2).map((dept: string) => (
                        <Badge key={dept} variant="outline" className="text-xs">
                          {dept}
                        </Badge>
                      ))}
                   {project.departments.length > 2 && (
                     <Badge variant="outline" className="text-xs">
                       +{project.departments.length - 2}
                     </Badge>
                   )}
                 </div>
               )}

                {backlog !== 'completed' && (
                  <>
                    <MoveToNextBacklogButton 
                      projectId={project.id}
                      currentBacklog={project.backlog}
                      onSuccess={() => onProjectUpdate?.()}
                      className="w-full mt-2"
                    />
                    <MoveToCompletedButton 
                      projectId={project.id}
                      currentBacklog={project.backlog}
                      canComplete={projectTaskStats[project.id]?.completed === projectTaskStats[project.id]?.total && projectTaskStats[project.id]?.total > 0}
                      onSuccess={() => onProjectUpdate?.()}
                      className="w-full mt-2"
                    />
                  </>
                )}

               {projectTaskStats[project.id] && projectTaskStats[project.id].total > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{projectTaskStats[project.id].completed}/{projectTaskStats[project.id].total} tasks</span>
                      </div>
                      <Progress 
                        value={(projectTaskStats[project.id].completed / projectTaskStats[project.id].total) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}

                   <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {project.owner_id && profiles[project.owner_id] && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{profiles[project.owner_id].display_name || 'Unknown'}</span>
                      </div>
                    )}
                    
                    {project.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {format(new Date(project.due_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {projectsByBacklog[backlog].length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-xs text-muted-foreground">No projects</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
