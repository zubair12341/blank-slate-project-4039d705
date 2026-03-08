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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          category: string
          cost_per_unit: number
          created_at: string
          id: string
          kitchen_stock: number
          low_stock_threshold: number
          name: string
          store_stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          kitchen_stock?: number
          low_stock_threshold?: number
          name: string
          store_stock?: number
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          kitchen_stock?: number
          low_stock_threshold?: number
          name?: string
          store_stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_item_variants: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          menu_item_id: string
          name: string
          price: number
          profit_margin: number
          recipe: Json
          recipe_cost: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          menu_item_id: string
          name: string
          price?: number
          profit_margin?: number
          recipe?: Json
          recipe_cost?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          menu_item_id?: string
          name?: string
          price?: number
          profit_margin?: number
          recipe?: Json
          recipe_cost?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_variants_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_available: boolean
          name: string
          price: number
          profit_margin: number
          recipe: Json
          recipe_cost: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_available?: boolean
          name: string
          price?: number
          profit_margin?: number
          recipe?: Json
          recipe_cost?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_available?: boolean
          name?: string
          price?: number
          profit_margin?: number
          recipe?: Json
          recipe_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          menu_item_name: string
          notes: string | null
          order_id: string
          quantity: number
          total: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          menu_item_name: string
          notes?: string | null
          order_id: string
          quantity?: number
          total?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          menu_item_name?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          total?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "menu_item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          discount: number
          discount_reason: string | null
          discount_type: string
          discount_value: number
          id: string
          order_number: string
          order_type: string
          payment_method: string
          status: string
          subtotal: number
          table_id: string | null
          table_number: number | null
          tax: number
          total: number
          waiter_id: string | null
          waiter_name: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discount?: number
          discount_reason?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          order_number: string
          order_type: string
          payment_method?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: number | null
          tax?: number
          total?: number
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discount?: number
          discount_reason?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          order_number?: string
          order_type?: string
          payment_method?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: number | null
          tax?: number
          total?: number
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_settings: {
        Row: {
          address: string | null
          business_day_cutoff_hour: number
          business_day_cutoff_minute: number
          created_at: string
          currency: string
          currency_symbol: string
          id: string
          invoice_footer: string | null
          invoice_gst_enabled: boolean
          invoice_logo_url: string | null
          invoice_show_logo: boolean
          invoice_title: string | null
          name: string
          phone: string | null
          security_cancel_password: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_day_cutoff_hour?: number
          business_day_cutoff_minute?: number
          created_at?: string
          currency?: string
          currency_symbol?: string
          id?: string
          invoice_footer?: string | null
          invoice_gst_enabled?: boolean
          invoice_logo_url?: string | null
          invoice_show_logo?: boolean
          invoice_title?: string | null
          name?: string
          phone?: string | null
          security_cancel_password?: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_day_cutoff_hour?: number
          business_day_cutoff_minute?: number
          created_at?: string
          currency?: string
          currency_symbol?: string
          id?: string
          invoice_footer?: string | null
          invoice_gst_enabled?: boolean
          invoice_logo_url?: string | null
          invoice_show_logo?: boolean
          invoice_title?: string | null
          name?: string
          phone?: string | null
          security_cancel_password?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          current_order_id: string | null
          floor: string
          id: string
          status: string
          table_number: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          floor?: string
          id?: string
          status?: string
          table_number: number
        }
        Update: {
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          floor?: string
          id?: string
          status?: string
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_purchases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ingredient_id: string
          purchase_date: string
          quantity: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id: string
          purchase_date?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string
          purchase_date?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_purchases_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_removals: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          location: string
          quantity: number
          reason: string
          removed_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          location?: string
          quantity?: number
          reason: string
          removed_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          location?: string
          quantity?: number
          reason?: string
          removed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_removals_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_sales: {
        Row: {
          cost_per_unit: number
          created_at: string
          customer_name: string | null
          id: string
          ingredient_id: string
          notes: string | null
          profit: number
          quantity: number
          sale_date: string
          sale_price: number
          sold_by: string | null
          total_cost: number
          total_sale: number
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          customer_name?: string | null
          id?: string
          ingredient_id: string
          notes?: string | null
          profit?: number
          quantity?: number
          sale_date?: string
          sale_price?: number
          sold_by?: string | null
          total_cost?: number
          total_sale?: number
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          customer_name?: string | null
          id?: string
          ingredient_id?: string
          notes?: string | null
          profit?: number
          quantity?: number
          sale_date?: string
          sale_price?: number
          sold_by?: string | null
          total_cost?: number
          total_sale?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_sales_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_location: string
          id: string
          ingredient_id: string
          quantity: number
          reason: string | null
          to_location: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_location: string
          id?: string
          ingredient_id: string
          quantity?: number
          reason?: string | null
          to_location: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_location?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          reason?: string | null
          to_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
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
      waiters: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "manager" | "pos_user"
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
      app_role: ["admin", "manager", "pos_user"],
    },
  },
} as const
