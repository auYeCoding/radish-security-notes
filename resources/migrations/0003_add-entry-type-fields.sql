ALTER TABLE `entries` ADD `type` text DEFAULT 'login' NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `fields` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
UPDATE `entries` SET `type` = 'login', `fields` = json_object('account', `account`, 'password', `password`, 'url', `url`);
