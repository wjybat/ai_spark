UPDATE `metric_definitions`
SET `aggregation_method` = 'expanding_share_from_origins',
    `aggregation_config_json` = '{"input_predicates":["expanding_retailer_share_percent","announced_store_openings_actual","qualified_retailer_count_actual"],"derivation_version":"derived-retail-v1","method":"distinct_positive_opening_origins_divided_by_qualified_retailers"}',
    `input_predicates_json` = '["expanding_retailer_share_percent","announced_store_openings_actual","qualified_retailer_count_actual"]'
WHERE `id` = 'md_expanding_retailer_share';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_method` = 'addressable_store_fallback',
    `aggregation_config_json` = '{"input_predicates":["addressable_store_base_actual","qualified_store_base_actual"],"derivation_version":"derived-retail-v1","fallback":"qualified_store_base_actual"}',
    `input_predicates_json` = '["addressable_store_base_actual","qualified_store_base_actual"]'
WHERE `id` = 'md_addressable_store_base';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_method` = 'estimated_acv_from_customer_base',
    `aggregation_config_json` = '{"input_predicates":["estimated_acv_potential_usd_millions","qualified_retailer_count_actual","addressable_store_base_actual","qualified_store_base_actual"],"derivation_version":"derived-retail-v1","acv_midpoint_usd_millions":0.15,"ideal_customer_store_count":500}',
    `input_predicates_json` = '["estimated_acv_potential_usd_millions","qualified_retailer_count_actual","addressable_store_base_actual","qualified_store_base_actual"]'
WHERE `id` = 'md_estimated_acv_potential';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_method` = 'competition_from_market_structure',
    `aggregation_config_json` = '{"input_predicates":["competition_intensity_index","qualified_retailer_count_actual","top_customer_concentration_percent"],"derivation_version":"derived-retail-v1"}',
    `input_predicates_json` = '["competition_intensity_index","qualified_retailer_count_actual","top_customer_concentration_percent"]'
WHERE `id` = 'md_competition_intensity';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_method` = 'localization_friction_from_partner',
    `aggregation_config_json` = '{"input_predicates":["localization_sales_friction_index","partner_channel_availability_level"],"derivation_version":"derived-retail-v1","partner_level_to_index":{"none":5,"limited":3,"strong":1}}',
    `input_predicates_json` = '["localization_sales_friction_index","partner_channel_availability_level"]'
WHERE `id` = 'md_localization_sales_friction';
--> statement-breakpoint
UPDATE `metric_definition_sets`
SET `config_hash` = 'sha256:3d5408a5254a2dd66df95d3fecbbc4ca4730fc92da26bc4a1fe2fea17d2c518f'
WHERE `id` = 'mds_southeast_asia_retail_1_0_0';
