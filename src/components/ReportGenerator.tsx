import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Download } from "lucide-react";

const REPORT_TYPES = [
  { id: 'progress', name: 'Progress Summary', description: 'Overall project and task progress' },
  { id: 'bottleneck', name: 'Bottleneck Analysis', description: 'Identify blockers and delays' },
  { id: 'resource', name: 'Resource Allocation', description: 'Team capacity and assignments' },
  { id: 'executive', name: 'Executive Summary', description: 'High-level overview for leadership' },
];

export default function ReportGenerator() {
  const [reportType, setReportType] = useState("");
  const [generatedReport, setGeneratedReport] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a report type",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to generate reports",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedReport = REPORT_TYPES.find(r => r.id === reportType);
      const { data, error } = await supabase.functions.invoke('lumo-chat', {
        body: { 
          message: `Generate a ${selectedReport?.name} report. ${selectedReport?.description}. 
          
          Include:
          - Current status of all active projects and ideas
          - Task completion rates
          - Key achievements and milestones
          - Identified risks or blockers
          - Recommendations for next steps
          
          Format the report professionally with clear sections and actionable insights.`,
          role: 'project_manager'
        }
      });

      if (error) throw error;

      setGeneratedReport(data.response);
      toast({
        title: "Report Generated",
        description: "Your report has been created successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate report",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumo-report-${reportType}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Report Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Report Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="border-border">
              <SelectValue placeholder="Select report type..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{type.name}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerateReport}
          disabled={loading || !reportType}
          className="w-full bg-primary hover:bg-primary-hover"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>

        {generatedReport && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Generated Report</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="border-border"
              >
                <Download className="mr-2 h-3 w-3" />
                Download
              </Button>
            </div>
            <Textarea
              value={generatedReport}
              readOnly
              className="min-h-[400px] font-mono text-sm border-border bg-background"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
