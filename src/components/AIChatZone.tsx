import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_PROMPTS = [
  "Give me a round up of recent activity",
  "Summarise my outstanding tasks",
  "List overdue projects and tasks",
  "Where are the bottlenecks?",
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatZone() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || input;
    if (!messageToSend.trim()) return;

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to use LUMO chat",
      });
      return;
    }

    setLoading(true);
    const userMessage: Message = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    try {
      const { data, error } = await supabase.functions.invoke('lumo-chat', {
        body: { message: messageToSend }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get response from LUMO. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sticky bottom-0 bg-card border-t border-border shadow-card">
      <div className="container mx-auto p-4 space-y-3">
        {messages.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
            {messages.map((msg, idx) => (
              <Card key={idx} className={msg.role === 'user' ? 'bg-primary/5' : 'bg-accent/5'}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className={`h-4 w-4 mt-1 ${msg.role === 'user' ? 'text-primary' : 'text-accent'}`} />
                    <p className="text-sm text-foreground flex-1">{msg.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask LUMO anything about your projects, tasks, or ideas..."
              className="min-h-[60px] resize-none pr-12 border-border bg-background text-foreground"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="absolute bottom-2 right-2 h-8 w-8 bg-primary hover:bg-primary-hover"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 transition-colors border-primary/30 text-foreground"
              onClick={() => handleSendMessage(prompt)}
            >
              {prompt}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}