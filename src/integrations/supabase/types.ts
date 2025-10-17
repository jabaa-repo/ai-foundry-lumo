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
      archived_ideas: {
        Row: {
          accountable_id: string | null
          archived_at: string
          category: string | null
          consulted_ids: string[] | null
          created_at: string
          departments: string[] | null
          description: string
          id: string
          idea_id: string | null
          informed_ids: string[] | null
          owner_id: string | null
          possible_outcome: string
          responsible_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accountable_id?: string | null
          archived_at?: string
          category?: string | null
          consulted_ids?: string[] | null
          created_at?: string
          departments?: string[] | null
          description: string
          id?: string
          idea_id?: string | null
          informed_ids?: string[] | null
          owner_id?: string | null
          possible_outcome: string
          responsible_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accountable_id?: string | null
          archived_at?: string
          category?: string | null
          consulted_ids?: string[] | null
          created_at?: string
          departments?: string[] | null
          description?: string
          id?: string
          idea_id?: string | null
          informed_ids?: string[] | null
          owner_id?: string | null
          possible_outcome?: string
          responsible_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      comment_attachments: {
        Row: {
          comment_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_by: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_by: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
        ]
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          position: Database["public"]["Enums"]["team_position"] | null
          team: Database["public"]["Enums"]["team_type"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          position?: Database["public"]["Enums"]["team_position"] | null
          team?: Database["public"]["Enums"]["team_type"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          position?: Database["public"]["Enums"]["team_position"] | null
          team?: Database["public"]["Enums"]["team_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          accountable_id: string | null
          backlog: Database["public"]["Enums"]["backlog_type"] | null
          consulted_ids: string[] | null
          created_at: string
          departments: string[] | null
          description: string | null
          desired_outcomes: string
          due_date: string | null
          id: string
          informed_ids: string[] | null
          last_activity_date: string | null
          latest_update: string | null
          owner_id: string | null
          primary_metric: number | null
          project_brief: string
          project_number: string | null
          responsible_id: string | null
          secondary_metrics: Json | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
          workflow_step: number | null
        }
        Insert: {
          accountable_id?: string | null
          backlog?: Database["public"]["Enums"]["backlog_type"] | null
          consulted_ids?: string[] | null
          created_at?: string
          departments?: string[] | null
          description?: string | null
          desired_outcomes: string
          due_date?: string | null
          id?: string
          informed_ids?: string[] | null
          last_activity_date?: string | null
          latest_update?: string | null
          owner_id?: string | null
          primary_metric?: number | null
          project_brief: string
          project_number?: string | null
          responsible_id?: string | null
          secondary_metrics?: Json | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
          workflow_step?: number | null
        }
        Update: {
          accountable_id?: string | null
          backlog?: Database["public"]["Enums"]["backlog_type"] | null
          consulted_ids?: string[] | null
          created_at?: string
          departments?: string[] | null
          description?: string | null
          desired_outcomes?: string
          due_date?: string | null
          id?: string
          informed_ids?: string[] | null
          last_activity_date?: string | null
          latest_update?: string | null
          owner_id?: string | null
          primary_metric?: number | null
          project_brief?: string
          project_number?: string | null
          responsible_id?: string | null
          secondary_metrics?: Json | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
          workflow_step?: number | null
        }
        Relationships: []
      }
      task_activities: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_responsible_users: {
        Row: {
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_responsible_users_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          accountable_id: string | null
          accountable_role: string | null
          assigned_to: string | null
          backlog: Database["public"]["Enums"]["backlog_type"] | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          idea_id: string | null
          owner_id: string | null
          project_id: string | null
          responsible_role: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          accountable_id?: string | null
          accountable_role?: string | null
          assigned_to?: string | null
          backlog?: Database["public"]["Enums"]["backlog_type"] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          idea_id?: string | null
          owner_id?: string | null
          project_id?: string | null
          responsible_role?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          accountable_id?: string | null
          accountable_role?: string | null
          assigned_to?: string | null
          backlog?: Database["public"]["Enums"]["backlog_type"] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          idea_id?: string | null
          owner_id?: string | null
          project_id?: string | null
          responsible_role?: string | null
          start_date?: string | null
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
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_idea_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_project_number: {
        Args: { ai_tag: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "system_admin" | "project_owner" | "team_member" | "management"
      backlog_type: "business_innovation" | "engineering" | "outcomes_adoption"
      idea_status:
        | "inbox"
        | "business_backlog"
        | "engineering_backlog"
        | "outcomes_backlog"
        | "archived"
      project_status: "recent" | "live" | "completed" | "archived"
      task_status: "unassigned" | "in_progress" | "done"
      team_position:
        | "business_analyst"
        | "ai_process_reengineer"
        | "ai_innovation_executive"
        | "ai_system_architect"
        | "ai_system_engineer"
        | "ai_data_engineer"
        | "outcomes_analytics_executive"
        | "education_implementation_executive"
        | "change_leadership_architect"
      team_type: "business_innovation" | "engineering" | "adoption_outcomes"
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
      app_role: ["system_admin", "project_owner", "team_member", "management"],
      backlog_type: ["business_innovation", "engineering", "outcomes_adoption"],
      idea_status: [
        "inbox",
        "business_backlog",
        "engineering_backlog",
        "outcomes_backlog",
        "archived",
      ],
      project_status: ["recent", "live", "completed", "archived"],
      task_status: ["unassigned", "in_progress", "done"],
      team_position: [
        "business_analyst",
        "ai_process_reengineer",
        "ai_innovation_executive",
        "ai_system_architect",
        "ai_system_engineer",
        "ai_data_engineer",
        "outcomes_analytics_executive",
        "education_implementation_executive",
        "change_leadership_architect",
      ],
      team_type: ["business_innovation", "engineering", "adoption_outcomes"],
    },
  },
} as const
