CREATE TABLE `sources` (
	`id` text PRIMARY KEY,
	`site` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`title_en` text,
	`date` text,
	`relevance` integer,
	`note` text,
	`summary_en` text,
	`capture_path` text,
	`record_slug` text
);
--> statement-breakpoint
CREATE TABLE `record_classes` (
	`record_slug` text NOT NULL,
	`class` text NOT NULL,
	CONSTRAINT `record_classes_pk` PRIMARY KEY(`record_slug`, `class`),
	CONSTRAINT `fk_record_classes_record_slug_research_records_slug_fk` FOREIGN KEY (`record_slug`) REFERENCES `research_records`(`slug`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `research_records` (
	`slug` text PRIMARY KEY,
	`question` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`season_label` text,
	`lede` text,
	`caveat` text
);
--> statement-breakpoint
CREATE TABLE `glossary` (
	`kr` text PRIMARY KEY,
	`shorthand` text NOT NULL,
	`en` text,
	`kind` text NOT NULL,
	`extra` text NOT NULL,
	`record_slug` text
);
--> statement-breakpoint
CREATE TABLE `mechanics` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`confidence` text NOT NULL,
	`class` text,
	`topic` text,
	`also_topics` text DEFAULT '[]' NOT NULL,
	`record_slug` text
);
--> statement-breakpoint
CREATE TABLE `rng_factors` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`factor` text NOT NULL,
	`effect` text NOT NULL,
	`mitigation` text,
	`class` text,
	`record_slug` text
);
--> statement-breakpoint
CREATE TABLE `takeaways` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`position` integer NOT NULL,
	`text` text NOT NULL,
	`detail` text,
	`class` text,
	`record_slug` text
);
--> statement-breakpoint
CREATE TABLE `timeline` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`date` text NOT NULL,
	`event` text NOT NULL,
	`class` text,
	`record_slug` text
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`summary` text NOT NULL,
	`changes` text NOT NULL,
	`record_slug` text
);
--> statement-breakpoint
CREATE TABLE `citations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`source_id` text NOT NULL,
	CONSTRAINT `fk_citations_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`)
);
--> statement-breakpoint
CREATE TABLE `fact_claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`record_slug` text NOT NULL,
	`source_id` text NOT NULL,
	CONSTRAINT `fk_fact_claims_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`)
);
--> statement-breakpoint
CREATE TABLE `captures` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`record_slug` text NOT NULL,
	`path` text NOT NULL,
	`url` text,
	`captured_at` text NOT NULL,
	`approx` text,
	`tool` text NOT NULL,
	`sha256` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY,
	`class` text NOT NULL,
	`name` text NOT NULL,
	`name_kr` text,
	`kind` text NOT NULL,
	`unlock_level` integer NOT NULL,
	`cooldown_sec` real,
	`summary` text,
	`record_slug` text
);
--> statement-breakpoint
CREATE TABLE `build_skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`build_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`rank` integer NOT NULL,
	`target_level` integer NOT NULL,
	`why` text NOT NULL,
	CONSTRAINT `fk_build_skills_build_id_builds_id_fk` FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_build_skills_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`),
	CONSTRAINT `build_skills_rank` UNIQUE(`build_id`,`rank`)
);
--> statement-breakpoint
CREATE TABLE `build_stigmas` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`build_id` text NOT NULL,
	`slot_level` integer NOT NULL,
	`skill_id` text NOT NULL,
	`why` text NOT NULL,
	CONSTRAINT `fk_build_stigmas_build_id_builds_id_fk` FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_build_stigmas_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`),
	CONSTRAINT `build_stigmas_slot` UNIQUE(`build_id`,`slot_level`)
);
--> statement-breakpoint
CREATE TABLE `builds` (
	`id` text PRIMARY KEY,
	`class` text NOT NULL,
	`purpose` text NOT NULL,
	`title` text NOT NULL,
	`why` text NOT NULL,
	`confidence` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`record_slug` text,
	`obsolete_since` text,
	`obsolete_reason` text
);
--> statement-breakpoint
CREATE TABLE `macro_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`macro_id` text NOT NULL,
	`position` integer NOT NULL,
	`skill_id` text NOT NULL,
	`note` text,
	CONSTRAINT `fk_macro_steps_macro_id_macros_id_fk` FOREIGN KEY (`macro_id`) REFERENCES `macros`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_macro_steps_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`),
	CONSTRAINT `macro_steps_position` UNIQUE(`macro_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `macros` (
	`id` text PRIMARY KEY,
	`build_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`delay_ms` integer NOT NULL,
	`why` text NOT NULL,
	CONSTRAINT `fk_macros_build_id_builds_id_fk` FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `account_roadmap_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`snapshot_id` text NOT NULL,
	`rank` integer NOT NULL,
	`priority` text NOT NULL,
	`area` text NOT NULL,
	`action` text NOT NULL,
	`why` text NOT NULL,
	`refs` text NOT NULL,
	CONSTRAINT `fk_account_roadmap_items_snapshot_id_account_snapshots_id_fk` FOREIGN KEY (`snapshot_id`) REFERENCES `account_snapshots`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `account_skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`snapshot_id` text NOT NULL,
	`skill_name` text NOT NULL,
	`skill_id` text,
	`level` integer,
	`slot` text,
	CONSTRAINT `fk_account_skills_snapshot_id_account_snapshots_id_fk` FOREIGN KEY (`snapshot_id`) REFERENCES `account_snapshots`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `account_snapshots` (
	`id` text PRIMARY KEY,
	`captured_at` text NOT NULL,
	`character` text NOT NULL,
	`class` text NOT NULL,
	`level` integer NOT NULL,
	`gear_score` integer,
	`server` text,
	`unread` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `citations_entity_entity_id_source_id_uq` ON `citations` (`entity`,`entity_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `citations_entity_entity_id_idx` ON `citations` (`entity`,`entity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fact_claims_entity_entity_id_record_slug_source_id_uq` ON `fact_claims` (`entity`,`entity_id`,`record_slug`,`source_id`);--> statement-breakpoint
CREATE INDEX `fact_claims_entity_entity_id_idx` ON `fact_claims` (`entity`,`entity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `captures_record_slug_path_uq` ON `captures` (`record_slug`,`path`);