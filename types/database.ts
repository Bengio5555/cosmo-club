export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      catalog_items: {
        Row: {
          id: string
          title: string
          description: string | null
          section: string | null
          unit: string | null
          unit_price_ht: number
          sort_order: number
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["catalog_items"]["Row"]> & { title: string }
        Update: Partial<Database["public"]["Tables"]["catalog_items"]["Row"]>
        Relationships: []
      }
      clients: {
        Row: {
          billing_address: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          tva_intracom: string | null
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>
        Relationships: []
      }
      events: {
        Row: {
          briefing: string | null
          client_id: string | null
          created_at: string
          date: string
          duration_hours: number | null
          end_time: string | null
          guests_count: number | null
          id: string
          location: string | null
          quote_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & { title: string; date: string }
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>
        Relationships: []
      }
      invoices: {
        Row: {
          archived_pdf_url: string | null
          client_id: string | null
          created_at: string
          credit_note_reason: string | null
          due_date: string | null
          event_date: string | null
          id: string
          is_credit_note: boolean
          issue_date: string
          legal_snapshot: Json | null
          number: string
          paid_at: string | null
          pdf_url: string | null
          quote_id: string | null
          sent_at: string | null
          source_invoice_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subject: string | null
          terms: string | null
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & { number: string }
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>
        Relationships: []
      }
      invoice_payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          paid_on: string
          method: string | null
          reference: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["invoice_payments"]["Row"]> & {
          invoice_id: string
          amount: number
        }
        Update: Partial<Database["public"]["Tables"]["invoice_payments"]["Row"]>
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          line_total_ht: number | null
          position: number
          qty: number
          title: string
          unit: string | null
          unit_price_ht: number
        }
        Insert: Partial<Database["public"]["Tables"]["invoice_items"]["Row"]> & { invoice_id: string; title: string }
        Update: Partial<Database["public"]["Tables"]["invoice_items"]["Row"]>
        Relationships: []
      }
      leads: {
        Row: {
          budget_estimate: number | null
          client_id: string | null
          company: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          event_date: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          guests_count: number | null
          id: string
          internal_notes: string | null
          message: string | null
          raw_payload: Json | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>
        Relationships: []
      }
      products: {
        Row: {
          archived: boolean
          category: Database["public"]["Enums"]["product_category"]
          cost_ht: number | null
          created_at: string
          id: string
          min_threshold: number
          name: string
          notes: string | null
          stock_qty: number
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & { name: string; category: Database["public"]["Enums"]["product_category"] }
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          line_total_ht: number | null
          position: number
          qty: number
          quote_id: string
          section: string | null
          title: string
          unit: string | null
          unit_price_ht: number
        }
        Insert: Partial<Database["public"]["Tables"]["quote_items"]["Row"]> & { quote_id: string; title: string }
        Update: Partial<Database["public"]["Tables"]["quote_items"]["Row"]>
        Relationships: []
      }
      quotes: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          event_date: string | null
          event_location: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          guests_count: number | null
          id: string
          intro: string | null
          issue_date: string
          lead_id: string | null
          number: string
          pdf_url: string | null
          refused_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subject: string | null
          terms: string | null
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          updated_at: string
          valid_until: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["quotes"]["Row"]> & { number: string }
        Update: Partial<Database["public"]["Tables"]["quotes"]["Row"]>
        Relationships: []
      }
      settings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bic: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          credit_note_number_prefix: string
          default_tva_rate: number
          email: string | null
          iban: string | null
          id: number
          invoice_due_days: number
          invoice_number_prefix: string
          legal_form: string | null
          penalty_rate_text: string | null
          phone: string | null
          postal_code: string | null
          quote_number_prefix: string
          quote_validity_days: number
          siret: string | null
          tva_franchise: boolean
          tva_intracom: string | null
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>
        Relationships: []
      }
      staff: {
        Row: {
          archived: boolean
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["staff"]["Row"]> & { full_name: string }
        Update: Partial<Database["public"]["Tables"]["staff"]["Row"]>
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["stock_direction"]
          event_id: string | null
          id: string
          product_id: string
          qty: number
          reason: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["stock_movements"]["Row"]> & {
          product_id: string
          qty: number
          direction: Database["public"]["Enums"]["stock_direction"]
        }
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Row"]>
        Relationships: []
      }
      event_staff: {
        Row: {
          event_id: string
          hours_done: number | null
          hours_planned: number
          notes: string | null
          rate_override: number | null
          staff_id: string
        }
        Insert: Partial<Database["public"]["Tables"]["event_staff"]["Row"]> & { event_id: string; staff_id: string }
        Update: Partial<Database["public"]["Tables"]["event_staff"]["Row"]>
        Relationships: []
      }
      event_stock: {
        Row: {
          event_id: string
          product_id: string
          qty_reserved: number
        }
        Insert: Partial<Database["public"]["Tables"]["event_stock"]["Row"]> & { event_id: string; product_id: string }
        Update: Partial<Database["public"]["Tables"]["event_stock"]["Row"]>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      next_invoice_number: { Args: Record<string, never>; Returns: string }
      next_quote_number: { Args: Record<string, never>; Returns: string }
      next_credit_note_number: { Args: Record<string, never>; Returns: string }
    }
    Enums: {
      event_status: "a_venir" | "en_cours" | "termine" | "annule"
      event_type: "mariage" | "corporate" | "prive" | "defile" | "lancement" | "autre"
      invoice_status: "brouillon" | "envoye" | "paye" | "en_retard" | "annule"
      lead_status: "nouveau" | "contacte" | "devis_envoye" | "gagne" | "perdu"
      product_category: "spiritueux" | "sirops" | "garnitures" | "verrerie" | "consommables" | "tech"
      quote_status: "brouillon" | "envoye" | "accepte" | "refuse" | "expire"
      staff_role: "barman" | "barista" | "runner" | "chef_de_salle" | "autre"
      stock_direction: "in" | "out"
      user_role: "owner" | "staff"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
