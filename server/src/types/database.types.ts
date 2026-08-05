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
      actors: {
        Row: {
          actor_type: string
          created_at: string
          deleted_at: string | null
          id: string
          legacy_guest_id: string | null
          legacy_user_id: string | null
          merged_into_actor_id: string | null
          status: string
        }
        Insert: {
          actor_type: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          legacy_guest_id?: string | null
          legacy_user_id?: string | null
          merged_into_actor_id?: string | null
          status?: string
        }
        Update: {
          actor_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          legacy_guest_id?: string | null
          legacy_user_id?: string | null
          merged_into_actor_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "actors_merged_into_actor_id_fkey"
            columns: ["merged_into_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comments: {
        Row: {
          actor_id: string | null
          announcement_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          nickname_snapshot: string | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          announcement_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nickname_snapshot?: string | null
          status?: string
        }
        Update: {
          actor_id?: string | null
          announcement_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nickname_snapshot?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          published_at: string | null
          status: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_game_choices: {
        Row: {
          choice: string
          created_at: string
          game_id: string
          member_id: string
        }
        Insert: {
          choice: string
          created_at?: string
          game_id: string
          member_id: string
        }
        Update: {
          choice?: string
          created_at?: string
          game_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_game_choices_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "balance_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_game_choices_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "chat_session_members"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_games: {
        Row: {
          created_at: string
          id: string
          session_id: string
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          topic: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_games_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          client_message_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          message: string
          sender_member_id: string
          session_id: string
        }
        Insert: {
          client_message_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          message: string
          sender_member_id: string
          session_id: string
        }
        Update: {
          client_message_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          message?: string
          sender_member_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_member_id_fkey"
            columns: ["sender_member_id"]
            isOneToOne: false
            referencedRelation: "chat_session_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_session_members: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          joined_at: string | null
          leave_reason: string | null
          left_at: string | null
          nickname_snapshot: string | null
          session_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          leave_reason?: string | null
          left_at?: string | null
          nickname_snapshot?: string | null
          session_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          leave_reason?: string | null
          left_at?: string | null
          nickname_snapshot?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_session_members_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_session_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          chat_started_at: string | null
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          legacy_room_id: string | null
          matched_at: string | null
          round_id: string | null
          status: string
          word_id: string | null
        }
        Insert: {
          chat_started_at?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          legacy_room_id?: string | null
          matched_at?: string | null
          round_id?: string | null
          status?: string
          word_id?: string | null
        }
        Update: {
          chat_started_at?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          legacy_room_id?: string | null
          matched_at?: string | null
          round_id?: string | null
          status?: string
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "match_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_match_usage: {
        Row: {
          actor_id: string
          free_match_count: number
          id: string
          paid_match_count: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          actor_id: string
          free_match_count?: number
          id?: string
          paid_match_count?: number
          updated_at?: string
          usage_date: string
        }
        Update: {
          actor_id?: string
          free_match_count?: number
          id?: string
          paid_match_count?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_match_usage_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_profiles: {
        Row: {
          actor_id: string
          created_at: string
          expires_at: string | null
          guest_token_hash: string | null
          last_seen_at: string | null
          nickname: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          expires_at?: string | null
          guest_token_hash?: string | null
          last_seen_at?: string | null
          nickname?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          expires_at?: string | null
          guest_token_hash?: string | null
          last_seen_at?: string | null
          nickname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_profiles_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_actor_map: {
        Row: {
          actor_id: string
          kind: string
          legacy_id: string
        }
        Insert: {
          actor_id: string
          kind: string
          legacy_id: string
        }
        Update: {
          actor_id?: string
          kind?: string
          legacy_id?: string
        }
        Relationships: []
      }
      legacy_balance_game_logs: {
        Row: {
          created_at: string | null
          id: string | null
          is_same: boolean | null
          room_id: string | null
          topic: string | null
          user1_choice: string | null
          user1_id: string | null
          user2_choice: string | null
          user2_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_same?: boolean | null
          room_id?: string | null
          topic?: string | null
          user1_choice?: string | null
          user1_id?: string | null
          user2_choice?: string | null
          user2_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_same?: boolean | null
          room_id?: string | null
          topic?: string | null
          user1_choice?: string | null
          user1_id?: string | null
          user2_choice?: string | null
          user2_id?: string | null
        }
        Relationships: []
      }
      legacy_chat_logs: {
        Row: {
          log_id: string | null
          message: string | null
          receiver_guest_id: string | null
          receiver_id: string | null
          receiver_nickname: string | null
          room_id: string | null
          sender_guest_id: string | null
          sender_id: string | null
          sender_nickname: string | null
          timestamp: string | null
          word: string | null
        }
        Insert: {
          log_id?: string | null
          message?: string | null
          receiver_guest_id?: string | null
          receiver_id?: string | null
          receiver_nickname?: string | null
          room_id?: string | null
          sender_guest_id?: string | null
          sender_id?: string | null
          sender_nickname?: string | null
          timestamp?: string | null
          word?: string | null
        }
        Update: {
          log_id?: string | null
          message?: string | null
          receiver_guest_id?: string | null
          receiver_id?: string | null
          receiver_nickname?: string | null
          room_id?: string | null
          sender_guest_id?: string | null
          sender_id?: string | null
          sender_nickname?: string | null
          timestamp?: string | null
          word?: string | null
        }
        Relationships: []
      }
      legacy_comments: {
        Row: {
          content: string | null
          created_at: string | null
          id: number | null
          nickname: string | null
          username: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: number | null
          nickname?: string | null
          username?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: number | null
          nickname?: string | null
          username?: string | null
        }
        Relationships: []
      }
      legacy_emotion_feedback: {
        Row: {
          created_at: string | null
          emotion: string | null
          id: string | null
          partner_guest_id: string | null
          partner_id: string | null
          partner_nickname: string | null
          partner_username: string | null
          user_guest_id: string | null
          user_id: string | null
          user_nickname: string | null
          user_username: string | null
          word: string | null
        }
        Insert: {
          created_at?: string | null
          emotion?: string | null
          id?: string | null
          partner_guest_id?: string | null
          partner_id?: string | null
          partner_nickname?: string | null
          partner_username?: string | null
          user_guest_id?: string | null
          user_id?: string | null
          user_nickname?: string | null
          user_username?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string | null
          emotion?: string | null
          id?: string | null
          partner_guest_id?: string | null
          partner_id?: string | null
          partner_nickname?: string | null
          partner_username?: string | null
          user_guest_id?: string | null
          user_id?: string | null
          user_nickname?: string | null
          user_username?: string | null
          word?: string | null
        }
        Relationships: []
      }
      legacy_megaphone_logs: {
        Row: {
          created_at: string | null
          id: number | null
          message: string | null
          nickname: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number | null
          message?: string | null
          nickname?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number | null
          message?: string | null
          nickname?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      legacy_nickname_histories: {
        Row: {
          changed_at: string | null
          history_id: string | null
          nickname: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          changed_at?: string | null
          history_id?: string | null
          nickname?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          changed_at?: string | null
          history_id?: string | null
          nickname?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      legacy_payment_webhooks: {
        Row: {
          app: string | null
          created_at: string | null
          id: string | null
          matched_payment_id: string | null
          parsed_amount: number | null
          parsed_bank: string | null
          parsed_sender: string | null
          raw_body: Json | null
          text: string | null
          title: string | null
        }
        Insert: {
          app?: string | null
          created_at?: string | null
          id?: string | null
          matched_payment_id?: string | null
          parsed_amount?: number | null
          parsed_bank?: string | null
          parsed_sender?: string | null
          raw_body?: Json | null
          text?: string | null
          title?: string | null
        }
        Update: {
          app?: string | null
          created_at?: string | null
          id?: string | null
          matched_payment_id?: string | null
          parsed_amount?: number | null
          parsed_bank?: string | null
          parsed_sender?: string | null
          raw_body?: Json | null
          text?: string | null
          title?: string | null
        }
        Relationships: []
      }
      legacy_payments: {
        Row: {
          amount: number | null
          count: number | null
          created_at: string | null
          id: number | null
          imp_uid: string | null
          item: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          count?: number | null
          created_at?: string | null
          id?: number | null
          imp_uid?: string | null
          item?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          count?: number | null
          created_at?: string | null
          id?: number | null
          imp_uid?: string | null
          item?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      legacy_reported_reports: {
        Row: {
          created_at: string | null
          extra_message: string | null
          id: string | null
          reasons: string[] | null
          reported_guest_id: string | null
          reported_id: string | null
          reporter_guest_id: string | null
          reporter_id: string | null
          room_id: string | null
        }
        Insert: {
          created_at?: string | null
          extra_message?: string | null
          id?: string | null
          reasons?: string[] | null
          reported_guest_id?: string | null
          reported_id?: string | null
          reporter_guest_id?: string | null
          reporter_id?: string | null
          room_id?: string | null
        }
        Update: {
          created_at?: string | null
          extra_message?: string | null
          id?: string | null
          reasons?: string[] | null
          reported_guest_id?: string | null
          reported_id?: string | null
          reporter_guest_id?: string | null
          reporter_id?: string | null
          room_id?: string | null
        }
        Relationships: []
      }
      legacy_sp_payments: {
        Row: {
          actual_depositor: string | null
          amount: number | null
          confirmed_at: string | null
          created_at: string | null
          expected_depositor: string | null
          id: string | null
          mismatch_flag: boolean | null
          name: string | null
          refund_account: string | null
          refund_bank: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          wordset_text: string | null
        }
        Insert: {
          actual_depositor?: string | null
          amount?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          expected_depositor?: string | null
          id?: string | null
          mismatch_flag?: boolean | null
          name?: string | null
          refund_account?: string | null
          refund_bank?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wordset_text?: string | null
        }
        Update: {
          actual_depositor?: string | null
          amount?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          expected_depositor?: string | null
          id?: string | null
          mismatch_flag?: boolean | null
          name?: string | null
          refund_account?: string | null
          refund_bank?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wordset_text?: string | null
        }
        Relationships: []
      }
      legacy_telepathy_sessions: {
        Row: {
          created_at: string | null
          guest_id: string | null
          id: string | null
          matched_guest_id: string | null
          matched_nickname: string | null
          matched_user_id: string | null
          matched_username: string | null
          nickname: string | null
          room_id: string | null
          status: string | null
          user_id: string | null
          username: string | null
          word: string | null
        }
        Insert: {
          created_at?: string | null
          guest_id?: string | null
          id?: string | null
          matched_guest_id?: string | null
          matched_nickname?: string | null
          matched_user_id?: string | null
          matched_username?: string | null
          nickname?: string | null
          room_id?: string | null
          status?: string | null
          user_id?: string | null
          username?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string | null
          guest_id?: string | null
          id?: string | null
          matched_guest_id?: string | null
          matched_nickname?: string | null
          matched_user_id?: string | null
          matched_username?: string | null
          nickname?: string | null
          room_id?: string | null
          status?: string | null
          user_id?: string | null
          username?: string | null
          word?: string | null
        }
        Relationships: []
      }
      legacy_telepathy_sessions_log: {
        Row: {
          created_at: string | null
          id: number | null
          nickname: string | null
          partner_guest_id: string | null
          partner_id: string | null
          partner_nickname: string | null
          partner_username: string | null
          result: string | null
          room_id: string | null
          round: number | null
          user_guest_id: string | null
          user_id: string | null
          username: string | null
          word: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number | null
          nickname?: string | null
          partner_guest_id?: string | null
          partner_id?: string | null
          partner_nickname?: string | null
          partner_username?: string | null
          result?: string | null
          room_id?: string | null
          round?: number | null
          user_guest_id?: string | null
          user_id?: string | null
          username?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number | null
          nickname?: string | null
          partner_guest_id?: string | null
          partner_id?: string | null
          partner_nickname?: string | null
          partner_username?: string | null
          result?: string | null
          room_id?: string | null
          round?: number | null
          user_guest_id?: string | null
          user_id?: string | null
          username?: string | null
          word?: string | null
        }
        Relationships: []
      }
      legacy_telepathy_sessions_queue: {
        Row: {
          created_at: string | null
          guest_id: string | null
          id: number | null
          nickname: string | null
          partner_id: string | null
          partner_nickname: string | null
          partner_username: string | null
          room_id: string | null
          round: number | null
          socket_id: string | null
          status: string | null
          user_id: string | null
          username: string | null
          word: string | null
        }
        Insert: {
          created_at?: string | null
          guest_id?: string | null
          id?: number | null
          nickname?: string | null
          partner_id?: string | null
          partner_nickname?: string | null
          partner_username?: string | null
          room_id?: string | null
          round?: number | null
          socket_id?: string | null
          status?: string | null
          user_id?: string | null
          username?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string | null
          guest_id?: string | null
          id?: number | null
          nickname?: string | null
          partner_id?: string | null
          partner_nickname?: string | null
          partner_username?: string | null
          room_id?: string | null
          round?: number | null
          socket_id?: string | null
          status?: string | null
          user_id?: string | null
          username?: string | null
          word?: string | null
        }
        Relationships: []
      }
      legacy_users: {
        Row: {
          birthdate: string | null
          created_at: string | null
          deleted_at: string | null
          gender: string | null
          id: string | null
          is_deleted: boolean | null
          last_login: string | null
          megaphone_count: number | null
          nickname: string | null
          password_hash: string | null
          phone: string | null
          real_name: string | null
          username: string | null
        }
        Insert: {
          birthdate?: string | null
          created_at?: string | null
          deleted_at?: string | null
          gender?: string | null
          id?: string | null
          is_deleted?: boolean | null
          last_login?: string | null
          megaphone_count?: number | null
          nickname?: string | null
          password_hash?: string | null
          phone?: string | null
          real_name?: string | null
          username?: string | null
        }
        Update: {
          birthdate?: string | null
          created_at?: string | null
          deleted_at?: string | null
          gender?: string | null
          id?: string | null
          is_deleted?: boolean | null
          last_login?: string | null
          megaphone_count?: number | null
          nickname?: string | null
          password_hash?: string | null
          phone?: string | null
          real_name?: string | null
          username?: string | null
        }
        Relationships: []
      }
      legacy_word_history: {
        Row: {
          connected_at: string | null
          id: string | null
          is_favorite: boolean | null
          memo: string | null
          partner_id: string | null
          partner_nickname: string | null
          user_id: string | null
          user_nickname: string | null
          word: string | null
        }
        Insert: {
          connected_at?: string | null
          id?: string | null
          is_favorite?: boolean | null
          memo?: string | null
          partner_id?: string | null
          partner_nickname?: string | null
          user_id?: string | null
          user_nickname?: string | null
          word?: string | null
        }
        Update: {
          connected_at?: string | null
          id?: string | null
          is_favorite?: boolean | null
          memo?: string | null
          partner_id?: string | null
          partner_nickname?: string | null
          user_id?: string | null
          user_nickname?: string | null
          word?: string | null
        }
        Relationships: []
      }
      match_attempts: {
        Row: {
          actor_id: string
          created_at: string
          finished_at: string | null
          id: string
          legacy_id: string | null
          legacy_source: string | null
          matched_session_id: string | null
          queued_at: string
          round_id: string
          socket_id: string | null
          status: string
          word_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          matched_session_id?: string | null
          queued_at?: string
          round_id: string
          socket_id?: string | null
          status?: string
          word_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          matched_session_id?: string | null
          queued_at?: string
          round_id?: string
          socket_id?: string | null
          status?: string
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_attempts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_attempts_matched_session_id_fkey"
            columns: ["matched_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_attempts_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "match_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      match_rounds: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          round_key: number
          starts_at: string
          status: string
          word_set_id: string | null
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          round_key: number
          starts_at: string
          status?: string
          word_set_id?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          round_key?: number
          starts_at?: string
          status?: string
          word_set_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_rounds_word_set_id_fkey"
            columns: ["word_set_id"]
            isOneToOne: false
            referencedRelation: "word_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      nickname_histories: {
        Row: {
          actor_id: string
          change_reason: string
          created_at: string
          ended_at: string | null
          id: string
          nickname: string
          started_at: string
        }
        Insert: {
          actor_id: string
          change_reason?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          nickname: string
          started_at: string
        }
        Update: {
          actor_id?: string
          change_reason?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          nickname?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nickname_histories_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          body: string | null
          created_at: string
          id: string
          notification_type: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
        }
        Insert: {
          actor_id: string
          body?: string | null
          created_at?: string
          id?: string
          notification_type: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
        }
        Update: {
          actor_id?: string
          body?: string | null
          created_at?: string
          id?: string
          notification_type?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_amount: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_amount: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_amount?: number
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_key: string
          id: string
          parsed_amount: number | null
          parsed_bank: string | null
          parsed_sender: string | null
          payment_id: string | null
          processing_status: string
          raw_body: Json | null
          source: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          parsed_amount?: number | null
          parsed_bank?: string | null
          parsed_sender?: string | null
          payment_id?: string | null
          processing_status?: string
          raw_body?: Json | null
          source: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          parsed_amount?: number | null
          parsed_bank?: string | null
          parsed_sender?: string | null
          payment_id?: string | null
          processing_status?: string
          raw_body?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          actual_depositor: string | null
          amount: number
          created_at: string
          expected_depositor: string | null
          failed_at: string | null
          id: string
          legacy_sp_payment_id: string | null
          order_id: string
          paid_at: string | null
          payment_method: string
          provider: string | null
          refund_account: string | null
          refund_bank: string | null
          status: string
        }
        Insert: {
          actual_depositor?: string | null
          amount: number
          created_at?: string
          expected_depositor?: string | null
          failed_at?: string | null
          id?: string
          legacy_sp_payment_id?: string | null
          order_id: string
          paid_at?: string | null
          payment_method: string
          provider?: string | null
          refund_account?: string | null
          refund_bank?: string | null
          status?: string
        }
        Update: {
          actual_depositor?: string | null
          amount?: number
          created_at?: string
          expected_depositor?: string | null
          failed_at?: string | null
          id?: string
          legacy_sp_payment_id?: string | null
          order_id?: string
          paid_at?: string | null
          payment_method?: string
          provider?: string | null
          refund_account?: string | null
          refund_bank?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verification_challenges: {
        Row: {
          attempt_count: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          purpose: string
          request_ip_hash: string | null
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          purpose: string
          request_ip_hash?: string | null
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          purpose?: string
          request_ip_hash?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      presence_snapshots: {
        Row: {
          active_session_count: number
          captured_at: string
          online_guest_count: number
          online_user_count: number
          waiting_match_count: number
        }
        Insert: {
          active_session_count?: number
          captured_at?: string
          online_guest_count?: number
          online_user_count?: number
          waiting_match_count?: number
        }
        Update: {
          active_session_count?: number
          captured_at?: string
          online_guest_count?: number
          online_user_count?: number
          waiting_match_count?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          product_code: string
          product_type: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          product_code: string
          product_type: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          product_code?: string
          product_type?: string
          quantity?: number
        }
        Relationships: []
      }
      report_reason_codes: {
        Row: {
          code: string
          display_order: number
          is_active: boolean
          label: string
        }
        Insert: {
          code: string
          display_order?: number
          is_active?: boolean
          label: string
        }
        Update: {
          code?: string
          display_order?: number
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      report_reason_items: {
        Row: {
          reason_code: string
          report_id: string
        }
        Insert: {
          reason_code: string
          report_id: string
        }
        Update: {
          reason_code?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_reason_items_reason_code_fkey"
            columns: ["reason_code"]
            isOneToOne: false
            referencedRelation: "report_reason_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "report_reason_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          extra_message: string | null
          id: string
          reported_member_id: string
          reporter_member_id: string
          resolution_message: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          extra_message?: string | null
          id?: string
          reported_member_id: string
          reporter_member_id: string
          resolution_message?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          extra_message?: string | null
          id?: string
          reported_member_id?: string
          reporter_member_id?: string
          resolution_message?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_in_session"
            columns: ["reported_member_id", "session_id"]
            isOneToOne: false
            referencedRelation: "chat_session_members"
            referencedColumns: ["id", "session_id"]
          },
          {
            foreignKeyName: "reports_reporter_in_session"
            columns: ["reporter_member_id", "session_id"]
            isOneToOne: false
            referencedRelation: "chat_session_members"
            referencedColumns: ["id", "session_id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback: {
        Row: {
          created_at: string
          emotion: string
          from_member_id: string
          id: string
          session_id: string
          to_member_id: string
          trigger_type: string
        }
        Insert: {
          created_at?: string
          emotion: string
          from_member_id: string
          id?: string
          session_id: string
          to_member_id: string
          trigger_type?: string
        }
        Update: {
          created_at?: string
          emotion?: string
          from_member_id?: string
          id?: string
          session_id?: string
          to_member_id?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_from_in_session"
            columns: ["from_member_id", "session_id"]
            isOneToOne: false
            referencedRelation: "chat_session_members"
            referencedColumns: ["id", "session_id"]
          },
          {
            foreignKeyName: "session_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_to_in_session"
            columns: ["to_member_id", "session_id"]
            isOneToOne: false
            referencedRelation: "chat_session_members"
            referencedColumns: ["id", "session_id"]
          },
        ]
      }
      session_reconnect_grants: {
        Row: {
          created_at: string
          expires_at: string
          grant_type: string
          id: string
          member_id: string
          session_id: string
          share_channel: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          grant_type?: string
          id?: string
          member_id: string
          session_id: string
          share_channel?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          grant_type?: string
          id?: string
          member_id?: string
          session_id?: string
          share_channel?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_reconnect_grants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "chat_session_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reconnect_grants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      share_events: {
        Row: {
          actor_id: string
          channel: string
          created_at: string
          event_status: string
          id: string
          session_id: string | null
        }
        Insert: {
          actor_id: string
          channel: string
          created_at?: string
          event_status?: string
          id?: string
          session_id?: string | null
        }
        Update: {
          actor_id?: string
          channel?: string
          created_at?: string
          event_status?: string
          id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_campaigns: {
        Row: {
          asset_version: string | null
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          starts_at: string
          theme_key: string
        }
        Insert: {
          asset_version?: string | null
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          starts_at: string
          theme_key: string
        }
        Update: {
          asset_version?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          starts_at?: string
          theme_key?: string
        }
        Relationships: []
      }
      trend_word_candidates: {
        Row: {
          ai_reason: string | null
          approval_status: string
          approved_word_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          safety_status: string
          source: string | null
          text: string
          trend_score: number | null
        }
        Insert: {
          ai_reason?: string | null
          approval_status?: string
          approved_word_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          safety_status?: string
          source?: string | null
          text: string
          trend_score?: number | null
        }
        Update: {
          ai_reason?: string | null
          approval_status?: string
          approved_word_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          safety_status?: string
          source?: string | null
          text?: string
          trend_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trend_word_candidates_approved_word_id_fkey"
            columns: ["approved_word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credentials: {
        Row: {
          actor_id: string
          created_at: string
          failed_attempt_count: number
          locked_until: string | null
          password_algorithm: string
          password_changed_at: string | null
          password_hash: string
          username: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          failed_attempt_count?: number
          locked_until?: string | null
          password_algorithm?: string
          password_changed_at?: string | null
          password_hash: string
          username: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          failed_attempt_count?: number
          locked_until?: string | null
          password_algorithm?: string
          password_changed_at?: string | null
          password_hash?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credentials_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      user_item_ledger: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          item_type: string
          quantity_delta: number
          reason_type: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          item_type: string
          quantity_delta: number
          reason_type: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          item_type?: string
          quantity_delta?: number
          reason_type?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_item_ledger_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sanctions: {
        Row: {
          actor_id: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          reason_type: string
          related_report_id: string | null
          revoked_at: string | null
          sanction_type: string
          starts_at: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          reason_type: string
          related_report_id?: string | null
          revoked_at?: string | null
          sanction_type: string
          starts_at?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          reason_type?: string
          related_report_id?: string | null
          revoked_at?: string | null
          sanction_type?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sanctions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sanctions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sanctions_related_report_id_fkey"
            columns: ["related_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          actor_id: string
          birthdate: string | null
          created_at: string
          gender: string | null
          last_login_at: string | null
          nickname: string
          phone: string
          real_name: string | null
        }
        Insert: {
          actor_id: string
          birthdate?: string | null
          created_at?: string
          gender?: string | null
          last_login_at?: string | null
          nickname: string
          phone: string
          real_name?: string | null
        }
        Update: {
          actor_id?: string
          birthdate?: string | null
          created_at?: string
          gender?: string | null
          last_login_at?: string | null
          nickname?: string
          phone?: string
          real_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      word_bookmarks: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          is_favorite: boolean
          memo: string | null
          session_id: string | null
          updated_at: string
          word_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          memo?: string | null
          session_id?: string | null
          updated_at?: string
          word_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          memo?: string | null
          session_id?: string | null
          updated_at?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_bookmarks_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_bookmarks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_bookmarks_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      word_set_items: {
        Row: {
          display_order: number
          word_id: string
          word_set_id: string
        }
        Insert: {
          display_order?: number
          word_id: string
          word_set_id: string
        }
        Update: {
          display_order?: number
          word_id?: string
          word_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_set_items_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_set_items_word_set_id_fkey"
            columns: ["word_set_id"]
            isOneToOne: false
            referencedRelation: "word_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      word_sets: {
        Row: {
          created_at: string
          id: string
          name: string
          set_type: string
          status: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          set_type?: string
          status?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          set_type?: string
          status?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      words: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          source_type: string
          text: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          source_type?: string
          text: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          source_type?: string
          text?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_nickname: {
        Args: { p_actor_id: string; p_nickname: string }
        Returns: undefined
      }
      consume_item: {
        Args: { p_actor_id: string; p_item_type: string; p_quantity?: number }
        Returns: Json
      }
      item_balance: {
        Args: { p_actor_id: string; p_item_type: string }
        Returns: number
      }
      mark_challenge_verified: { Args: { p_id: string }; Returns: boolean }
      record_challenge_attempt: {
        Args: { p_id: string; p_max: number }
        Returns: number
      }
      record_item_purchase: {
        Args: {
          p_actor_id: string
          p_event_key: string
          p_paid_amount: number
          p_product_code: string
          p_source?: string
        }
        Returns: Json
      }
      record_login_failure: {
        Args: {
          p_actor_id: string
          p_lock_minutes: number
          p_max_attempts: number
        }
        Returns: {
          new_failed_count: number
          new_locked_until: string
        }[]
      }
      reset_password: {
        Args: { p_password_hash: string; p_username: string }
        Returns: undefined
      }
      signup_user: {
        Args: {
          p_birthdate?: string
          p_gender?: string
          p_nickname: string
          p_password_hash: string
          p_phone: string
          p_username: string
        }
        Returns: string
      }
      user_item_balance: {
        Args: { p_item_type: string; p_user_id: string }
        Returns: number
      }
      withdraw_user: { Args: { p_actor_id: string }; Returns: boolean }
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
