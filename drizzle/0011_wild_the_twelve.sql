CREATE TYPE "public"."maintenance_request_status" AS ENUM('pending', 'active', 'rejected', 'ended');--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"alasan" text NOT NULL,
	"status" "maintenance_request_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"started_at" timestamp,
	"ended_by" uuid,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "maintenance_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_requested_by_admin_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reviewed_by_admin_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_ended_by_admin_profiles_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_requests_one_open_per_status" ON "maintenance_requests" USING btree ("status") WHERE "maintenance_requests"."status" in ('pending', 'active');