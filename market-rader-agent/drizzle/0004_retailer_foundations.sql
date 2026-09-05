UPDATE `metric_definitions`
SET `aggregation_method` = 'qualified_store_base_from_retailers',
    `aggregation_config_json` = '{"input_predicates":["qualified_store_base_actual","retailer_store_count_actual"],"derivation_version":"retailer-foundations-v1","minimum_store_count":500,"minimum_retailers":3}',
    `input_predicates_json` = '["qualified_store_base_actual","retailer_store_count_actual"]'
WHERE `id` = 'md_qualified_store_base';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_method` = 'qualified_retailer_count_from_observed_retailers',
    `aggregation_config_json` = '{"input_predicates":["qualified_retailer_count_actual","retailer_store_count_actual"],"derivation_version":"retailer-foundations-v1","minimum_store_count":500,"minimum_retailers":3}',
    `input_predicates_json` = '["qualified_retailer_count_actual","retailer_store_count_actual"]'
WHERE `id` = 'md_qualified_retailer_count';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_method` = 'portfolio_cagr_from_retailer_observations',
    `aggregation_config_json` = '{"input_predicates":["format_store_count_actual","retailer_store_count_actual"],"derivation_version":"retailer-foundations-v1","minimum_store_count":500,"minimum_retailers":3,"minimum_years":2.5,"maximum_years":3.5}',
    `input_predicates_json` = '["format_store_count_actual","retailer_store_count_actual"]',
    `freshness_window_days` = 1095
WHERE `id` = 'md_format_store_cagr_3y';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_method` = 'retailer_growth_from_store_counts',
    `aggregation_config_json` = '{"input_predicates":["retailer_store_growth_percent","retailer_store_count_actual"],"derivation_version":"retailer-foundations-v1","minimum_store_count":500,"minimum_retailers":3,"minimum_years":0.75,"maximum_years":1.5}',
    `input_predicates_json` = '["retailer_store_growth_percent","retailer_store_count_actual"]'
WHERE `id` = 'md_qualified_retailer_store_growth';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_config_json` = '{"input_predicates":["expanding_retailer_share_percent","announced_store_openings_actual","qualified_retailer_count_actual","retailer_store_count_actual"],"derivation_version":"retailer-foundations-v1","method":"distinct_positive_opening_origins_divided_by_qualified_retailers","minimum_store_count":500,"minimum_retailers":3}',
    `input_predicates_json` = '["expanding_retailer_share_percent","announced_store_openings_actual","qualified_retailer_count_actual","retailer_store_count_actual"]'
WHERE `id` = 'md_expanding_retailer_share';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_config_json` = '{"input_predicates":["addressable_store_base_actual","qualified_store_base_actual","retailer_store_count_actual"],"derivation_version":"retailer-foundations-v1","fallback":"qualified_store_base_actual_or_observed_retailer_sum","minimum_store_count":500,"minimum_retailers":3}',
    `input_predicates_json` = '["addressable_store_base_actual","qualified_store_base_actual","retailer_store_count_actual"]',
    `freshness_window_days` = 1095
WHERE `id` = 'md_addressable_store_base';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_config_json` = '{"input_predicates":["estimated_acv_potential_usd_millions","qualified_retailer_count_actual","addressable_store_base_actual","qualified_store_base_actual","retailer_store_count_actual"],"derivation_version":"retailer-foundations-v1","acv_midpoint_usd_millions":0.15,"ideal_customer_store_count":500,"minimum_store_count":500,"minimum_retailers":3}',
    `input_predicates_json` = '["estimated_acv_potential_usd_millions","qualified_retailer_count_actual","addressable_store_base_actual","qualified_store_base_actual","retailer_store_count_actual"]'
WHERE `id` = 'md_estimated_acv_potential';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_config_json` = '{"input_predicates":["competition_intensity_index","qualified_retailer_count_actual","top_customer_concentration_percent","retailer_store_count_actual"],"derivation_version":"retailer-foundations-v1","minimum_store_count":500,"minimum_retailers":3}',
    `input_predicates_json` = '["competition_intensity_index","qualified_retailer_count_actual","top_customer_concentration_percent","retailer_store_count_actual"]'
WHERE `id` = 'md_competition_intensity';
--> statement-breakpoint
UPDATE `metric_definition_sets`
SET `config_hash` = 'sha256:89ad6d29e772355ae6910359011bbe95826cc4331969aaa1f879d39b17e95d21'
WHERE `id` = 'mds_southeast_asia_retail_1_0_0';
