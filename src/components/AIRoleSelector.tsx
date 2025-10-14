import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const AI_FOUNDRY_ROLES = [
  { id: 'business_strategist', name: 'Business Strategist', description: 'Strategic planning and business model development' },
  { id: 'technical_architect', name: 'Technical Architect', description: 'System design and technical infrastructure' },
  { id: 'data_scientist', name: 'Data Scientist', description: 'Data analysis and ML model development' },
  { id: 'ux_designer', name: 'UX Designer', description: 'User experience and interface design' },
  { id: 'product_manager', name: 'Product Manager', description: 'Product strategy and roadmap planning' },
  { id: 'ml_engineer', name: 'ML Engineer', description: 'ML model deployment and optimization' },
  { id: 'quality_engineer', name: 'Quality Engineer', description: 'Testing and quality assurance' },
  { id: 'adoption_specialist', name: 'Adoption Specialist', description: 'Change management and user adoption' },
  { id: 'project_manager', name: 'Project Manager', description: 'Project planning and report writing' },
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
                <span className="font-medium">{role.name}</span>
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
