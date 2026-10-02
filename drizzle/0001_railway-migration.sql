CREATE TABLE "answers" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer_json" jsonb NOT NULL,
	"translation" text,
	"share_slug" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answers_share_slug_unique" UNIQUE("share_slug")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"answer_id" text NOT NULL,
	"share_slug" text NOT NULL,
	"question" text NOT NULL,
	"summary" text,
	"translation" text,
	"confidence" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"question_hash" text NOT NULL,
	"question" text NOT NULL,
	"answer_json" jsonb NOT NULL,
	"approved_by" text,
	"vote_count" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canonical_answers_question_hash_unique" UNIQUE("question_hash")
);
--> statement-breakpoint
CREATE TABLE "church_members" (
	"id" text PRIMARY KEY NOT NULL,
	"church_id" text NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text DEFAULT 'member',
	"email" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "churches" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"denomination" text,
	"city" text,
	"state_province" text,
	"country" text,
	"website" text,
	"contact_email" text,
	"phone" text,
	"invite_code" text NOT NULL,
	"admin_user_id" text,
	"member_count" integer DEFAULT 1,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "churches_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "creator_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"tagline" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"banner_url" text,
	"category" text DEFAULT 'worship' NOT NULL,
	"location" text,
	"church_affiliation" text,
	"season_verse" jsonb DEFAULT '{}'::jsonb,
	"featured_media" jsonb DEFAULT '[]'::jsonb,
	"social_links" jsonb DEFAULT '[]'::jsonb,
	"patronage_links" jsonb DEFAULT '[]'::jsonb,
	"prayer_requests" jsonb DEFAULT '[]'::jsonb,
	"featured_sermon_ids" jsonb DEFAULT '[]'::jsonb,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "creator_profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "flagged_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"category" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flags" (
	"id" text PRIMARY KEY NOT NULL,
	"answer_id" text NOT NULL,
	"question" text NOT NULL,
	"flag_type" text NOT NULL,
	"flag_reason" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_connections" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"google_account_email" text NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"token_expires_at" text,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "graph_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"relation" text NOT NULL,
	"confidence" text NOT NULL,
	"weight" real DEFAULT 0.5,
	"label" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"node_key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"dimension" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "graph_nodes_node_key_unique" UNIQUE("node_key")
);
--> statement-breakpoint
CREATE TABLE "missionary_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"is_restricted_region" boolean DEFAULT false,
	"location_tier" text DEFAULT 'country_only',
	"location_label" text,
	"bio" text,
	"photo_url" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"flag_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"vote" text NOT NULL,
	"correction" text,
	"scripture_refs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderators" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'moderator',
	"active" boolean DEFAULT false NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderators_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "prayer_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"commitment_id" text NOT NULL,
	"outcome" text NOT NULL,
	"private_note" text,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_commitments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"title" text NOT NULL,
	"private_details" text,
	"schedule_kind" text NOT NULL,
	"timezone" text NOT NULL,
	"local_time" text NOT NULL,
	"next_due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" text DEFAULT 'active',
	"google_event_id" text,
	"google_event_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"phone" text,
	"category" text DEFAULT 'friend',
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_engagements" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text,
	"action" text NOT NULL,
	"user_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_followups" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"checkin_id" text,
	"channel" text DEFAULT 'email',
	"recipient" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'draft',
	"google_draft_id" text,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"timezone" text NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"browser_enabled" boolean DEFAULT false NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"digest_mode" text DEFAULT 'individual',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"request" text NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"country_code" text,
	"country_name" text,
	"latitude" double precision,
	"longitude" double precision,
	"category" text DEFAULT 'community',
	"privacy_mode" text DEFAULT 'approximate',
	"is_restricted" boolean DEFAULT false NOT NULL,
	"is_restricted_region" boolean DEFAULT false NOT NULL,
	"escalation_level" text DEFAULT 'private',
	"urgency_level" text DEFAULT 'normal',
	"church_id" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"consent_atlas" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"escalation_note" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text,
	"update_text" text,
	"is_answered" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"church_name" text,
	"role" text DEFAULT 'member',
	"subscription_tier" text DEFAULT 'free',
	"subscription_status" text DEFAULT 'inactive',
	"subscription_current_period_end" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"byok_gemini_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"namespace" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sermon_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verse_highlights" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reference" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verse_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reference" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_members" ADD CONSTRAINT "church_members_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_members" ADD CONSTRAINT "church_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "churches" ADD CONSTRAINT "churches_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_connections" ADD CONSTRAINT "google_connections_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_source_id_graph_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_target_id_graph_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_votes" ADD CONSTRAINT "moderation_votes_flag_id_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderators" ADD CONSTRAINT "moderators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_checkins" ADD CONSTRAINT "prayer_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_checkins" ADD CONSTRAINT "prayer_checkins_commitment_id_prayer_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."prayer_commitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_commitments" ADD CONSTRAINT "prayer_commitments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_commitments" ADD CONSTRAINT "prayer_commitments_contact_id_prayer_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."prayer_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_contacts" ADD CONSTRAINT "prayer_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_engagements" ADD CONSTRAINT "prayer_engagements_request_id_prayer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."prayer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_followups" ADD CONSTRAINT "prayer_followups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_followups" ADD CONSTRAINT "prayer_followups_contact_id_prayer_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."prayer_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_followups" ADD CONSTRAINT "prayer_followups_checkin_id_prayer_checkins_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "public"."prayer_checkins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_notification_preferences" ADD CONSTRAINT "prayer_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_updates" ADD CONSTRAINT "prayer_updates_request_id_prayer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."prayer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sermon_notes" ADD CONSTRAINT "sermon_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_highlights" ADD CONSTRAINT "verse_highlights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_notes" ADD CONSTRAINT "verse_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_answers_slug" ON "answers" USING btree ("share_slug");--> statement-breakpoint
