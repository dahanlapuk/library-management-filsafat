CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" uuid,
	"admin_nama" text DEFAULT 'System' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"entity_name" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "legacy_created_by_nama" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "legacy_updated_by_nama" text;--> statement-breakpoint
ALTER TABLE "posisi" ADD COLUMN "rak_no" integer;--> statement-breakpoint
ALTER TABLE "posisi" ADD COLUMN "baris" text;--> statement-breakpoint
ALTER TABLE "posisi" ADD COLUMN "kolom_no" integer;--> statement-breakpoint
ALTER TABLE "posisi" ADD COLUMN "letak" text;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_admin_id_admin_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;