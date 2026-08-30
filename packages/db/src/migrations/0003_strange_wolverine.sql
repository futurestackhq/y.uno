CREATE TABLE `host_plans` (
	`base_revision` integer NOT NULL,
	`created_at` text NOT NULL,
	`decision_json` text NOT NULL,
	`decision_summary` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `host_plans_session_revision_unique` ON `host_plans` (`session_id`,`base_revision`);--> statement-breakpoint
ALTER TABLE `jobs` ADD `node_id` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `plan_id` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `context_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `revision` integer DEFAULT 0 NOT NULL;