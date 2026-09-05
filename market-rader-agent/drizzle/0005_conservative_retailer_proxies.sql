UPDATE `metric_definitions`
SET `aggregation_config_json` = '{"input_predicates":["expanding_retailer_share_percent","announced_store_openings_actual","qualified_retailer_count_actual"],"derivation_version":"derived-retail-v1","method":"distinct_positive_opening_origins_divided_by_qualified_retailers"}',
    `input_predicates_json` = '["expanding_retailer_share_percent","announced_store_openings_actual","qualified_retailer_count_actual"]'
WHERE `id` = 'md_expanding_retailer_share';
--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation_config_json` = '{"input_predicates":["competition_intensity_index","qualified_retailer_count_actual","top_customer_concentration_percent"],"derivation_version":"derived-retail-v1"}',
    `input_predicates_json` = '["competition_intensity_index","qualified_retailer_count_actual","top_customer_concentration_percent"]'
WHERE `id` = 'md_competition_intensity';
--> statement-breakpoint
UPDATE `metric_definition_sets`
SET `config_hash` = 'sha256:b887e932d1372a76f3407885b0e30230172a0eb236ecf6c856ff90469c4eb437'
WHERE `id` = 'mds_southeast_asia_retail_1_0_0';
