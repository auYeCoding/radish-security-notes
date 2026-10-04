CREATE TABLE `custom_entry_type_fields` (
	`type_id` text NOT NULL,
	`key` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`is_sensitive` integer NOT NULL,
	PRIMARY KEY(`type_id`, `key`),
	FOREIGN KEY (`type_id`) REFERENCES `custom_entry_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `custom_entry_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
