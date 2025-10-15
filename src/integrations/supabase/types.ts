export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          idea_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idea_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idea_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          created_at: string
          hypothesis: string
          id: string
          method: string
          progress_updates: string[] | null
          project_id: string | null
          success_criteria: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hypothesis: string
          id?: string
          method: string
          progress_updates?: string[] | null
          project_id?: string | null
          success_criteria: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hypothesis?: string
          id?: string
          method?: string
          progress_updates?: string[] | null
          project_id?: string | null
          success_criteria?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          accountable_id: string | null
          category: string | null
          consulted_ids: string[] | null
          created_at: string
          departments: string[] | null
          description: string
          id: string
          idea_id: string | null
          informed_ids: string[] | null
          owner: string | null
          owner_id: string | null
          possible_outcome: string
          responsible_id: string | null
          status: Database["public"]["Enums"]["idea_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accountable_id?: string | null
          category?: string | null
          consulted_ids?: string[] | null
          created_at?: string
          departments?: string[] | null
          description: string
          id?: string
          idea_id?: string | null
          informed_ids?: string[] | null
          owner?: string | null
          owner_id?: string | null
          possible_outcome: string
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accountable_id?: string | null
          category?: string | null
          consulted_ids?: string[] | null
          created_at?: string
          departments?: string[] | null
          description?: string
          id?: string
          idea_id?: string | null
          informed_ids?: string[] | null
          owner?: string | null
          owner_id?: string | null
          possible_outcome?: string
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          accountable_id: string | null
          consulted_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          informed_ids: string[] | null
          latest_update: string | null
          owner_id: string | null
          primary_metric: number | null
          responsible_id: string | null
          secondary_metrics: Json | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          accountable_id?: string | null
          consulted_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          informed_ids?: string[] | null
          latest_update?: string | null
          owner_id?: string | null
          primary_metric?: number | null
          responsible_id?: string | null
          secondary_metrics?: Json | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          accountable_id?: string | null
          consulted_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          informed_ids?: string[] | null
          latest_update?: string | null
          owner_id?: string | null
          primary_metric?: number | null
          responsible_id?: string | null
          secondary_metrics?: Json | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          idea_id: string | null
          owner_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          idea_id?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          idea_id?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      idea_status:
        | "inbox"
        | "business_backlog"
        | "engineering_backlog"
        | "outcomes_backlog"
        | "archived"
      project_status: "recent" | "live" | "completed" | "archived"
      task_status: "todo" | "in_progress" | "done" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      idea_status: [
        "inbox",
        "business_backlog",
        "engineering_backlog",
        "outcomes_backlog",
        "archived",
      ],
      project_status: ["recent", "live", "completed", "archived"],
      task_status: ["todo", "in_progress", "done", "blocked"],
    },
  },
} as const
