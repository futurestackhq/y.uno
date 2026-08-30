CREATE UNIQUE INDEX `message_queue_user_id_idempotency_key_unique` ON `message_queue` (`user_id`,`idempotency_key`);
