import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Menu, 
  Archive, 
  FileText, 
  ClipboardList, 
  FlaskConical, 
  Shield,
  History
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ReportGenerator from "./ReportGenerator";

export default function MainMenu() {
  const [open, setOpen] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const menuItems = [
    {
      icon: Archive,
      title: "Archived Projects",
      description: "View and restore archived projects",
      onClick: () => {
        navigate("/archive");
        setOpen(false);
      }
    },
    {
      icon: Archive,
      title: "Archived Ideas",
      description: "View and restore archived ideas",
      onClick: () => {
        navigate("/archived-ideas");
        setOpen(false);
      }
    },
    {
      icon: FileText,
      title: "Generate Report",
      description: "Create progress summaries and analysis reports",
      onClick: () => {
        setShowReportDialog(true);
        setOpen(false);
      }
    },
    {
      icon: ClipboardList,
      title: "Full Project Log",
      description: "View detailed project timeline and history",
      onClick: () => {
        navigate("/projects");
        setOpen(false);
      }
    },
    {
      icon: FlaskConical,
      title: "Experiments Log",
      description: "Manage and track all experiments",
      onClick: () => {
        navigate("/experiments");
        setOpen(false);
      }
    },
    {
      icon: History,
      title: "Audit Log",
      description: "View complete system audit trail",
      onClick: () => {
        navigate("/audit-log");
        setOpen(false);
      }
    },
    {
      icon: Shield,
      title: "Safety & Governance Checker",
      description: "Review compliance and governance requirements (Coming Soon)",
      onClick: () => {
        toast({
          title: "Coming Soon",
          description: "This feature is under development"
        });
      }
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="text-primary">Additional Features</SheetTitle>
          <SheetDescription>
            Access advanced tools and utilities
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {menuItems.map((item, index) => (
            <div key={index}>
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-4 px-4"
                onClick={item.onClick}
              >
                <div className="flex items-start gap-4 text-left">
                  <item.icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </Button>
              {index < menuItems.length - 1 && <Separator className="my-2" />}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>

    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
      <DialogContent className="sm:max-w-[700px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Generator</DialogTitle>
        </DialogHeader>
        <ReportGenerator />
      </DialogContent>
    </Dialog>
    </>
  );
}