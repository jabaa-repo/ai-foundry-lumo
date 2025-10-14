import { Badge } from "@/components/ui/badge";

interface WorkflowStepIndicatorProps {
  step: number;
  compact?: boolean;
}

const WORKFLOW_STEPS = [
  { step: 0, name: "Inbox", color: "bg-gray-500" },
  { step: 1, name: "Diagnose", color: "bg-blue-500", division: "Business Innovation" },
  { step: 2, name: "Redesign", color: "bg-blue-600", division: "Business Innovation" },
  { step: 3, name: "LoFA", color: "bg-blue-700", division: "Business Innovation" },
  { step: 4, name: "Specs", color: "bg-green-500", division: "Engineering" },
  { step: 5, name: "Build", color: "bg-green-600", division: "Engineering" },
  { step: 6, name: "Analytics", color: "bg-green-700", division: "Engineering" },
  { step: 7, name: "Rollout", color: "bg-purple-500", division: "Adoption" },
  { step: 8, name: "Training", color: "bg-purple-600", division: "Adoption" },
  { step: 9, name: "Monitor", color: "bg-purple-700", division: "Adoption" },
];

export default function WorkflowStepIndicator({ step, compact = false }: WorkflowStepIndicatorProps) {
  const currentStep = WORKFLOW_STEPS.find(s => s.step === step) || WORKFLOW_STEPS[0];
  
  if (compact) {
    return (
      <Badge className={`${currentStep.color} text-white`}>
        Step {step}: {currentStep.name}
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge className={`${currentStep.color} text-white`}>
          Step {step}
        </Badge>
        <span className="text-sm font-semibold">{currentStep.name}</span>
      </div>
      {currentStep.division && (
        <p className="text-xs text-muted-foreground">{currentStep.division}</p>
      )}
    </div>
  );
}

export { WORKFLOW_STEPS };
