CREATE TABLE `countries` (
	`id` text PRIMARY KEY NOT NULL,
	`iso2` text NOT NULL,
	`iso3` text NOT NULL,
	`name_en` text NOT NULL,
	`name_local` text,
	`region_code` text,
	`currency_code` text,
	`timezone` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `countries_iso2_unique` ON `countries` (`iso2`);--> statement-breakpoint
CREATE UNIQUE INDEX `countries_iso3_unique` ON `countries` (`iso3`);--> statement-breakpoint
CREATE TABLE `country_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`score_run_id` text NOT NULL,
	`country_id` text NOT NULL,
	`market_attractiveness_bps` integer,
	`entry_ease_bps` integer,
	`entry_difficulty_bps` integer,
	`opportunity_score_bps` integer,
	`priority` text,
	`coverage_bps` integer NOT NULL,
	`evidence_quality_index_bps` integer NOT NULL,
	`rank` integer,
	`rank_stability` text NOT NULL,
	`result_status` text NOT NULL,
	`data_as_of` text,
	`input_hash` text NOT NULL,
	FOREIGN KEY (`score_run_id`) REFERENCES `score_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `country_score_unique` ON `country_scores` (`score_run_id`,`country_id`);--> statement-breakpoint
CREATE INDEX `country_score_rank_idx` ON `country_scores` (`score_run_id`,`rank`);--> statement-breakpoint
CREATE TABLE `evidence_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_run_id` text,
	`subject_entity_type` text NOT NULL,
	`subject_entity_id` text,
	`subject_text` text NOT NULL,
	`predicate_code` text NOT NULL,
	`text_value` text,
	`numeric_value_decimal` text,
	`unit` text,
	`currency` text,
	`effective_from` text,
	`effective_to` text,
	`observed_at` text,
	`country_id` text NOT NULL,
	`geo_scope_json` text NOT NULL,
	`retail_format_id` text,
	`source_snapshot_id` text NOT NULL,
	`quote_text` text NOT NULL,
	`locator_json` text NOT NULL,
	`extraction_model` text,
	`extraction_prompt_version` text,
	`candidate_hash` text NOT NULL,
	`model_confidence_bps` integer,
	`validation_status` text NOT NULL,
	`validation_errors_json` text NOT NULL,
	`ai_run_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`retail_format_id`) REFERENCES `retail_formats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_snapshot_id`) REFERENCES `source_snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_candidates_candidate_hash_unique` ON `evidence_candidates` (`candidate_hash`);--> statement-breakpoint
CREATE INDEX `evidence_candidates_status_idx` ON `evidence_candidates` (`validation_status`,`created_at`);--> statement-breakpoint
CREATE TABLE `evidence_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`source_candidate_id` text,
	`subject_entity_type` text NOT NULL,
	`subject_entity_id` text,
	`subject_text` text NOT NULL,
	`predicate_code` text NOT NULL,
	`text_value` text,
	`numeric_value_decimal` text,
	`unit` text,
	`currency` text,
	`effective_from` text,
	`effective_to` text,
	`observed_at` text,
	`country_id` text NOT NULL,
	`geo_scope_json` text NOT NULL,
	`retail_format_id` text,
	`source_snapshot_id` text NOT NULL,
	`quote_text` text NOT NULL,
	`locator_json` text NOT NULL,
	`verification_status` text NOT NULL,
	`verification_method` text NOT NULL,
	`verified_by` text,
	`verified_at` integer NOT NULL,
	`source_quality_bps` integer NOT NULL,
	`claim_quality_bps` integer NOT NULL,
	`origin_cluster_id` text,
	`claim_identity_hash` text NOT NULL,
	`conflict_key_hash` text NOT NULL,
	`claim_version` integer NOT NULL,
	`supersedes_claim_id` text,
	`active` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`retail_format_id`) REFERENCES `retail_formats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_snapshot_id`) REFERENCES `source_snapshots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_claims_claim_identity_hash_unique` ON `evidence_claims` (`claim_identity_hash`);--> statement-breakpoint
