CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`account` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer NOT NULL
);
