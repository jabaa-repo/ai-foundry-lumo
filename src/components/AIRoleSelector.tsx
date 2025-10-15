import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const AI_FOUNDRY_ROLES = [
  // Business Innovation Team
  { id: 'business_analyst', name: 'Business Analyst', description: 'Analyze current processes and identify opportunities', division: 'Business Innovation' },
  { id: 'ai_process_reengineer', name: 'AI Process Reengineer', description: 'Redesign processes with AI capabilities', division: 'Business Innovation' },
  { id: 'ai_innovation_executive', name: 'AI Innovation Executive', description: 'Lead innovation strategy and experimentation', division: 'Business Innovation' },
  
  // Engineering Team
  { id: 'ai_system_architect', name: 'AI System Architect', description: 'Design technical architecture and specifications', division: 'Engineering' },
  { id: 'ai_system_engineer', name: 'AI System Engineer', description: 'Build and implement AI solutions', division: 'Engineering' },
  { id: 'ai_data_engineer', name: 'AI Data Engineer', description: 'Manage data infrastructure and analytics', division: 'Engineering' },
  
  // Adoption & Outcomes Team
  { id: 'outcomes_analytics_executive', name: 'Outcomes & Analytics Executive', description: 'Monitor outcomes and drive continuous improvement', division: 'Adoption' },
  { id: 'education_implementation_executive', name: 'Education & Implementation Executive', description: 'Develop training and manage rollout', division: 'Adoption' },
  { id: 'change_leadership_architect', name: 'Change Leadership Architect', description: 'Lead change management and adoption strategy', division: 'Adoption' },
];

interface AIRoleSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export default function AIRoleSelector({ value, onValueChange }: AIRoleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>AI Consultant Role</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="border-border">
          <SelectValue placeholder="Select AI role..." />
        </SelectTrigger>
        <SelectContent className="bg-card border-border max-h-80">
          {AI_FOUNDRY_ROLES.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{role.name}</span>
                  <span className="text-xs text-muted-foreground">({role.division})</span>
                </div>
                <span className="text-xs text-muted-foreground">{role.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { AI_FOUNDRY_ROLES };
