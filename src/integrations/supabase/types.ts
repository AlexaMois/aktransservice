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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          description: string
          document_url: string | null
          id: string
          published_at: string
          related_task_ids: string[] | null
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          document_url?: string | null
          id?: string
          published_at?: string
          related_task_ids?: string[] | null
          target_audience?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          document_url?: string | null
          id?: string
          published_at?: string
          related_task_ids?: string[] | null
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      digitization_queue: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      experiments: {
        Row: {
          created_at: string
          description: string | null
          hypothesis: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hypothesis?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hypothesis?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      not_automating: {
        Row: {
          created_at: string
          id: string
          reason: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author: string
          created_at: string
          id: string
          task_id: string
          text: string
        }
        Insert: {
          author?: string
          created_at?: string
          id?: string
          task_id: string
          text: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          task_id?: string
          text?: string
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
      tasks: {
        Row: {
          author: string
          created_at: string
          description: string | null
          due_date: string | null
          effect_type: Database["public"]["Enums"]["effect_type"] | null
          execution_log: string | null
          file_name: string | null
          file_url: string | null
          id: string
          importance: Database["public"]["Enums"]["importance_rating"] | null
          input_data_description: string | null
          linked_idea_id: string | null
          linked_problem_id: string | null
          owner: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          problem_description: string | null
          reminder_sent: boolean
          result_action: string | null
          result_after: string | null
          result_before: string | null
          status: Database["public"]["Enums"]["task_status"]
          summary: string
          task_scope: Database["public"]["Enums"]["task_scope"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          author?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          effect_type?: Database["public"]["Enums"]["effect_type"] | null
          execution_log?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["importance_rating"] | null
          input_data_description?: string | null
          linked_idea_id?: string | null
          linked_problem_id?: string | null
          owner?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          problem_description?: string | null
          reminder_sent?: boolean
          result_action?: string | null
          result_after?: string | null
          result_before?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          summary: string
          task_scope?: Database["public"]["Enums"]["task_scope"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          author?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          effect_type?: Database["public"]["Enums"]["effect_type"] | null
          execution_log?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["importance_rating"] | null
          input_data_description?: string | null
          linked_idea_id?: string | null
          linked_problem_id?: string | null
          owner?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          problem_description?: string | null
          reminder_sent?: boolean
          result_action?: string | null
          result_after?: string | null
          result_before?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          summary?: string
          task_scope?: Database["public"]["Enums"]["task_scope"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_linked_idea_id_fkey"
            columns: ["linked_idea_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_linked_problem_id_fkey"
            columns: ["linked_problem_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_telegram: {
        Row: {
          created_at: string
          id: string
          telegram_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          telegram_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          telegram_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      effect_type:
        | "security"
        | "compliance"
        | "reduce_manual_work"
        | "process_speed"
        | "transparency"
        | "audit_prep"
        | "financial"
      importance_rating: "critical" | "important" | "can_wait"
      task_priority: "high" | "medium" | "low"
      task_scope: "digitization" | "personal"
      task_status: "ideas" | "planned" | "in-progress" | "completed" | "review"
      task_type: "idea" | "problem" | "task" | "announcement" | "question"
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
      app_role: ["admin", "user"],
      effect_type: [
        "security",
        "compliance",
        "reduce_manual_work",
        "process_speed",
        "transparency",
        "audit_prep",
        "financial",
      ],
      importance_rating: ["critical", "important", "can_wait"],
      task_priority: ["high", "medium", "low"],
      task_scope: ["digitization", "personal"],
      task_status: ["ideas", "planned", "in-progress", "completed", "review"],
      task_type: ["idea", "problem", "task", "announcement", "question"],
    },
  },
} as const
