CREATE TABLE "collection_items" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_ref" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commentaries" (
	"id" text PRIMARY KEY NOT NULL,
	"verse_ref" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"dimensions" jsonb NOT NULL,
	"confidence" text NOT NULL,
	"confidence_score" real NOT NULL,
	"confidence_derivation" jsonb NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_book" text NOT NULL,
	"from_chapter" integer NOT NULL,
	"from_verse" integer NOT NULL,
	"to_book" text NOT NULL,
	"to_chapter" integer NOT NULL,
	"to_verse" integer NOT NULL,
	"votes" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"query" text NOT NULL,
	"verse_ref" text,
	"summary" text NOT NULL,
	"dimensions" jsonb NOT NULL,
	"confidence" text NOT NULL,
	"confidence_score" real NOT NULL,
	"confidence_derivation" jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scripture_verses" (
	"id" serial PRIMARY KEY NOT NULL,
	"translation" text NOT NULL,
	"book" text NOT NULL,
	"book_number" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#b58414',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"verse_ref" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_study_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."study_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_collections" ADD CONSTRAINT "study_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collection_items_coll" ON "collection_items" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_commentary_verse_ref" ON "commentaries" USING btree ("verse_ref");--> statement-breakpoint
CREATE INDEX "idx_crossref_from" ON "cross_references" USING btree ("from_book","from_chapter","from_verse");--> statement-breakpoint
CREATE INDEX "idx_crossref_to" ON "cross_references" USING btree ("to_book","to_chapter","to_verse");--> statement-breakpoint
CREATE INDEX "idx_research_query" ON "research_findings" USING btree ("query");--> statement-breakpoint
CREATE INDEX "idx_research_user" ON "research_findings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scripture_verse_unique" ON "scripture_verses" USING btree ("translation","book","chapter","verse");--> statement-breakpoint
CREATE INDEX "idx_scripture_chapter" ON "scripture_verses" USING btree ("translation","book","chapter");--> statement-breakpoint
CREATE INDEX "idx_scripture_book" ON "scripture_verses" USING btree ("translation","book");--> statement-breakpoint
CREATE INDEX "idx_collections_user" ON "study_collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notes_user" ON "study_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notes_user_verse" ON "study_notes" USING btree ("user_id","verse_ref");