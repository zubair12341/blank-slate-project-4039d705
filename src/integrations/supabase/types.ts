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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          source_device: string
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          source_device?: string
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          source_device?: string
        }
        Relationships: []
      }
      customer_receipts: {
        Row: {
          amount: number
          customer_id: string
          id: string
          notes: string | null
          payment_method: string
          received_at: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          customer_id: string
          id?: string
          notes?: string | null
          payment_method?: string
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          customer_id?: string
          id?: string
          notes?: string | null
          payment_method?: string
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      goods_receipt_items: {
        Row: {
          goods_receipt_id: string
          id: string
          ingredient_id: string
          purchase_order_item_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          goods_receipt_id: string
          id?: string
          ingredient_id: string
          purchase_order_item_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          goods_receipt_id?: string
          id?: string
          ingredient_id?: string
          purchase_order_item_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          grn_number: string
          id: string
          notes: string | null
          purchase_order_id: string
          received_at: string
          received_by: string
          supplier_name: string
        }
        Insert: {
          grn_number: string
          id?: string
          notes?: string | null
          purchase_order_id: string
          received_at?: string
          received_by: string
          supplier_name: string
        }
        Update: {
          grn_number?: string
          id?: string
          notes?: string | null
          purchase_order_id?: string
          received_at?: string
          received_by?: string
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
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
      inventory_movements: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          ingredient_id: string
          location: string
          movement_type: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ingredient_id: string
          location: string
          movement_type: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ingredient_id?: string
          location?: string
          movement_type?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      item_less_events: {
        Row: {
          amount_affected: number
          created_at: string
          id: string
          inventory_disposition: string
          order_id: string
          order_item_id: string
          original_waiter_id: string | null
          performed_by: string
          quantity_less: number
          reason_code: string
          reason_details: string | null
          slip_printed_at: string | null
          slip_status: string
          unit_price: number
        }
        Insert: {
          amount_affected?: number
          created_at?: string
          id?: string
          inventory_disposition?: string
          order_id: string
          order_item_id: string
          original_waiter_id?: string | null
          performed_by: string
          quantity_less: number
          reason_code: string
          reason_details?: string | null
          slip_printed_at?: string | null
          slip_status?: string
          unit_price?: number
        }
        Update: {
          amount_affected?: number
          created_at?: string
          id?: string
          inventory_disposition?: string
          order_id?: string
          order_item_id?: string
          original_waiter_id?: string | null
          performed_by?: string
          quantity_less?: number
          reason_code?: string
          reason_details?: string | null
          slip_printed_at?: string | null
          slip_status?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_less_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_less_events_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_less_events_original_waiter_id_fkey"
            columns: ["original_waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      kot_tickets: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          is_additional: boolean
          kot_number: number
          last_reprinted_at: string | null
          order_id: string
          print_requested_by: string | null
          printed_at: string | null
          reprint_count: number
          status: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          is_additional?: boolean
          kot_number?: number
          last_reprinted_at?: string | null
          order_id: string
          print_requested_by?: string | null
          printed_at?: string | null
          reprint_count?: number
          status?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          is_additional?: boolean
          kot_number?: number
          last_reprinted_at?: string | null
          order_id?: string
          print_requested_by?: string | null
          printed_at?: string | null
          reprint_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kot_tickets_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "order_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kot_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      order_activity_log: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          order_id: string
          source_device: string
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          order_id: string
          source_device?: string
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          order_id?: string
          source_device?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_batches: {
        Row: {
          batch_number: number
          batch_type: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          order_id: string
          source_device: string
        }
        Insert: {
          batch_number: number
          batch_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          order_id: string
          source_device?: string
        }
        Update: {
          batch_number?: number
          batch_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          order_id?: string
          source_device?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_batches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          batch_id: string | null
          created_at: string
          final_quantity: number
          id: string
          item_status: string
          less_quantity: number
          menu_item_id: string
          menu_item_name: string
          notes: string | null
          order_id: string
          original_quantity: number
          quantity: number
          total: number
          unit_cost_at_sale: number | null
          unit_price: number
          updated_at: string
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          final_quantity?: number
          id?: string
          item_status?: string
          less_quantity?: number
          menu_item_id: string
          menu_item_name: string
          notes?: string | null
          order_id: string
          original_quantity?: number
          quantity?: number
          total?: number
          unit_cost_at_sale?: number | null
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          final_quantity?: number
          id?: string
          item_status?: string
          less_quantity?: number
          menu_item_id?: string
          menu_item_name?: string
          notes?: string | null
          order_id?: string
          original_quantity?: number
          quantity?: number
          total?: number
          unit_cost_at_sale?: number | null
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "order_batches"
            referencedColumns: ["id"]
          },
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
      order_payments: {
        Row: {
          amount: number
          collected_by: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          order_id: string
          payment_method: string
          reference: string | null
          status: string
        }
        Insert: {
          amount: number
          collected_by?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          order_id: string
          payment_method: string
          reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          collected_by?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          order_id?: string
          payment_method?: string
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          cost_at_sale: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: string | null
          discount: number
          discount_reason: string | null
          discount_type: string
          discount_value: number
          dispatched_at: string | null
          fulfillment_type: string | null
          gross_profit_at_sale: number
          id: string
          opened_at: string | null
          operational_status: string
          order_channel: string
          order_number: string
          order_type: string
          payment_method: string
          payment_status: string
          ready_at: string | null
          refund_reason: string | null
          refunded_at: string | null
          rider_id: string | null
          rider_name: string | null
          served_at: string | null
          source_device: string
          status: string
          subtotal: number
          table_id: string | null
          table_number: number | null
          tax: number
          total: number
          updated_at: string
          version: number
          waiter_id: string | null
          waiter_name: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          cost_at_sale?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          discount?: number
          discount_reason?: string | null
          discount_type?: string
          discount_value?: number
          dispatched_at?: string | null
          fulfillment_type?: string | null
          gross_profit_at_sale?: number
          id?: string
          opened_at?: string | null
          operational_status?: string
          order_channel?: string
          order_number: string
          order_type: string
          payment_method?: string
          payment_status?: string
          ready_at?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          rider_id?: string | null
          rider_name?: string | null
          served_at?: string | null
          source_device?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: number | null
          tax?: number
          total?: number
          updated_at?: string
          version?: number
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          cost_at_sale?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          discount?: number
          discount_reason?: string | null
          discount_type?: string
          discount_value?: number
          dispatched_at?: string | null
          fulfillment_type?: string | null
          gross_profit_at_sale?: number
          id?: string
          opened_at?: string | null
          operational_status?: string
          order_channel?: string
          order_number?: string
          order_type?: string
          payment_method?: string
          payment_status?: string
          ready_at?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          rider_id?: string | null
          rider_name?: string | null
          served_at?: string | null
          source_device?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: number | null
          tax?: number
          total?: number
          updated_at?: string
          version?: number
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
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
      purchase_order_items: {
        Row: {
          id: string
          ingredient_id: string
          ordered_quantity: number
          purchase_order_id: string
          received_quantity: number
          unit_cost: number
        }
        Insert: {
          id?: string
          ingredient_id: string
          ordered_quantity: number
          purchase_order_id: string
          received_quantity?: number
          unit_cost: number
        }
        Update: {
          id?: string
          ingredient_id?: string
          ordered_quantity?: number
          purchase_order_id?: string
          received_quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          ordered_at: string | null
          po_number: string
          status: string
          supplier_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          ordered_at?: string | null
          po_number: string
          status?: string
          supplier_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          ordered_at?: string | null
          po_number?: string
          status?: string
          supplier_name?: string
          updated_at?: string
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
          security_discount_password: string | null
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
          security_discount_password?: string | null
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
          security_discount_password?: string | null
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
      riders: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role_name: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role_name?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string
          created_at: string
          id: string
          ingredient_id: string
          location: string
          notes: string | null
          physical_quantity: number
          reason: string
          system_quantity: number
          variance: number
        }
        Insert: {
          adjusted_by: string
          created_at?: string
          id?: string
          ingredient_id: string
          location: string
          notes?: string | null
          physical_quantity: number
          reason: string
          system_quantity: number
          variance: number
        }
        Update: {
          adjusted_by?: string
          created_at?: string
          id?: string
          ingredient_id?: string
          location?: string
          notes?: string | null
          physical_quantity?: number
          reason?: string
          system_quantity?: number
          variance?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
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
      user_permissions: {
        Row: {
          created_at: string
          id: string
          is_allowed: boolean
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_allowed: boolean
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          permission_key?: string
          updated_at?: string
          user_id?: string
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
      waiter_table_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          table_id: string
          waiter_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          table_id: string
          waiter_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          table_id?: string
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_table_assignments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_table_assignments_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      waiters: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_order_items_batch: {
        Args: {
          p_idempotency_key?: string
          p_items: Json
          p_order_id: string
          p_source_device?: string
        }
        Returns: Json
      }
      adjust_stock_variance: {
        Args: {
          p_ingredient_id: string
          p_location: string
          p_notes?: string
          p_physical_quantity: number
          p_reason: string
        }
        Returns: Json
      }
      assign_order_rider: {
        Args: { p_order_id: string; p_rider_id: string }
        Returns: Json
      }
      authorize_discount: {
        Args: {
          p_discount_type: string
          p_discount_value: number
          p_password: string
          p_reason: string
          p_subtotal: number
        }
        Returns: Json
      }
      cancel_order_controlled: {
        Args: { p_order_id: string; p_reason: string; p_source_device?: string }
        Returns: Json
      }
      create_item_less:
        | {
            Args: {
              p_inventory_disposition?: string
              p_order_item_id: string
              p_quantity_less: number
              p_reason_code: string
              p_reason_details?: string
              p_source_device?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_authorization_password?: string
              p_inventory_disposition?: string
              p_order_item_id: string
              p_quantity_less: number
              p_reason_code: string
              p_reason_details?: string
              p_source_device?: string
            }
            Returns: Json
          }
      create_order_atomic: {
        Args: {
          p_customer_name?: string
          p_discount_reason?: string
          p_discount_type?: string
          p_discount_value?: number
          p_fulfillment_type: string
          p_idempotency_key?: string
          p_items: Json
          p_order_channel?: string
          p_order_number: string
          p_payment_method?: string
          p_source_device?: string
          p_table_id?: string
          p_waiter_id?: string
        }
        Returns: Json
      }
      create_purchase_order: {
        Args: { p_items: Json; p_notes?: string; p_supplier_name: string }
        Returns: string
      }
      get_my_permissions: {
        Args: never
        Returns: {
          permission_key: string
        }[]
      }
      get_my_waiter_context: { Args: never; Returns: Json }
      get_order_payment_summary: { Args: { p_order_id: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_waiter_assigned_to_table: {
        Args: { _table_id: string; _user_id: string }
        Returns: boolean
      }
      mark_kot_printed: {
        Args: {
          p_is_reprint?: boolean
          p_kot_id: string
          p_source_device?: string
        }
        Returns: Json
      }
      park_order_unpaid: {
        Args: {
          p_customer_name: string
          p_order_id: string
          p_source_device?: string
        }
        Returns: Json
      }
      reassign_dine_in_order: {
        Args: {
          p_order_id: string
          p_source_device?: string
          p_table_id: string
          p_waiter_id: string
        }
        Returns: Json
      }
      recalculate_order_totals: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      receive_purchase_order: {
        Args: { p_items: Json; p_notes?: string; p_purchase_order_id: string }
        Returns: string
      }
      record_order_payment: {
        Args: {
          p_amount: number
          p_idempotency_key?: string
          p_order_id: string
          p_payment_method: string
          p_reference?: string
          p_source_device?: string
        }
        Returns: Json
      }
      refund_order_controlled: {
        Args: { p_order_id: string; p_reason: string; p_source_device?: string }
        Returns: Json
      }
      save_delivery_details: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_delivery_address: string
          p_order_id: string
        }
        Returns: Json
      }
      save_order_customer: {
        Args: { p_customer_name: string; p_order_id: string }
        Returns: Json
      }
      set_waiter_table_assignments: {
        Args: { p_table_ids: string[]; p_waiter_id: string }
        Returns: undefined
      }
      settle_order_atomic: {
        Args: {
          p_idempotency_key?: string
          p_order_id: string
          p_payment_method: string
          p_source_device?: string
        }
        Returns: Json
      }
      snapshot_order_profit: { Args: { p_order_id: string }; Returns: Json }
      transition_order_status: {
        Args: {
          p_expected_version?: number
          p_new_status: string
          p_order_id: string
          p_source_device?: string
        }
        Returns: Json
      }
      write_audit_log: {
        Args: {
          p_after_data?: Json
          p_before_data?: Json
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
          p_event_type: string
          p_source_device?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "pos_user" | "waiter"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "manager", "pos_user", "waiter"],
    },
  },
} as const
