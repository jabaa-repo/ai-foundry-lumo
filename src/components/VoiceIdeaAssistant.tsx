import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Sparkles, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceIdeaAssistantProps {
  onIdeaSaved?: () => void;
}

export default function VoiceIdeaAssistant({ onIdeaSaved }: VoiceIdeaAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState<{
    title: string;
    description: string;
  } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Speak your idea...",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not access microphone",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error("Failed to convert audio");
        }

        // Send to speech-to-text edge function
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: base64Audio }
        });

        if (transcriptError) throw transcriptError;

        const transcribedText = transcriptData.text;
        setTranscript(transcribedText);

        // Generate idea using AI
        await generateIdea(transcribedText);
      };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process audio",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateIdea = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('lumo-chat', {
        body: { 
          message: `Based on the following brainstorming notes, create a well-structured idea:

${text}

Please provide:
1. A clear, concise title (max 10 words)
2. A detailed description (2-3 sentences that explain the idea, its purpose, and potential impact)

Format your response as:
TITLE: [title here]
DESCRIPTION: [description here]`
        }
      });

      if (error) throw error;

      const response = data.response;
      
      // Parse the AI response
      const titleMatch = response.match(/TITLE:\s*(.+?)(?=\n|DESCRIPTION:|$)/s);
      const descMatch = response.match(/DESCRIPTION:\s*(.+?)$/s);
      
      if (titleMatch && descMatch) {
        setGeneratedIdea({
          title: titleMatch[1].trim(),
          description: descMatch[1].trim()
        });
        
        toast({
          title: "Idea Generated",
          description: "Review and save your idea to inbox",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate idea",
      });
    }
  };

  const saveToInbox = async () => {
    if (!generatedIdea) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('ideas')
        .insert([{
          title: generatedIdea.title,
          description: generatedIdea.description,
          possible_outcome: '',
          status: 'inbox',
          user_id: user.id,
          owner_id: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Idea saved to inbox",
      });

      // Reset
      setTranscript("");
      setGeneratedIdea(null);
      onIdeaSaved?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          Voice Idea Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className="h-20 w-20 rounded-full"
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isRecording
            ? "Recording... Click to stop"
            : isProcessing
            ? "Processing your idea..."
            : "Click to start recording your idea"}
        </p>

        {transcript && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Transcript:</label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Your transcribed speech will appear here..."
            />
          </div>
        )}

        {generatedIdea && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <label className="text-sm font-medium">Generated Title:</label>
              <Textarea
                value={generatedIdea.title}
                onChange={(e) => setGeneratedIdea({ ...generatedIdea, title: e.target.value })}
                rows={1}
                className="resize-none font-semibold"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Generated Description:</label>
              <Textarea
                value={generatedIdea.description}
                onChange={(e) => setGeneratedIdea({ ...generatedIdea, description: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button
              onClick={saveToInbox}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save to Inbox
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
