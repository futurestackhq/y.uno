CREATE TABLE `commerce_turns` (
	`created_at` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`inbound_message_id` text,
	`request_id` text NOT NULL,
	`session_id` text,
	`status` text NOT NULL,
	`summary` text NOT NULL,
	`terminal_message_id` text,
	`updated_at` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commerce_turns_user_request_unique` ON `commerce_turns` (`user_id`,`request_id`);--> statement-breakpoint
ALTER TABLE `execution_logs` ADD `turn_id` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `turn_id` text;--> statement-breakpoint
ALTER TABLE `message_queue` ADD `attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `message_queue` ADD `lease_expires_at` text;--> statement-breakpoint
ALTER TABLE `message_queue` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `message_queue` ADD `turn_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `in_reply_to_message_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `request_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `turn_id` text;