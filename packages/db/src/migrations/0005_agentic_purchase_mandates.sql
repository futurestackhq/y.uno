CREATE TABLE `purchase_mandates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`allowed_merchant_ids_json` text NOT NULL,
	`max_amount_cents` integer NOT NULL,
	`expires_at` text NOT NULL,
	`is_active` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `mandate_id` text;
