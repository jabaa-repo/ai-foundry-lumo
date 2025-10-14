import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Idea {
  id: string;
  idea_id: string;
  title: string;
  description: string;
  possible_outcome: string;
  status: 'inbox' | 'triaged' | 'backlog' | 'moved' | 'archived';
  category: string | null;
  created_at: string;
}

interface KanbanBoardProps {
  ideas: Idea[];
  onIdeaClick: (idea: Idea) => void;
}

const COLUMNS = [
  { id: 'inbox', title: 'Inbox', color: 'bg-accent/20', category: null },
  { id: 'backlog', title: 'Business & Innovation', color: 'bg-primary/10', category: 'business' },
  { id: 'backlog', title: 'Software Engineering', color: 'bg-primary/20', category: 'software' },
  { id: 'backlog', title: 'Adoption & Outcomes', color: 'bg-accent/30', category: 'adoption' },
];

export default function KanbanBoard({ ideas, onIdeaClick }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((column, idx) => {
        const columnIdeas = ideas.filter((idea) => 
          idea.status === column.id && 
          (column.category === null || idea.category === column.category)
        );
        
        return (
          <div key={`${column.id}-${idx}`} className="space-y-3">
            <div className={`rounded-lg p-3 ${column.color}`}>
              <h3 className="font-bold text-sm text-foreground">{column.title}</h3>
              <Badge variant="secondary" className="mt-1">
                {columnIdeas.length} items
              </Badge>
            </div>
            
            <div className="space-y-3">
              {columnIdeas.map((idea) => (
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
                    <div className="flex items-center gap-2">
                      <Progress value={Math.random() * 100} className="h-1.5" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {Math.floor(Math.random() * 100)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}