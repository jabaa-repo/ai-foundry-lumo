import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExperimentDialog from "@/components/ExperimentDialog";

interface Experiment {
  id: string;
  experiment_id: string;
  title: string;
  project_id: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'completed' | 'rejected';
  decision: 'continue' | 'scale' | 'modify' | 'abandon' | null;
  start_date: string | null;
  target_end_date: string | null;
  created_at: string;
}

export default function Experiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchExperiments();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchExperiments = async () => {
    const { data, error } = await (supabase as any)
      .from('experiments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch experiments",
      });
    } else {
      setExperiments((data || []) as Experiment[]);
    }
  };

  const filteredExperiments = filterStatus === 'all' 
    ? experiments 
    : experiments.filter(exp => exp.status === filterStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-secondary text-secondary-foreground';
      case 'running': return 'bg-primary text-primary-foreground';
      case 'completed': return 'bg-green-500 text-white';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDecisionColor = (decision: string | null) => {
    if (!decision) return 'bg-muted text-muted-foreground';
    switch (decision) {
      case 'continue': return 'bg-blue-500 text-white';
      case 'scale': return 'bg-green-500 text-white';
      case 'modify': return 'bg-yellow-500 text-white';
      case 'abandon': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-primary">Experiments Log</h1>
            </div>
          </div>
          <Button
            onClick={() => {
              setSelectedExperiment(null);
              setShowDialog(true);
            }}
            className="bg-primary hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Experiment
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'draft', 'running', 'completed', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Experiments Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExperiments.map((experiment) => (
            <Card
              key={experiment.id}
              className="cursor-pointer hover:shadow-elegant transition-shadow"
              onClick={() => {
                setSelectedExperiment(experiment);
                setShowDialog(true);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{experiment.title}</CardTitle>
                  <Badge className={getStatusColor(experiment.status)}>
                    {experiment.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {experiment.experiment_id}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Hypothesis</p>
                  <p className="text-sm line-clamp-2">{experiment.hypothesis}</p>
                </div>
                {experiment.decision && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Decision:</span>
                    <Badge className={getDecisionColor(experiment.decision)}>
                      {experiment.decision}
                    </Badge>
                  </div>
                )}
                {experiment.target_end_date && (
                  <p className="text-xs text-muted-foreground">
                    Target: {new Date(experiment.target_end_date).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredExperiments.length === 0 && (
          <div className="text-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No experiments found</p>
          </div>
        )}
      </main>

      <ExperimentDialog
        experiment={selectedExperiment}
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={fetchExperiments}
      />
    </div>
  );
}
