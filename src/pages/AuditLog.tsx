import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, History, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  details: any;
  created_at: string;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchAuditLog();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchAuditLog = async () => {
    const { data, error } = await (supabase as any)
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch audit log",
      });
    } else {
      setEntries((data || []) as AuditEntry[]);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.entity_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || entry.entity_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-500 text-white';
    if (action.includes('update')) return 'bg-blue-500 text-white';
    if (action.includes('delete')) return 'bg-destructive text-destructive-foreground';
    if (action.includes('archive')) return 'bg-yellow-500 text-white';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Audit Log</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        {/* Search and Filter */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audit log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'idea', 'project', 'task', 'experiment', 'artifact'].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                onClick={() => setFilterType(type)}
                size="sm"
                className="capitalize"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Audit Entries */}
        <div className="space-y-2">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-soft transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getActionColor(entry.action)}>
                        {entry.action}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {entry.entity_type}
                      </Badge>
                    </div>
                    {entry.details && (
                      <p className="text-sm text-muted-foreground">
                        {JSON.stringify(entry.details)}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No audit entries found</p>
          </div>
        )}
      </main>
    </div>
  );
}
