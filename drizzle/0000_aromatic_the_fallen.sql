CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentPackageId` int NOT NULL,
	`variantId` int,
	`assetType` enum('image_prompt','image_output','design_payload','design_output','video_prompt','video_output','thumbnail') NOT NULL,
	`provider` varchar(100),
	`promptText` text,
	`outputUrl` text,
	`status` enum('pending','generating','ready','failed','replaced') NOT NULL DEFAULT 'pending',
	`version` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audience_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`segment` varchar(255) NOT NULL,
	`description` text,
	`painPoints` text,
	`goals` text,
	`isPrimary` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audience_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int,
	`actorUserId` int,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`action` varchar(128) NOT NULL,
	`description` text,
	`beforeJson` json,
	`afterJson` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`ruleType` enum('do_say','dont_say','banned_claim','required_phrase','cta_style','platform_rule','visual_rule','prompt_guardrail') NOT NULL,
	`scope` enum('global','platform_specific') NOT NULL DEFAULT 'global',
	`platform` varchar(64),
	`priority` int DEFAULT 0,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brand_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`mission` text,
	`positioning` text,
	`audienceSummary` text,
	`toneSummary` text,
	`website` varchar(500),
	`logoUrl` text,
	`colorPalette` json,
	`activePlatforms` json,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`objective` text,
	`targetPlatforms` json,
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('draft','active','completed','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ideaId` int NOT NULL,
	`brandId` int NOT NULL,
	`masterHook` text,
	`masterAngle` text,
	`keyPoints` json,
	`cta` text,
	`blogContent` text,
	`status` enum('pending_generation','generating','generated','needs_revision','approved_for_publish','archived') NOT NULL DEFAULT 'pending_generation',
	`version` int DEFAULT 1,
	`generationModel` varchar(100),
	`generationPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_pillars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`priority` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_pillars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`campaignId` int,
	`pillarId` int,
	`title` varchar(500) NOT NULL,
	`angle` text,
	`summary` text,
	`funnelStage` enum('awareness','consideration','conversion','retention') DEFAULT 'awareness',
	`targetPlatforms` json,
	`sourceType` enum('manual','scheduled_generation','campaign_generation','batch') DEFAULT 'manual',
	`status` enum('proposed','in_review','approved','rejected','archived') NOT NULL DEFAULT 'proposed',
	`createdByUserId` int,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ideas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`platform` varchar(64) NOT NULL,
	`accountName` varchar(255),
	`apiKey` text,
	`apiSecret` text,
	`accessToken` text,
	`refreshToken` text,
	`extraConfig` json,
	`status` enum('connected','expired','error','disconnected') NOT NULL DEFAULT 'disconnected',
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publishJobId` int NOT NULL,
	`platform` varchar(64) NOT NULL,
	`views` int,
	`likes` int,
	`comments` int,
	`shares` int,
	`clicks` int,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`platform` varchar(64) NOT NULL,
	`postFormat` text,
	`hashtagStrategy` text,
	`frequency` varchar(255),
	`toneNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentPackageId` int NOT NULL,
	`brandId` int NOT NULL,
	`platform` enum('instagram','facebook','linkedin','tiktok','webflow','medium','xiaohongshu','wechat','reddit','quora') NOT NULL,
	`formatType` enum('caption','article','carousel_copy','reel_script','short_post','long_post') DEFAULT 'short_post',
	`title` text,
	`body` text,
	`caption` text,
	`hashtags` json,
	`script` text,
	`status` enum('draft','generated','needs_revision','approved','queued','published','failed','archived') NOT NULL DEFAULT 'draft',
	`version` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`platform` varchar(64) NOT NULL,
	`pillar` varchar(255),
	`promptText` text NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompt_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publish_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`variantId` int NOT NULL,
	`contentPackageId` int NOT NULL,
	`brandId` int NOT NULL,
	`integrationAccountId` int,
	`platform` varchar(64) NOT NULL,
	`actionType` enum('publish_now','schedule') DEFAULT 'publish_now',
	`scheduledFor` timestamp,
	`publishStatus` enum('draft','queued','scheduled','publishing','published','partial_failure','failed','canceled') NOT NULL DEFAULT 'draft',
	`externalPostId` varchar(255),
	`errorLog` text,
	`retryCount` int DEFAULT 0,
	`lastAttemptAt` timestamp,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publish_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
