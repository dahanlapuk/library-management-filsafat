CREATE TYPE "public"."loan_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."member_jenjang" AS ENUM('S1', 'S2', 'S3');--> statement-breakpoint
CREATE TABLE "loan_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer,
	"book_judul_snapshot" text NOT NULL,
	"nama_peminjam" text NOT NULL,
	"role" "member_role" NOT NULL,
	"jenjang" "member_jenjang",
	"angkatan" integer,
	"whatsapp" text NOT NULL,
	"email" text,
	"keperluan" text,
	"status" "loan_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_member_id" integer,
	"created_loan_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "jenjang" "member_jenjang";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "angkatan" integer;--> statement-breakpoint
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_reviewed_by_admin_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_created_member_id_members_id_fk" FOREIGN KEY ("created_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_created_loan_id_loans_id_fk" FOREIGN KEY ("created_loan_id") REFERENCES "public"."loans"("id") ON DELETE set null ON UPDATE no action;