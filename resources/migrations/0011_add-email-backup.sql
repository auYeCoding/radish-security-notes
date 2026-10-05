CREATE TABLE `email_backup_credentials` (
	`id` integer PRIMARY KEY NOT NULL,
	`authorization_code` text,
	`passphrase` text
);
--> statement-breakpoint
CREATE TABLE `email_backup_last_results` (
	`id` integer PRIMARY KEY NOT NULL,
	`completed_at` integer NOT NULL,
	`outcome` text NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE TABLE `email_backup_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`security` text NOT NULL,
	`sender_address` text NOT NULL,
	`recipient_address` text NOT NULL,
	`size_limit_mebibytes` integer NOT NULL,
	`is_encrypted` integer NOT NULL,
	`has_acknowledged_plaintext_risk` integer NOT NULL
);
