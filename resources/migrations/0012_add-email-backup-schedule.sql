CREATE TABLE `email_backup_schedule` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_enabled` integer NOT NULL,
	`interval_key` text NOT NULL,
	`last_attempt_at` integer,
	`failure_count` integer NOT NULL,
	`first_failure_at` integer,
	`is_paused` integer NOT NULL,
	`last_failure_reason` text,
	`last_failure_at` integer
);
--> statement-breakpoint
ALTER TABLE `email_backup_last_results` ADD `trigger_kind` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `email_backup_last_results` ADD `last_success_at` integer;--> statement-breakpoint
UPDATE `email_backup_last_results` SET `last_success_at` = `completed_at` WHERE `outcome` = 'success';