CREATE TABLE `webflow_field_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`collectionId` varchar(255) NOT NULL,
	`collectionName` varchar(255),
	`fieldMapping` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webflow_field_mappings_id` PRIMARY KEY(`id`)
);
