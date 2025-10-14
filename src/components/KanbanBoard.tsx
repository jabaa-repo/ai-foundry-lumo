import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Idea {
  id: string;
  title: string;
  description: string;
  possible_outcome: string;
  status: 'inbox' | 'business_backlog' | 'engineering_backlog' | 'outcomes_backlog' | 'archived';
  created_at: string;
}

interface KanbanBoardProps {
  ideas: Idea[];
  onIdeaClick: (idea: Idea) => void;
}

const COLUMNS = [
  { id: 'inbox', title: 'Inbox', color: 'bg-accent/20' },
  { id: 'business_backlog', title: 'Business & Innovation Backlog', color: 'bg-primary/10' },
  { id: 'engineering_backlog', title: 'Software Engineering Backlog', color: 'bg-primary/20' },
  { id: 'outcomes_backlog', title: 'Adoption & Outcomes Backlog', color: 'bg-accent/30' },
];

export default function KanbanBoard({ ideas, onIdeaClick }: KanbanBoardProps) {
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
              {columnIdeas.map((idea) => (
                <Card
                  key={idea.id}
                  className="cursor-pointer hover:shadow-hover transition-all border-border bg-card"
                  onClick={() => onIdeaClick(idea)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground line-clamp-2">
                      {idea.title}
                    </CardTitle>
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