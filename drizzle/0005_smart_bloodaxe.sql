CREATE TYPE "public"."category_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "category_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"alasan" text,
	"status" "category_request_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_category_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_requested_by_admin_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_reviewed_by_admin_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_created_category_id_categories_id_fk" FOREIGN KEY ("created_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "category_requests_one_pending_per_nama" ON "category_requests" USING btree ("nama") WHERE "category_requests"."status" = 'pending';