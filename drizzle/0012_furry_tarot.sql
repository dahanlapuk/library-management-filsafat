CREATE TYPE "public"."category_kind" AS ENUM('kategori', 'tag');--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_nama_unique";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "kind" "category_kind" DEFAULT 'kategori' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "urutan" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_kind_parent_nama_unique" UNIQUE NULLS NOT DISTINCT("kind","parent_id","nama");
--> statement-breakpoint
UPDATE "categories" SET "kind" = 'tag' WHERE "id" >= 63;
