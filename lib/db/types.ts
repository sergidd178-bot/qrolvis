// Tipos generados a partir del esquema de Supabase. No editar a mano.
//
// Regenerar cuando cambie el esquema:
//   npx supabase gen types typescript --project-id dvnzluhuxypbhuwjwfik > lib/db/types.ts

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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          business_id: string
          channel: string
          created_at: string
          error_detail: string | null
          id: string
          message_id: string | null
          response_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          business_id: string
          channel?: string
          created_at?: string
          error_detail?: string | null
          id?: string
          message_id?: string | null
          response_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          channel?: string
          created_at?: string
          error_detail?: string | null
          id?: string
          message_id?: string | null
          response_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: true
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          id: string
          question_id: string
          rating_value: number | null
          response_id: string
          text_value: string | null
        }
        Insert: {
          id?: string
          question_id: string
          rating_value?: number | null
          response_id: string
          text_value?: string | null
        }
        Update: {
          id?: string
          question_id?: string
          rating_value?: number | null
          response_id?: string
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          alert_email: string
          created_at: string
          default_language: string
          google_review_url: string | null
          id: string
          name: string
          onboarded_at: string | null
          question_set_id: string
          sector_id: number
          status: string
        }
        Insert: {
          alert_email: string
          created_at?: string
          default_language?: string
          google_review_url?: string | null
          id?: string
          name: string
          onboarded_at?: string | null
          question_set_id: string
          sector_id: number
          status?: string
        }
        Update: {
          alert_email?: string
          created_at?: string
          default_language?: string
          google_review_url?: string | null
          id?: string
          name?: string
          onboarded_at?: string | null
          question_set_id?: string
          sector_id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_question_set_id_fkey"
            columns: ["question_set_id"]
            isOneToOne: false
            referencedRelation: "question_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_points: {
        Row: {
          business_id: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          qr_asset_url: string | null
          type: string
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          qr_asset_url?: string | null
          type: string
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          qr_asset_url?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_points_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      question_sets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sector_id: number
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sector_id: number
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sector_id?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_sets_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          code: string
          dimension: string
          id: string
          is_required: boolean
          position: number
          question_set_id: string
          text_ca: string
          text_es: string
          type: string
        }
        Insert: {
          code: string
          dimension: string
          id?: string
          is_required?: boolean
          position: number
          question_set_id: string
          text_ca: string
          text_es: string
          type: string
        }
        Update: {
          code?: string
          dimension?: string
          id?: string
          is_required?: boolean
          position?: number
          question_set_id?: string
          text_ca?: string
          text_es?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_question_set_id_fkey"
            columns: ["question_set_id"]
            isOneToOne: false
            referencedRelation: "question_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          business_id: string
          generated_at: string | null
          id: string
          message_id: string | null
          metrics: Json
          pdf_url: string | null
          period_end: string
          period_start: string
          recommendation: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          business_id: string
          generated_at?: string | null
          id?: string
          message_id?: string | null
          metrics: Json
          pdf_url?: string | null
          period_end: string
          period_start: string
          recommendation?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          generated_at?: string | null
          id?: string
          message_id?: string | null
          metrics?: Json
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          recommendation?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          business_id: string
          capture_point_id: string
          comment: string | null
          completed_at: string | null
          completeness: string
          device_token: string | null
          google_link_shown: boolean
          id: string
          language: string
          overall_rating: number
          question_set_id: string
          submitted_at: string
        }
        Insert: {
          business_id: string
          capture_point_id: string
          comment?: string | null
          completed_at?: string | null
          completeness?: string
          device_token?: string | null
          google_link_shown?: boolean
          id?: string
          language: string
          overall_rating: number
          question_set_id: string
          submitted_at?: string
        }
        Update: {
          business_id?: string
          capture_point_id?: string
          comment?: string | null
          completed_at?: string | null
          completeness?: string
          device_token?: string | null
          google_link_shown?: boolean
          id?: string
          language?: string
          overall_rating?: number
          question_set_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_capture_point_id_fkey"
            columns: ["capture_point_id"]
            isOneToOne: false
            referencedRelation: "capture_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_question_set_id_fkey"
            columns: ["question_set_id"]
            isOneToOne: false
            referencedRelation: "question_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          code: string
          id: number
          name_ca: string
          name_es: string
        }
        Insert: {
          code: string
          id: number
          name_ca: string
          name_es: string
        }
        Update: {
          code?: string
          id?: number
          name_ca?: string
          name_es?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      capture_point_config: {
        Args: { p_code: string }
        Returns: {
          business_name: string
          default_language: string
          google_review_url: string
          question_set_id: string
        }[]
      }
      create_business: {
        Args: {
          p_alert_email: string
          p_default_language: string
          p_google_review_url?: string
          p_name: string
          p_sector_id: number
        }
        Returns: {
          business_id: string
          capture_point_code: string
        }[]
      }
      create_capture_point: {
        Args: { p_business_id: string; p_label: string; p_type: string }
        Returns: {
          capture_point_code: string
          capture_point_id: string
        }[]
      }
      generate_capture_point_code: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
