ALTER TABLE "delete_requests" DROP CONSTRAINT "delete_requests_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "loan_stock_allocations" DROP CONSTRAINT "loan_stock_allocations_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "loans" DROP CONSTRAINT "loans_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "delete_requests" ALTER COLUMN "book_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_stock_allocations" ALTER COLUMN "book_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "book_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "delete_requests" ADD COLUMN "book_judul_snapshot" text NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "book_judul_snapshot" text;--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_stock_allocations" ADD CONSTRAINT "loan_stock_allocations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;