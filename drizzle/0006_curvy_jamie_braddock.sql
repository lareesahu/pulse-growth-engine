CREATE TABLE `platform_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`platform` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`bestPushTime` varchar(8) NOT NULL DEFAULT '09:00',
	`timezone` varchar(64) NOT NULL DEFAULT 'Australia/Sydney',
	`cadenceType` enum('daily','weekly','monthly','custom') NOT NULL DEFAULT 'weekly',
	`cadenceDays` json,
	`cadenceDayOfMonth` int DEFAULT 1,
	`cadenceIntervalDays` int DEFAULT 7,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`variantId` int NOT NULL,
	`contentPackageId` int NOT NULL,
	`platform` varchar(64) NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('pending','publishing','published','failed','cancelled') NOT NULL DEFAULT 'pending',
	`publishedAt` timestamp,
	`errorMessage` text,
	`publishJobId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_posts_id` PRIMARY KEY(`id`)
);