CREATE INDEX `evidence_claims_lookup_idx` ON `evidence_claims` (`country_id`,`predicate_code`,`verification_status`,`active`);--> statement-breakpoint
CREATE INDEX `evidence_claims_conflict_idx` ON `evidence_claims` (`conflict_key_hash`);--> statement-breakpoint
CREATE INDEX `evidence_claims_effective_idx` ON `evidence_claims` (`effective_from`,`effective_to`);--> statement-breakpoint
CREATE TABLE `evidence_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`from_claim_id` text NOT NULL,
	`to_claim_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`reason` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_claim_id`) REFERENCES `evidence_claims`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_claim_id`) REFERENCES `evidence_claims`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_relation_unique` ON `evidence_relations` (`from_claim_id`,`to_claim_id`,`relation_type`);--> statement-breakpoint
CREATE TABLE `evidence_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text,
	`claim_id` text,
	`reviewer_user_id` text NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metric_definition_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` text NOT NULL,
	`status` text NOT NULL,
	`config_hash` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metric_definition_set_version_unique` ON `metric_definition_sets` (`code`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `metric_definition_set_hash_unique` ON `metric_definition_sets` (`config_hash`);--> statement-breakpoint
CREATE TABLE `metric_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`metric_definition_set_id` text NOT NULL,
	`metric_code` text NOT NULL,
	`dimension_code` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`value_type` text NOT NULL,
	`raw_unit` text,
	`direction` text NOT NULL,
	`indicator_weight_bps` integer NOT NULL,
	`aggregation_method` text NOT NULL,
	`aggregation_config_json` text NOT NULL,
	`normalization_method` text NOT NULL,
	`normalization_config_json` text NOT NULL,
	`reference_set_id` text,
	`freshness_window_days` integer NOT NULL,
	`minimum_verified_claims` integer NOT NULL,
	`minimum_independent_sources` integer NOT NULL,
	`critical` integer NOT NULL,
	`missing_data_policy` text NOT NULL,
	`outlier_policy` text NOT NULL,
	`input_predicates_json` text NOT NULL,
	`version` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`metric_definition_set_id`) REFERENCES `metric_definition_sets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reference_set_id`) REFERENCES `reference_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metric_definition_code_unique` ON `metric_definitions` (`metric_definition_set_id`,`metric_code`);--> statement-breakpoint
CREATE TABLE `metric_evidence_links` (
	`metric_value_id` text NOT NULL,
	`evidence_claim_id` text NOT NULL,
	`role` text NOT NULL,
	`weight_bps` integer NOT NULL,
	`reason` text,
	PRIMARY KEY(`metric_value_id`, `evidence_claim_id`, `role`),
	FOREIGN KEY (`metric_value_id`) REFERENCES `metric_values`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidence_claim_id`) REFERENCES `evidence_claims`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metric_values` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_run_id` text NOT NULL,
	`country_id` text NOT NULL,
	`metric_definition_id` text NOT NULL,
	`raw_value_json` text NOT NULL,
	`normalized_value_bps` integer,
	`coverage_bps` integer NOT NULL,
	`source_quality_bps` integer NOT NULL,
	`freshness_bps` integer NOT NULL,
	`consistency_bps` integer NOT NULL,
	`independence_bps` integer NOT NULL,
	`evidence_quality_index_bps` integer NOT NULL,
	`status` text NOT NULL,
	`input_hash` text NOT NULL,
	`calculation_version` text NOT NULL,
	`calculated_at` integer NOT NULL,
	FOREIGN KEY (`scan_run_id`) REFERENCES `scan_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`metric_definition_id`) REFERENCES `metric_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metric_value_unique` ON `metric_values` (`scan_run_id`,`country_id`,`metric_definition_id`,`input_hash`);--> statement-breakpoint
CREATE INDEX `metric_value_lookup_idx` ON `metric_values` (`scan_run_id`,`country_id`,`metric_definition_id`);--> statement-breakpoint
CREATE TABLE `product_profile_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`product_profile_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`version` text NOT NULL,
	`config_json` text NOT NULL,
	`config_hash` text NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`product_profile_id`) REFERENCES `product_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_profile_revision_no_unique` ON `product_profile_revisions` (`product_profile_id`,`revision_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_profile_revision_hash_unique` ON `product_profile_revisions` (`product_profile_id`,`config_hash`);--> statement-breakpoint
CREATE TABLE `product_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`current_revision_id` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_profiles_code_unique` ON `product_profiles` (`code`);--> statement-breakpoint
CREATE TABLE `reference_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` text NOT NULL,
	`scope_json` text NOT NULL,
	`effective_at` text NOT NULL,
	`config_json` text NOT NULL,
	`config_hash` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reference_set_version_unique` ON `reference_sets` (`code`,`version`);--> statement-breakpoint
