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
      chat_room_participants: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          is_group: boolean
          last_message_at: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      itineraries: {
        Row: {
          created_at: string
          end_date: string
          events: Json
          id: string
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          events?: Json
          id?: string
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          events?: Json
          id?: string
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          message_type: string
          reply_to_id: string | null
          room_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          reply_to_id?: string | null
          room_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          reply_to_id?: string | null
          room_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      place_ratings: {
        Row: {
          address: string | null
          category_ratings: Json | null
          created_at: string
          cuisine: string | null
          date_visited: string | null
          id: string
          latitude: number | null
          longitude: number | null
          michelin_stars: number | null
          notes: string | null
          overall_rating: number | null
          phone_number: string | null
          photo_captions: string[] | null
          photos: string[] | null
          place_id: string | null
          place_name: string
          place_type: string
          price_range: number | null
          trip_id: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category_ratings?: Json | null
          created_at?: string
          cuisine?: string | null
          date_visited?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          michelin_stars?: number | null
          notes?: string | null
          overall_rating?: number | null
          phone_number?: string | null
          photo_captions?: string[] | null
          photos?: string[] | null
          place_id?: string | null
          place_name: string
          place_type: string
          price_range?: number | null
          trip_id: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category_ratings?: Json | null
          created_at?: string
          cuisine?: string | null
          date_visited?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          michelin_stars?: number | null
          notes?: string | null
          overall_rating?: number | null
          phone_number?: string | null
          photo_captions?: string[] | null
          photos?: string[] | null
          place_id?: string | null
          place_name?: string
          place_type?: string
          price_range?: number | null
          trip_id?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_place_ratings_trip_id"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
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
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
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
      restaurant_shares: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read_at: string | null
          receiver_id: string
          restaurant_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read_at?: string | null
          receiver_id: string
          restaurant_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read_at?: string | null
          receiver_id?: string
          restaurant_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_shares_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
          google_place_id: string | null
          id: string
          is_wishlist: boolean | null
          latitude: number | null
          longitude: number | null
          michelin_stars: number | null
          name: string
          notes: string | null
          opening_hours: string | null
          phone_number: string | null
          photo_captions: string[] | null
          photo_dish_names: string[] | null
          photo_notes: string[] | null
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
          google_place_id?: string | null
          id?: string
          is_wishlist?: boolean | null
          latitude?: number | null
          longitude?: number | null
          michelin_stars?: number | null
          name: string
          notes?: string | null
          opening_hours?: string | null
          phone_number?: string | null
          photo_captions?: string[] | null
          photo_dish_names?: string[] | null
          photo_notes?: string[] | null
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
          google_place_id?: string | null
          id?: string
          is_wishlist?: boolean | null
          latitude?: number | null
          longitude?: number | null
          michelin_stars?: number | null
          name?: string
          notes?: string | null
          opening_hours?: string | null
          phone_number?: string | null
          photo_captions?: string[] | null
          photo_dish_names?: string[] | null
          photo_notes?: string[] | null
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
      review_helpfulness: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpfulness_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "user_reviews"
            referencedColumns: ["id"]
          },
        ]
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
      trips: {
        Row: {
          created_at: string
          description: string | null
          destination: string
          end_date: string | null
          id: string
          is_public: boolean | null
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          destination: string
          end_date?: string | null
          id?: string
          is_public?: boolean | null
          start_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          destination?: string
          end_date?: string | null
          id?: string
          is_public?: boolean | null
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          category_ratings: Json | null
          created_at: string | null
          helpful_count: number | null
          id: string
          overall_rating: number | null
          photo_captions: string[] | null
          photo_dish_names: string[] | null
          photos: string[] | null
          restaurant_address: string
          restaurant_name: string
          restaurant_place_id: string | null
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_ratings?: Json | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          overall_rating?: number | null
          photo_captions?: string[] | null
          photo_dish_names?: string[] | null
          photos?: string[] | null
          restaurant_address: string
          restaurant_name: string
          restaurant_place_id?: string | null
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_ratings?: Json | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          overall_rating?: number | null
          photo_captions?: string[] | null
          photo_dish_names?: string[] | null
          photos?: string[] | null
          restaurant_address?: string
          restaurant_name?: string
          restaurant_place_id?: string | null
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
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
      check_rate_limit: {
        Args: {
          target_user_id: string
          endpoint_name: string
          max_requests?: number
          window_minutes?: number
        }
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
      get_friend_profile_with_all_data: {
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
          top_cuisine: string
          michelin_count: number
          all_restaurants: Json
          all_wishlist: Json
          rating_distribution: Json
          cuisine_distribution: Json
          cities_distribution: Json
        }[]
      }
      get_friend_profile_with_pagination: {
        Args: {
          target_user_id: string
          requesting_user_id?: string
          restaurant_limit?: number
          restaurant_offset?: number
          wishlist_limit?: number
          wishlist_offset?: number
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
          restaurants: Json
          wishlist: Json
          has_more_restaurants: boolean
          has_more_wishlist: boolean
        }[]
      }
      get_friend_wishlist_data: {
        Args: {
          target_user_id: string
          requesting_user_id?: string
          wishlist_limit?: number
        }
        Returns: {
          can_view: boolean
          wishlist_items: Json
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
      get_friends_with_scores: {
        Args: { requesting_user_id?: string }
        Returns: {
          friend_id: string
          username: string
          name: string
          avatar_url: string
          is_public: boolean
          score: number
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
      get_or_create_dm_room: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_restaurant_community_stats: {
        Args: { place_id_param: string }
        Returns: {
          average_rating: number
          total_reviews: number
          rating_distribution: Json
          recent_photos: Json
        }[]
      }
      get_restaurant_reviews: {
        Args: {
          place_id_param: string
          page_limit?: number
          page_offset?: number
          sort_by?: string
          requesting_user_id?: string
        }
        Returns: {
          review_id: string
          user_id: string
          username: string
          overall_rating: number
          category_ratings: Json
          review_text: string
          photos: string[]
          photo_captions: string[]
          photo_dish_names: string[]
          helpful_count: number
          created_at: string
          user_found_helpful: boolean
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
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      rebuild_friend_activity_cache: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      update_restaurant_google_place_id: {
        Args: {
          restaurant_name_param: string
          restaurant_address_param: string
          google_place_id_param: string
        }
        Returns: number
      }
      user_participates_in_room: {
        Args: { room_id: string; user_id: string }
        Returns: boolean
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
