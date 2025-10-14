import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface ParticipantChipsProps {
  userIds: string[];
  maxDisplay?: number;
}

interface Profile {
  id: string;
  display_name: string | null;
}

export default function ParticipantChips({ userIds, maxDisplay = 5 }: ParticipantChipsProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (userIds.length > 0) {
      fetchProfiles();
    }
  }, [userIds]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    
    if (data) setProfiles(data);
  };

  const uniqueProfiles = profiles.filter((p, idx, self) => 
    idx === self.findIndex(t => t.id === p.id)
  );

  const displayProfiles = uniqueProfiles.slice(0, maxDisplay);
  const remainingCount = uniqueProfiles.length - maxDisplay;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getColor = (id: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (uniqueProfiles.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {displayProfiles.map((profile) => (
          <Tooltip key={profile.id}>
            <TooltipTrigger>
              <Avatar className={`h-7 w-7 border-2 border-card ${getColor(profile.id)}`}>
                <AvatarFallback className="text-white text-xs">
                  {getInitials(profile.display_name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{profile.display_name || 'Unknown User'}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Avatar className="h-7 w-7 border-2 border-card bg-muted">
            <AvatarFallback className="text-xs">
              +{remainingCount}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </TooltipProvider>
  );
}