CREATE TABLE `retail_format_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`retail_format_id` text NOT NULL,
	`country_id` text,
	`language` text NOT NULL,
	`alias` text NOT NULL,
	`normalized_alias` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`retail_format_id`) REFERENCES `retail_formats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retail_format_alias_unique` ON `retail_format_aliases` (`retail_format_id`,`country_id`,`language`,`normalized_alias`);--> statement-breakpoint
CREATE TABLE `retail_formats` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name_en` text NOT NULL,
	`taxonomy_version` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retail_formats_code_unique` ON `retail_formats` (`code`);--> statement-breakpoint
CREATE TABLE `retailer_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`retailer_id` text NOT NULL,
	`language` text NOT NULL,
	`alias` text NOT NULL,
	`normalized_alias` text NOT NULL,
	`source_snapshot_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`retailer_id`) REFERENCES `retailers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retailer_alias_unique` ON `retailer_aliases` (`retailer_id`,`language`,`normalized_alias`);--> statement-breakpoint
CREATE TABLE `retailer_formats` (
	`retailer_id` text NOT NULL,
	`retail_format_id` text NOT NULL,
	`valid_from` text,
	`valid_to` text,
	`claim_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`retailer_id`, `retail_format_id`, `claim_id`),
	FOREIGN KEY (`retailer_id`) REFERENCES `retailers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`retail_format_id`) REFERENCES `retail_formats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`claim_id`) REFERENCES `evidence_claims`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `retailer_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`retailer_id` text NOT NULL,
	`metric_code` text NOT NULL,
	`numeric_value_decimal` text,
	`text_value` text,
	`unit` text,
	`currency` text,
	`effective_from` text,
	`effective_to` text,
	`claim_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`retailer_id`) REFERENCES `retailers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`claim_id`) REFERENCES `evidence_claims`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retailer_observation_unique` ON `retailer_observations` (`retailer_id`,`metric_code`,`claim_id`);--> statement-breakpoint
CREATE INDEX `retailer_observations_lookup_idx` ON `retailer_observations` (`retailer_id`,`metric_code`,`effective_from`);--> statement-breakpoint
CREATE TABLE `retailers` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`country_id` text NOT NULL,
	`website` text,
	`status` text NOT NULL,
	`merged_into_retailer_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retailer_country_name_unique` ON `retailers` (`country_id`,`normalized_name`);--> statement-breakpoint
CREATE TABLE `scan_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scan_run_id` text NOT NULL,
	`event_type` text NOT NULL,
	`stage` text NOT NULL,
	`country_id` text,
	`topic_code` text,
	`message_code` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`scan_run_id`) REFERENCES `scan_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scan_events_run_idx` ON `scan_events` (`scan_run_id`,`id`);--> statement-breakpoint
