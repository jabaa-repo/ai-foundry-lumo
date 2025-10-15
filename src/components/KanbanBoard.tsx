import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, User, Calendar, TrendingUp, Code, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import WorkflowStepIndicator from "./WorkflowStepIndicator";

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
}

export default function KanbanBoard({ ideas, projects, onIdeaClick }: KanbanBoardProps) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    const ownerIds = ideas
      .map(idea => idea.owner_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const uniqueOwnerIds = [...new Set(ownerIds)];
    
    if (uniqueOwnerIds.length > 0) {
      fetchProfiles(uniqueOwnerIds);
    }
  }, [ideas]);

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

  const inboxIdeas = ideas.filter(idea => idea.status === 'inbox');

  const projectsByBacklog = {
    business_innovation: projects.filter(p => p.backlog === 'business_innovation'),
    engineering: projects.filter(p => p.backlog === 'engineering'),
    outcomes_adoption: projects.filter(p => p.backlog === 'outcomes_adoption'),
  };

  const getBacklogIcon = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return <TrendingUp className="h-4 w-4" />;
      case 'engineering': return <Code className="h-4 w-4" />;
      case 'outcomes_adoption': return <Target className="h-4 w-4" />;
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

  const getBacklogColor = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return 'border-blue-500/30 bg-blue-500/5';
      case 'engineering': return 'border-green-500/30 bg-green-500/5';
      case 'outcomes_adoption': return 'border-purple-500/30 bg-purple-500/5';
      default: return 'border-border';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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
      {(['business_innovation', 'engineering', 'outcomes_adoption'] as const).map((backlog) => (
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
                  {project.workflow_step !== undefined && (
                    <div className="mt-2">
                      <WorkflowStepIndicator step={project.workflow_step} compact />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.project_brief && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {project.project_brief}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(project.last_activity_date || project.updated_at), 'MMM dd, yyyy')}</span>
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
