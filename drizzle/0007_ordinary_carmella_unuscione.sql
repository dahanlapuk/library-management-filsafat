ALTER TABLE "loan_requests" ADD COLUMN "rejection_alasan" text;--> statement-breakpoint
ALTER TABLE "loan_requests" ADD COLUMN "rejection_notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "pickup_notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "return_reminder_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "return_notified_at" timestamp;