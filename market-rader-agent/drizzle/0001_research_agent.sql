CREATE TABLE `agent_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `agent_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agent_messages_session_idx` ON `agent_messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `agent_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`active_scan_run_id` text,
	`created_at` integer NOT NULL,
	`last_active_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`input_hash` text NOT NULL,
	`output_hash` text,
	`status` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`latency_ms` integer,
	`error_code` text,
	`created_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE TABLE `job_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`research_job_id` text NOT NULL,
	`attempt_no` integer NOT NULL,
	`worker_id` text NOT NULL,
	`lease_token` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`error_code` text,
	`error_message` text,
	`metrics_json` text,
	FOREIGN KEY (`research_job_id`) REFERENCES `research_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_attempt_unique` ON `job_attempts` (`research_job_id`,`attempt_no`);--> statement-breakpoint
CREATE TABLE `research_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_run_id` text NOT NULL,
	`scenario_revision_id` text NOT NULL,
	`research_plan_item_id` text NOT NULL,
	`country_id` text NOT NULL,
	`topic_code` text NOT NULL,
	`payload_json` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`worker_id` text,
	`lease_token` text,
	`lease_until` integer,
	`heartbeat_at` integer,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`next_retry_at` integer,
	`last_error_code` text,
	`last_error_message` text,
	`stop_reason` text,
	`result_summary_json` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`scan_run_id`) REFERENCES `scan_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scenario_revision_id`) REFERENCES `scenario_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`research_plan_item_id`) REFERENCES `research_plan_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_jobs_idempotency_key_unique` ON `research_jobs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `research_jobs_claim_idx` ON `research_jobs` (`status`,`priority`,`next_retry_at`);--> statement-breakpoint
CREATE INDEX `research_jobs_lease_idx` ON `research_jobs` (`lease_until`);--> statement-breakpoint
CREATE TABLE `research_plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`research_plan_id` text NOT NULL,
	`country_id` text NOT NULL,
	`topic_code` text NOT NULL,
	`requirements_json` text NOT NULL,
	`budgets_json` text NOT NULL,
	`preferred_source_types_json` text NOT NULL,
	`languages_json` text NOT NULL,
	`freshness_requirement_json` text NOT NULL,
	`reuse_decision_json` text NOT NULL,
	`completion_rule_json` text NOT NULL,
	`status` text NOT NULL,
	`stop_reason` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`research_plan_id`) REFERENCES `research_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_plan_item_unique` ON `research_plan_items` (`research_plan_id`,`country_id`,`topic_code`);--> statement-breakpoint
CREATE TABLE `research_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_run_id` text NOT NULL,
	`research_policy_version` text NOT NULL,
	`plan_hash` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`scan_run_id`) REFERENCES `scan_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_plans_plan_hash_unique` ON `research_plans` (`plan_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `research_plan_scan_unique` ON `research_plans` (`scan_run_id`);--> statement-breakpoint
CREATE TABLE `research_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`research_plan_item_id` text NOT NULL,
	`query_text` text NOT NULL,
	`language` text NOT NULL,
	`query_hash` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`result_count` integer,
	`created_at` integer NOT NULL,
	`executed_at` integer,
	FOREIGN KEY (`research_plan_item_id`) REFERENCES `research_plan_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_query_unique` ON `research_queries` (`research_plan_item_id`,`query_hash`);--> statement-breakpoint
CREATE TABLE `tool_call_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tool_call_id` text NOT NULL,
	`session_id` text,
	`run_id` text,
	`user_id` text,
	`tool_name` text NOT NULL,
	`args_hash` text NOT NULL,
	`result_hash` text,
	`status` text NOT NULL,
	`error_code` text,
	`resource_ids_json` text,
	`latency_ms` integer,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tool_call_logs_tool_call_id_unique` ON `tool_call_logs` (`tool_call_id`);