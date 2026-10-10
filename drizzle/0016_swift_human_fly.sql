CREATE TYPE "public"."feedback_jenis" AS ENUM('saran', 'koreksi_buku', 'usul_buku');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('baru', 'perlu_perhatian', 'diteruskan', 'selesai', 'ditolak');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"jenis" "feedback_jenis" NOT NULL,
	"pesan" text NOT NULL,
	"kontak" text,
	"book_id" integer,
	"book_judul_snapshot" text,
	"status" "feedback_status" DEFAULT 'baru' NOT NULL,
	"ip_hash" text NOT NULL,
	"request_id" integer,
	"handled_by" uuid,
	"handled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feedback_votes" (
	"feedback_id" integer NOT NULL,
	"admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_votes_feedback_id_admin_id_pk" PRIMARY KEY("feedback_id","admin_id")
);
--> statement-breakpoint
ALTER TABLE "feedback_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feature_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_request_id_feature_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."feature_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_handled_by_admin_profiles_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_votes" ADD CONSTRAINT "feedback_votes_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_votes" ADD CONSTRAINT "feedback_votes_admin_id_admin_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_ip_hash_created_at_idx" ON "feedback" USING btree ("ip_hash","created_at");