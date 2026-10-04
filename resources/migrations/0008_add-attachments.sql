CREATE TABLE `entry_attachment_contents` (
	`attachment_id` text PRIMARY KEY NOT NULL,
	`content` blob NOT NULL,
	FOREIGN KEY (`attachment_id`) REFERENCES `entry_attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entry_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entry_attachments_entry_id_index` ON `entry_attachments` (`entry_id`);