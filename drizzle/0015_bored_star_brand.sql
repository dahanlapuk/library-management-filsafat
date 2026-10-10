CREATE TYPE "public"."feature_request_area" AS ENUM('dashboard', 'katalog', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."feature_request_status" AS ENUM('baru', 'dipertimbangkan', 'dikerjakan', 'selesai', 'ditolak');--> statement-breakpoint
CREATE TABLE "feature_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"judul" text NOT NULL,
	"deskripsi" text NOT NULL,
	"area" "feature_request_area" DEFAULT 'lainnya' NOT NULL,
	"status" "feature_request_status" DEFAULT 'baru' NOT NULL,
	"tanggapan" text,
	"pengirim_nama" text NOT NULL,
	"created_by" uuid,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_created_by_admin_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;