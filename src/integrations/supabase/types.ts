export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      friend_activity_cache: {
        Row: {
          activity_data: Json
          activity_date: string
          created_at: string | null
          friend_id: string
          id: string
          restaurant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_data: Json
          activity_date: string
          created_at?: string | null
          friend_id: string
          id?: string
          restaurant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json
          activity_date?: string
          created_at?: string | null
          friend_id?: string
          id?: string
          restaurant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friend_profile_cache: {
        Row: {
          created_at: string | null
          id: string
          last_updated: string | null
          profile_data: Json
          restaurant_count: number
          user_id: string
          wishlist_count: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          profile_data: Json
          restaurant_count?: number
          user_id: string
          wishlist_count?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          profile_data?: Json
          restaurant_count?: number
          user_id?: string
          wishlist_count?: number
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          allow_friend_requests: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          is_public: boolean | null
          name: string | null
          phone_number: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          allow_friend_requests?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_public?: boolean | null
          name?: string | null
          phone_number?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          allow_friend_requests?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_public?: boolean | null
          name?: string | null
          phone_number?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          confirmation_notes: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          party_size: number
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          restaurant_name: string
          special_requests: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confirmation_notes?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          party_size: number
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          restaurant_name: string
          special_requests?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confirmation_notes?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          restaurant_id?: string
          restaurant_name?: string
          special_requests?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string
          category_ratings: Json | null
          city: string
          country: string | null
          created_at: string | null
          cuisine: string
          date_visited: string | null
          id: string
          is_wishlist: boolean | null
          latitude: number | null
          longitude: number | null
          michelin_stars: number | null
          name: string
          notes: string | null
          opening_hours: string | null
          phone_number: string | null
          photos: string[] | null
          price_range: number | null
          rating: number | null
          reservable: boolean | null
          reservation_url: string | null
          updated_at: string | null
          use_weighted_rating: boolean | null
          user_id: string
          website: string | null
        }
        Insert: {
          address: string
          category_ratings?: Json | null
          city: string
          country?: string | null
          created_at?: string | null
          cuisine: string
          date_visited?: string | null
          id?: string
          is_wishlist?: boolean | null
          latitude?: number | null
          longitude?: number | null
          michelin_stars?: number | null
          name: string
          notes?: string | null
          opening_hours?: string | null
          phone_number?: string | null
          photos?: string[] | null
          price_range?: number | null
          rating?: number | null
          reservable?: boolean | null
          reservation_url?: string | null
          updated_at?: string | null
          use_weighted_rating?: boolean | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string
          category_ratings?: Json | null
          city?: string
          country?: string | null
          created_at?: string | null
          cuisine?: string
          date_visited?: string | null
          id?: string
          is_wishlist?: boolean | null
          latitude?: number | null
          longitude?: number | null
          michelin_stars?: number | null
          name?: string
          notes?: string | null
          opening_hours?: string | null
          phone_number?: string | null
          photos?: string[] | null
          price_range?: number | null
          rating?: number | null
          reservable?: boolean | null
          reservation_url?: string | null
          updated_at?: string | null
          use_weighted_rating?: boolean | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      build_friend_profile_cache: {
        Args: { target_user_id: string }
        Returns: Json
      }
      check_email_exists: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      get_cached_friend_activity: {
        Args: {
          requesting_user_id?: string
          page_size?: number
          page_offset?: number
        }
        Returns: {
          activity_data: Json
          activity_date: string
        }[]
      }
      get_cached_friend_profile: {
        Args: { target_user_id: string; requesting_user_id?: string }
        Returns: Json
      }
      get_friend_profile_data: {
        Args: {
          target_user_id: string
          requesting_user_id?: string
          restaurant_limit?: number
        }
        Returns: {
          can_view: boolean
          username: string
          name: string
          avatar_url: string
          is_public: boolean
          rated_count: number
          wishlist_count: number
          avg_rating: number
          top_cuisine: string
          michelin_count: number
          recent_restaurants: Json
        }[]
      }
      get_friends_recent_activity: {
        Args: { requesting_user_id?: string; activity_limit?: number }
        Returns: {
          restaurant_id: string
          restaurant_name: string
          cuisine: string
          rating: number
          date_visited: string
          created_at: string
          friend_id: string
          friend_username: string
        }[]
      }
      get_lightning_fast_friend_profile: {
        Args: { target_user_id: string; requesting_user_id?: string }
        Returns: {
          can_view: boolean
          username: string
          name: string
          avatar_url: string
          is_public: boolean
          rated_count: number
          wishlist_count: number
          avg_rating: number
          recent_restaurants: Json
        }[]
      }
      get_user_score: {
        Args: { user_id: string }
        Returns: number
      }
      get_user_stats: {
        Args: { target_user_id: string }
        Returns: {
          rated_count: number
          wishlist_count: number
          avg_rating: number
          top_cuisine: string
        }[]
      }
      rebuild_friend_activity_cache: {
        Args: { target_user_id: string }
        Returns: undefined
      }
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
  public: {
    Enums: {},
  },
} as const
