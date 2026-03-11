CREATE TABLE `system_health_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event` enum('scheduler_tick','scheduler_error','publish_success','publish_failure','mcp_auth_error','queue_stale_warning','notification_sent','pipeline_run') NOT NULL,
	`platform` varchar(64),
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_health_log_id` PRIMARY KEY(`id`)
);
