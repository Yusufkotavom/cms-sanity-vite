CREATE TABLE `note_categories` (
	`note_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`note_id`, `category_id`)
);
--> statement-breakpoint
CREATE INDEX `note_categories_note_id_idx` ON `note_categories` (`note_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content_md` text NOT NULL,
	`excerpt` text,
	`status` text NOT NULL,
	`publish_at` text,
	`sanity_document_id` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `publish_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`run_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `publish_jobs_note_id_idx` ON `publish_jobs` (`note_id`);--> statement-breakpoint
CREATE INDEX `publish_jobs_status_run_at_idx` ON `publish_jobs` (`status`,`run_at`);