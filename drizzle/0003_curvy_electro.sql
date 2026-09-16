CREATE TYPE "public"."delete_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "delete_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"alasan" text NOT NULL,
	"status" "delete_request_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_requested_by_admin_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_reviewed_by_admin_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delete_requests_one_pending_per_book" ON "delete_requests" USING btree ("book_id") WHERE "delete_requests"."status" = 'pending';