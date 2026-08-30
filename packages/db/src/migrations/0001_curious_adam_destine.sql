ALTER TABLE `execution_logs` ADD `job_id` text;--> statement-breakpoint
ALTER TABLE `execution_logs` ADD `line` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `prompt_text` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `result_json` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `error_text` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `started_at` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `finished_at` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `next_run_at` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `subagent_name` text;--> statement-breakpoint
ALTER TABLE `message_queue` ADD `idempotency_key` text;