CREATE TYPE "public"."category_grouping" AS ENUM('bentuk', 'konten', 'lain');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('mahasiswa', 'dosen');--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"nickname" text,
	"email" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"title" text,
	"is_superadmin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "book_categories" (
	"book_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "book_categories_book_id_category_id_unique" UNIQUE("book_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "book_stock_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"posisi_id" integer,
	"qty" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "book_stock_locations_book_id_posisi_id_unique" UNIQUE("book_id","posisi_id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" text,
	"judul" text NOT NULL,
	"penulis" text,
	"tahun" integer,
	"kategori_id" integer,
	"posisi_id" integer,
	"qty" integer DEFAULT 1 NOT NULL,
	"keterangan" text,
	"last_checked" timestamp,
	"checked_by" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"grouping" "category_grouping",
	CONSTRAINT "categories_nama_unique" UNIQUE("nama")
);
--> statement-breakpoint
CREATE TABLE "loan_stock_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"book_id" integer NOT NULL,
	"posisi_id" integer,
	"qty" integer DEFAULT 1 NOT NULL,
	"allocated_at" timestamp DEFAULT now(),
	"returned_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"tanggal_pinjam" date DEFAULT now() NOT NULL,
	"due_at" timestamp,
	"tanggal_kembali" date,
	"catatan" text,
	"dicatat_oleh" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"role" "member_role" NOT NULL,
	"whatsapp" text,
	"email" text,
	"auth_user_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posisi" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" text NOT NULL,
	"rak" text NOT NULL,
	"deskripsi" text,
	CONSTRAINT "posisi_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_stock_locations" ADD CONSTRAINT "book_stock_locations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_stock_locations" ADD CONSTRAINT "book_stock_locations_posisi_id_posisi_id_fk" FOREIGN KEY ("posisi_id") REFERENCES "public"."posisi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_kategori_id_categories_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_posisi_id_posisi_id_fk" FOREIGN KEY ("posisi_id") REFERENCES "public"."posisi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_created_by_admin_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_updated_by_admin_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_stock_allocations" ADD CONSTRAINT "loan_stock_allocations_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_stock_allocations" ADD CONSTRAINT "loan_stock_allocations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_stock_allocations" ADD CONSTRAINT "loan_stock_allocations_posisi_id_posisi_id_fk" FOREIGN KEY ("posisi_id") REFERENCES "public"."posisi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_dicatat_oleh_admin_profiles_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;