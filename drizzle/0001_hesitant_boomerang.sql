CREATE TABLE `inspection_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentPackageId` int NOT NULL,
	`brandId` int NOT NULL,
	`humanisationScore` int,
	`authenticityScore` int,
	`accuracyScore` int,
	`platformFitScore` int,
	`originalityScore` int,
	`vitalityScore` int,
	`overallScore` int,
	`passed` boolean NOT NULL DEFAULT false,
	`failedDimensions` json,
	`issues` json,
	`fixedContent` json,
	`regenerationFeedback` text,
	`attemptNumber` int DEFAULT 1,
	`inspectorVersion` varchar(32) DEFAULT '2.0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspection_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspector_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`ruleType` enum('banned_phrase','banned_pattern','required_phrase','char_limit','tone_rule','formatting_rule','image_rule','custom_prompt') NOT NULL,
	`platform` varchar(64),
	`ruleValue` text NOT NULL,
	`severity` enum('error','warning','info') NOT NULL DEFAULT 'error',
	`autoFix` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspector_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspector_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`dimension` varchar(64) NOT NULL,
	`minScore` int NOT NULL DEFAULT 7,
	`isActive` boolean NOT NULL DEFAULT true,
	`weight` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspector_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`triggeredByUserId` int,
	`status` enum('running','completed','failed','partial') NOT NULL DEFAULT 'running',
	`stage` varchar(128),
	`ideasGenerated` int DEFAULT 0,
	`ideasApproved` int DEFAULT 0,
	`packagesGenerated` int DEFAULT 0,
	`packagesInspected` int DEFAULT 0,
	`packagesPassedInspection` int DEFAULT 0,
	`packagesFailedInspection` int DEFAULT 0,
	`packagesRegenerated` int DEFAULT 0,
	`readyForReview` int DEFAULT 0,
	`errorLog` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `pipeline_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vitality_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentPackageId` int NOT NULL,
	`brandId` int NOT NULL,
	`platform` varchar(64) NOT NULL,
	`predictedScore` int NOT NULL,
	`actualEngagement` int,
	`predictionError` int,
	`modelVersion` varchar(32) DEFAULT '1.0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `vitality_predictions_id` PRIMARY KEY(`id`)
);