CREATE INDEX "idx_answers_created" ON "answers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_user" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_answer" ON "bookmarks" USING btree ("answer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bookmarks_user_answer" ON "bookmarks" USING btree ("user_id","answer_id");--> statement-breakpoint
CREATE INDEX "idx_canonical_hash" ON "canonical_answers" USING btree ("question_hash");--> statement-breakpoint
CREATE INDEX "idx_church_members_user" ON "church_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_church_members_church" ON "church_members" USING btree ("church_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_church_members_unique" ON "church_members" USING btree ("church_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_churches_city_country" ON "churches" USING btree ("city","country");--> statement-breakpoint
CREATE INDEX "idx_creator_profiles_user" ON "creator_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_creator_profiles_category" ON "creator_profiles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_flags_status" ON "flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_flags_answer" ON "flags" USING btree ("answer_id");--> statement-breakpoint
CREATE INDEX "idx_graph_edges_source" ON "graph_edges" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_graph_edges_target" ON "graph_edges" USING btree ("target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_graph_edges_unique" ON "graph_edges" USING btree ("source_id","target_id","relation");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_graph_nodes_key" ON "graph_nodes" USING btree ("node_key");--> statement-breakpoint
CREATE INDEX "idx_graph_nodes_category" ON "graph_nodes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_mod_votes_flag" ON "moderation_votes" USING btree ("flag_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_checkins_commitment" ON "prayer_checkins" USING btree ("commitment_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_checkins_user" ON "prayer_checkins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_commitments_user" ON "prayer_commitments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_commitments_contact" ON "prayer_commitments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_contacts_user" ON "prayer_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_engagements_request" ON "prayer_engagements" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_followups_user" ON "prayer_followups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_followups_contact" ON "prayer_followups" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_requests_public_approved" ON "prayer_requests" USING btree ("is_public","status");--> statement-breakpoint
CREATE INDEX "idx_prayer_requests_atlas" ON "prayer_requests" USING btree ("consent_atlas");--> statement-breakpoint
CREATE INDEX "idx_prayer_requests_escalation" ON "prayer_requests" USING btree ("escalation_level");--> statement-breakpoint
CREATE INDEX "idx_prayer_requests_church" ON "prayer_requests" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_requests_user" ON "prayer_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_requests_country" ON "prayer_requests" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_prayer_requests_category" ON "prayer_requests" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_prayer_updates_request" ON "prayer_updates" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_sermon_notes_user" ON "sermon_notes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_verse_highlights_user_ref" ON "verse_highlights" USING btree ("user_id","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_verse_notes_user_ref" ON "verse_notes" USING btree ("user_id","reference");