CREATE TABLE `scan_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_revision_id` text NOT NULL,
	`status` text NOT NULL,
	`stage` text NOT NULL,
	`input_hash` text NOT NULL,
	`result_status` text NOT NULL,
	`product_profile_revision_id` text NOT NULL,
	`metric_definition_set_id` text NOT NULL,
	`scoring_model_id` text NOT NULL,
	`research_policy_version` text,
	`extractor_prompt_version` text,
	`validator_version` text,
	`model_provider` text,
	`model_name` text,
	`data_as_of` text,
	`requested_by` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`cancel_requested_at` integer,
	`started_at` integer,
	`finished_at` integer,
	`error_code` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`scenario_revision_id`) REFERENCES `scenario_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_profile_revision_id`) REFERENCES `product_profile_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`metric_definition_set_id`) REFERENCES `metric_definition_sets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scoring_model_id`) REFERENCES `scoring_models`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scan_run_idempotency_unique` ON `scan_runs` (`requested_by`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `scan_run_status_idx` ON `scan_runs` (`status`);--> statement-breakpoint
CREATE TABLE `scenario_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`parent_revision_id` text,
	`country_scope_json` text NOT NULL,
	`retail_format_codes_json` text NOT NULL,
	`product_profile_revision_id` text NOT NULL,
	`customer_filter_json` text NOT NULL,
	`research_window_json` text NOT NULL,
	`strategy_code` text NOT NULL,
	`weight_profile_id` text NOT NULL,
	`config_hash` text NOT NULL,
	`change_summary` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_profile_revision_id`) REFERENCES `product_profile_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenario_revision_no_unique` ON `scenario_revisions` (`scenario_id`,`revision_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `scenario_revision_hash_unique` ON `scenario_revisions` (`scenario_id`,`config_hash`);--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`current_revision_id` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `score_components` (
	`id` text PRIMARY KEY NOT NULL,
	`score_run_id` text NOT NULL,
	`country_id` text NOT NULL,
	`dimension_code` text NOT NULL,
	`score_bps` integer,
	`weight_bps` integer NOT NULL,
	`contribution_bps` integer,
	`coverage_bps` integer NOT NULL,
	`evidence_quality_index_bps` integer NOT NULL,
	`status` text NOT NULL,
	`input_hash` text NOT NULL,
	FOREIGN KEY (`score_run_id`) REFERENCES `score_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `score_component_unique` ON `score_components` (`score_run_id`,`country_id`,`dimension_code`);--> statement-breakpoint
CREATE TABLE `score_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_run_id` text NOT NULL,
	`scoring_model_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`error_code` text,
	FOREIGN KEY (`scan_run_id`) REFERENCES `scan_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scoring_model_id`) REFERENCES `scoring_models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `score_run_unique` ON `score_runs` (`scan_run_id`,`input_hash`);--> statement-breakpoint
CREATE TABLE `scoring_models` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` text NOT NULL,
	`metric_definition_set_id` text NOT NULL,
	`opportunity_formula_json` text NOT NULL,
	`priority_rules_json` text NOT NULL,
	`hard_blocker_rules_json` text NOT NULL,
	`minimum_coverage_json` text NOT NULL,
	`config_hash` text NOT NULL,
	`status` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`metric_definition_set_id`) REFERENCES `metric_definition_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scoring_model_version_unique` ON `scoring_models` (`code`,`version`);--> statement-breakpoint
CREATE TABLE `source_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_url` text NOT NULL,
	`publisher` text,
	`source_type` text NOT NULL,
	`origin_cluster_id` text,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_documents_canonical_url_unique` ON `source_documents` (`canonical_url`);--> statement-breakpoint
CREATE INDEX `source_documents_origin_cluster_idx` ON `source_documents` (`origin_cluster_id`);--> statement-breakpoint
CREATE TABLE `source_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`source_document_id` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`published_at` integer,
	`publisher` text,
	`source_type` text NOT NULL,
	`language` text,
	`mime_type` text NOT NULL,
	`http_status` integer NOT NULL,
	`etag` text,
	`last_modified` text,
	`content_hash` text NOT NULL,
	`normalized_text` text NOT NULL,
	`raw_content_path` text,
	`parse_status` text NOT NULL,
	`parser_version` text NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_snapshot_content_unique` ON `source_snapshots` (`source_document_id`,`content_hash`);--> statement-breakpoint
CREATE INDEX `source_snapshots_content_hash_idx` ON `source_snapshots` (`content_hash`);--> statement-breakpoint
CREATE INDEX `source_snapshots_published_at_idx` ON `source_snapshots` (`published_at`);--> statement-breakpoint
CREATE INDEX `source_snapshots_parse_status_idx` ON `source_snapshots` (`parse_status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `weight_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` text NOT NULL,
	`name` text NOT NULL,
	`dimension_weights_json` text NOT NULL,
	`config_hash` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weight_profile_version_unique` ON `weight_profiles` (`code`,`version`);