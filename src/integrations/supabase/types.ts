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
      balances: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string | null
          symbol_image: string | null
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          name?: string | null
          symbol_image?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string | null
          symbol_image?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      ball_da: {
        Row: {
          code: string
          Cr1V: boolean
          Cr2H: boolean
          Cr3L: boolean
          Cr4F: boolean
          Cr5W: boolean
          Cr6DB: boolean
          Cr7R: boolean
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          Cr1V?: boolean
          Cr2H?: boolean
          Cr3L?: boolean
          Cr4F?: boolean
          Cr5W?: boolean
          Cr6DB?: boolean
          Cr7R?: boolean
          created_at?: string
          description: string
          id?: string
          name: string
          updated_at?: string
          value: number
        }
        Update: {
          code?: string
          Cr1V?: boolean
          Cr2H?: boolean
          Cr3L?: boolean
          Cr4F?: boolean
          Cr5W?: boolean
          Cr6DB?: boolean
          Cr7R?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      ball_technical_elements: {
        Row: {
          code: string
          created_at: string
          da: boolean
          data_information_about_te: string | null
          description: string
          id: string
          name: string
          parent_group: string
          parent_group_code: string
          special_code: boolean
          symbol_image: string | null
          technical_element: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          da?: boolean
          data_information_about_te?: string | null
          description: string
          id?: string
          name: string
          parent_group: string
          parent_group_code: string
          special_code?: boolean
          symbol_image?: string | null
          technical_element?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          da?: boolean
          data_information_about_te?: string | null
          description?: string
          id?: string
          name?: string
          parent_group?: string
          parent_group_code?: string
          special_code?: boolean
          symbol_image?: string | null
          technical_element?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      clubs_da: {
        Row: {
          code: string
          Cr1V: boolean
          Cr2H: boolean
          Cr3L: boolean
          Cr4F: boolean
          Cr5W: boolean
          Cr6DB: boolean
          Cr7R: boolean
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          Cr1V?: boolean
          Cr2H?: boolean
          Cr3L?: boolean
          Cr4F?: boolean
          Cr5W?: boolean
          Cr6DB?: boolean
          Cr7R?: boolean
          created_at?: string
          description: string
          id?: string
          name: string
          updated_at?: string
          value: number
        }
        Update: {
          code?: string
          Cr1V?: boolean
          Cr2H?: boolean
          Cr3L?: boolean
          Cr4F?: boolean
          Cr5W?: boolean
          Cr6DB?: boolean
          Cr7R?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      clubs_technical_elements: {
        Row: {
          code: string
          created_at: string
          da: boolean
          data_information_about_te: string | null
          description: string
          id: string
          name: string
          parent_group: string
          parent_group_code: string
          special_code: boolean
          symbol_image: string | null
          technical_element: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          da?: boolean
          data_information_about_te?: string | null
          description: string
          id?: string
          name: string
          parent_group: string
          parent_group_code: string
          special_code?: boolean
          symbol_image?: string | null
          technical_element?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          da?: boolean
          data_information_about_te?: string | null
          description?: string
          id?: string
          name?: string
          parent_group?: string
          parent_group_code?: string
          special_code?: boolean
          symbol_image?: string | null
          technical_element?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      criteria: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string
          symbol_image: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          name: string
          symbol_image?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          symbol_image?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      da_comments: {
        Row: {
          apparatus: string
          code: string
          comment: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          apparatus: string
          code: string
          comment: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          apparatus?: string
          code?: string
          comment?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dynamic_catches: {
        Row: {
          apparatus: string
          code: string
          created_at: string
          extra_criteria: string | null
          id: string
          name: string
          notes: string | null
          symbol_image: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          apparatus: string
          code: string
          created_at?: string
          extra_criteria?: string | null
          id?: string
          name: string
          notes?: string | null
          symbol_image?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          apparatus?: string
          code?: string
          created_at?: string
          extra_criteria?: string | null
          id?: string
          name?: string
          notes?: string | null
          symbol_image?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      dynamic_general_criteria: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          symbol_image: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          symbol_image?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          symbol_image?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      dynamic_throws: {
        Row: {
          apparatus: string
          code: string
          created_at: string
          id: string
          name: string
          symbol_image: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          apparatus: string
          code: string
          created_at?: string
          id?: string
          name: string
          symbol_image?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          apparatus?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          symbol_image?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      hoop_da: {
        Row: {
          code: string
          Cr1V: boolean
          Cr2H: boolean
          Cr3L: boolean
          Cr4F: boolean
          Cr5W: boolean
          Cr6DB: boolean
          Cr7R: boolean
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          Cr1V?: boolean
          Cr2H?: boolean
          Cr3L?: boolean
          Cr4F?: boolean
          Cr5W?: boolean
          Cr6DB?: boolean
          Cr7R?: boolean
          created_at?: string
          description: string
          id?: string
          name: string
          updated_at?: string
          value: number
        }
        Update: {
          code?: string
          Cr1V?: boolean
          Cr2H?: boolean
          Cr3L?: boolean
          Cr4F?: boolean
          Cr5W?: boolean
          Cr6DB?: boolean
          Cr7R?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      hoop_technical_elements: {
        Row: {
          code: string
          created_at: string
          da: boolean
          data_information_about_te: string | null
          description: string
          id: string
          name: string
          parent_group: string
          parent_group_code: string
          special_code: boolean
          symbol_image: string | null
          technical_element: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          da?: boolean
          data_information_about_te?: string | null
          description: string
          id?: string
          name: string
          parent_group: string
          parent_group_code: string
          special_code?: boolean
          symbol_image?: string | null
          technical_element?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          da?: boolean
          data_information_about_te?: string | null
          description?: string
          id?: string
          name?: string
          parent_group?: string
          parent_group_code?: string
          special_code?: boolean
          symbol_image?: string | null
          technical_element?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      jumps: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string | null
          symbol_image: string | null
          turn_degrees: string | null
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          name?: string | null
          symbol_image?: string | null
          turn_degrees?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string | null
          symbol_image?: string | null
          turn_degrees?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      prerecorded_risk_components: {
        Row: {
          created_at: string
          description: string | null
          id: string
          risk_code: string
          risk_component_code: string
          symbol_image: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          risk_code: string
          risk_component_code: string
          symbol_image?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          risk_code?: string
          risk_component_code?: string
          symbol_image?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      prerecorded_risks: {
        Row: {
          created_at: string
          id: string
          name: string
          risk_code: string
          symbol_image: string | null
          total_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          risk_code: string
          symbol_image?: string | null
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          risk_code?: string
          symbol_image?: string | null
          total_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      r_throws_specific: {
        Row: {
          apparatus: string
          code: string
          created_at: string
          id: string
          name: string
          symbol_image: string | null
          updated_at: string
        }
        Insert: {
          apparatus: string
          code: string
          created_at?: string
          id?: string
          name: string
          symbol_image?: string | null
          updated_at?: string
        }
        Update: {
          apparatus?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          symbol_image?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ribbon_da: {
        Row: {
          code: string
          Cr1V: boolean
          Cr2H: boolean
          Cr3L: boolean
          Cr4F: boolean
          Cr5W: boolean
          Cr6DB: boolean
          Cr7R: boolean
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          Cr1V?: boolean
          Cr2H?: boolean
          Cr3L?: boolean
          Cr4F?: boolean
          Cr5W?: boolean
          Cr6DB?: boolean
          Cr7R?: boolean
          created_at?: string
          description: string
          id?: string
          name: string
          updated_at?: string
          value: number
        }
        Update: {
          code?: string
          Cr1V?: boolean
          Cr2H?: boolean
          Cr3L?: boolean
          Cr4F?: boolean
          Cr5W?: boolean
          Cr6DB?: boolean
          Cr7R?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      ribbon_technical_elements: {
        Row: {
          code: string
          created_at: string
          da: boolean
          data_information_about_te: string | null
          description: string
          id: string
          name: string
          parent_group: string
          parent_group_code: string
          special_code: boolean
          symbol_image: string | null
          technical_element: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          da?: boolean
          data_information_about_te?: string | null
          description: string
          id?: string
          name: string
          parent_group: string
          parent_group_code: string
          special_code?: boolean
          symbol_image?: string | null
          technical_element?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          da?: boolean
          data_information_about_te?: string | null
          description?: string
          id?: string
          name?: string
          parent_group?: string
          parent_group_code?: string
          special_code?: boolean
          symbol_image?: string | null
          technical_element?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rotations: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string | null
          symbol_image: string | null
          turn_degrees: string | null
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          name?: string | null
          symbol_image?: string | null
          turn_degrees?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string | null
          symbol_image?: string | null
          turn_degrees?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      rulebooks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gymnast" | "coach" | "judge" | "parent" | "fan" | "admin"
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
      app_role: ["gymnast", "coach", "judge", "parent", "fan", "admin"],
    },
  },
} as const
