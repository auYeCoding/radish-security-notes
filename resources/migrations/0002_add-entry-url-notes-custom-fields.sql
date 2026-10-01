ALTER TABLE `entries` ADD `url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `custom_fields` text DEFAULT '[]' NOT NULL;