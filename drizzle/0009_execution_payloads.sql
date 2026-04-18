CREATE TABLE `execution_payloads` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ideaId` int NOT NULL,
  `brandId` int NOT NULL,
  `platform` enum('linkedin','x','webflow','reddit','email') NOT NULL,
  `status` enum('draft','approved','handed_off','executed') NOT NULL DEFAULT 'draft',
  `content` json NOT NULL,
  `metadata` json NOT NULL,
  `instructions` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  CONSTRAINT `execution_payloads_id` PRIMARY KEY(`id`)
);
