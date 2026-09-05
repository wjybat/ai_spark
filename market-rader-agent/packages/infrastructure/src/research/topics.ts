export const RESEARCH_POLICY_VERSION = "1.7.0";

/** Fixed research topics with the predicates they must produce. */
export interface TopicDefinition {
  readonly code: string;
  readonly predicates: readonly string[];
  /** Predicates that can never be auto-verified (regulatory / blocker). */
  readonly reviewPredicates: readonly string[];
  readonly minimumVerifiedClaims: number;
  readonly minimumIndependentSources: number;
}

interface PredicateValueContract {
  readonly unit: string;
  readonly kind: "integer" | "number" | "ordinal";
  readonly levels?: readonly string[];
  readonly min?: number;
  readonly max?: number;
  /** Exact semantic scope supplied to the provider and enforced where possible. */
  readonly evidenceScope: string;
}

/** Runtime contracts for values submitted by research providers. */
export const PREDICATE_VALUE_CONTRACTS: Readonly<Record<string, PredicateValueContract>> = {
  qualified_store_base_actual: {
    unit: "store", kind: "integer", min: 0, max: 10_000_000,
    evidenceScope: "countrywide total of chain-operated modern-format stores/outlets; exclude a single retailer, informal/traditional shops, and broad business establishments",
  },
  qualified_retailer_count_actual: {
    unit: "retailer", kind: "integer", min: 0, max: 1_000,
    evidenceScope: "countrywide count of distinct retail companies/operators/chains; never use a store/outlet/establishment count or the length of a Top-N list",
  },
  modern_retail_share_percent: {
    unit: "percent", kind: "number", min: 0, max: 100,
    evidenceScope: "modern retail/trade share of the country's total retail or grocery sales, with the denominator stated; exclude one company's share or one sub-format's internal share",
  },
  format_store_count_actual: {
    unit: "store", kind: "integer", min: 0, max: 10_000_000,
    evidenceScope: "countrywide total outlets for one explicitly named retail format; exclude counts for an individual retailer and keep exactly the same format scope across dates",
  },
  modern_retail_sales_cagr_percent: {
    unit: "percent", kind: "number", min: -100, max: 500,
    evidenceScope: "explicit CAGR for the country's modern retail/trade or modern grocery sales, with the period stated; exclude total retail unless modern trade is the measured segment",
  },
  retailer_store_growth_percent: {
    unit: "percent", kind: "number", min: -100, max: 500,
    evidenceScope: "countrywide growth rate of a retail format or qualified-chain store network; exclude sales/revenue growth and a single retailer's growth",
  },
  announced_store_openings_actual: {
    unit: "store", kind: "integer", min: 0, max: 1_000_000,
    evidenceScope: "explicit number of new stores a named retailer opened or officially plans to open in the country; exclude the retailer's total existing store base",
  },
  expanding_retailer_share_percent: {
    unit: "percent", kind: "number", min: 0, max: 100,
    evidenceScope: "explicit share of qualified retailers expanding their store networks; do not calculate it in the model",
  },
  new_entrant_activity_level: {
    unit: "level",
    kind: "ordinal",
    levels: ["none", "low", "moderate", "high"],
    evidenceScope: "classification supported by explicit market-entry announcements in the country; omit when no concrete entrant is named",
  },
  store_system_readiness_level: {
    unit: "level", kind: "ordinal", levels: ["low", "medium", "high"],
    evidenceScope: "fixed readiness classification supported by explicit retailer deployment of POS, ERP, analytics, or integrated store systems",
  },
  video_infrastructure_readiness_level: {
    unit: "level", kind: "ordinal", levels: ["low", "medium", "high"],
    evidenceScope: "fixed readiness classification supported by explicit CCTV, IP-camera, or video-analytics deployment evidence",
  },
  cloud_connectivity_readiness_level: {
    unit: "level", kind: "ordinal", levels: ["low", "medium", "high"],
    evidenceScope: "fixed readiness classification supported by explicit retail cloud adoption or store-connectivity evidence",
  },
  digital_investment_signals_level: {
    unit: "level", kind: "ordinal", levels: ["low", "medium", "high"],
    evidenceScope: "fixed classification supported by explicit retailer digital-transformation investment or deployment evidence",
  },
  addressable_store_base_actual: {
    unit: "store", kind: "integer", min: 0, max: 10_000_000,
    evidenceScope: "countrywide stores matching the product's chain/modern-format target profile; exclude sari-sari, warung, traditional micro-retail, and all-establishment totals",
  },
  top_customer_concentration_percent: {
    unit: "percent", kind: "number", min: 0, max: 100,
    evidenceScope: "combined national modern-retail market share of explicitly named leading retailer groups; exclude one retailer's share and shares within only one narrow sub-format",
  },
  estimated_acv_potential_usd_millions: {
    unit: "usd_millions", kind: "number", min: 0,
    evidenceScope: "explicit published annual contract value potential in USD millions; do not estimate it in the model",
  },
  use_case_need_fit_level: {
    unit: "level", kind: "ordinal", levels: ["low", "medium", "high"],
    evidenceScope: "fixed loss-prevention need classification supported by explicit shrink, theft, fraud, or loss-rate evidence",
  },
  privacy_video_regulation_fit_level: {
    unit: "level", kind: "ordinal", levels: ["restrictive", "moderate", "supportive"],
    evidenceScope: "classification of current privacy/video law based only on regulator or enacted-law text; always requires human review",
  },
  data_residency_fit_level: {
    unit: "level", kind: "ordinal", levels: ["incompatible", "partial", "compatible"],
    evidenceScope: "classification of binding data-localization requirements based only on regulator or enacted-law text; always requires human review",
  },
  partner_channel_availability_level: {
    unit: "level", kind: "ordinal", levels: ["none", "limited", "strong"],
    evidenceScope: "classification supported by named in-country systems integrators, distributors, or technology partners serving retailers",
  },
  competition_intensity_index: {
    unit: "index", kind: "number", min: 1, max: 10,
    evidenceScope: "explicit published competition index from 1 to 10; do not estimate it in the model",
  },
  localization_sales_friction_index: {
    unit: "index", kind: "number", min: 1, max: 5,
    evidenceScope: "explicit published localization/sales-friction index from 1 to 5; do not estimate it in the model",
  },
  retailer_store_count_actual: {
    unit: "store", kind: "integer", min: 0, max: 10_000_000,
    evidenceScope: "total store count for the named retailer in the country at the stated date",
  },
  retailer_store_opening_plan_actual: {
    unit: "store", kind: "integer", min: 0, max: 1_000_000,
    evidenceScope: "explicit new-store opening target for the named retailer in the country",
  },
  video_processing_restriction_status: {
    unit: "level", kind: "ordinal", levels: ["allowed", "restricted", "prohibited"],
    evidenceScope: "binding legal status based only on regulator or enacted-law text; always requires human review",
  },
};

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function validatePredicateValue(
  predicate: string,
  value: string,
  unit: string,
): string[] {
  const contract = PREDICATE_VALUE_CONTRACTS[predicate];
  if (contract === undefined) return ["unknown_predicate"];

  const errors: string[] = [];
  if (unit !== contract.unit) errors.push(`invalid_unit:expected_${contract.unit}`);

  if (contract.kind === "ordinal") {
    if (!contract.levels?.includes(value)) errors.push("invalid_ordinal_value");
    return errors;
  }

  if (!DECIMAL_PATTERN.test(value)) {
    errors.push("invalid_numeric_value");
    return errors;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) errors.push("invalid_numeric_value");
  if (contract.kind === "integer" && !Number.isInteger(numeric)) {
    errors.push("invalid_integer_value");
  }
  if (contract.min !== undefined && numeric < contract.min) errors.push(`value_below_min:${contract.min}`);
  if (contract.max !== undefined && numeric > contract.max) errors.push(`value_above_max:${contract.max}`);
  return errors;
}

const LOW_PRECISION_ADVISORY_ERRORS = new Set([
  "combined_leader_share_not_explicit",
  "country_scope_mismatch",
  "countrywide_chain_store_scope_not_explicit",
  "format_store_unit_not_explicit",
  "loss_prevention_signal_not_explicit",
  "manual_review_bypassed",
  "modern_retail_cagr_scope_not_explicit",
  "modern_retail_share_scope_not_explicit",
  "narrow_subformat_share",
  "non_target_store_scope",
  "observed_year_not_supported_by_quote",
  "observed_year_not_supported_by_source",
  "opening_plan_not_actual_store_count",
  "partner_channel_signal_not_explicit",
  "retail_cloud_signal_not_explicit",
  "retail_digital_investment_signal_not_explicit",
  "retail_format_not_explicit",
  "retail_store_system_signal_not_explicit",
  "retail_video_signal_not_explicit",
  "retailer_count_scope_not_explicit",
  "retailer_name_not_in_quote",
  "retailer_store_unit_not_explicit",
  "retailer_total_store_count_not_explicit",
  "single_retailer_not_format_total",
  "single_retailer_store_count",
  "store_growth_scope_not_explicit",
  "store_opening_scope_not_explicit",
  "store_or_establishment_count_not_retailer_count",
  "store_scope_not_explicit",
  "top_n_is_not_retailer_population",
]);

/** Semantic mismatches retained as warnings by the explicit low-precision policy. */
export function isLowPrecisionAdvisoryError(error: string): boolean {
  const withoutLocation = error.replace(/^document\[\d+\]\.claim\[\d+\]:/, "");
  return LOW_PRECISION_ADVISORY_ERRORS.has(withoutLocation.split(":", 1)[0]!);
}

const POINT_IN_TIME_PREDICATES = new Set([
  "qualified_store_base_actual",
  "qualified_retailer_count_actual",
  "modern_retail_share_percent",
  "format_store_count_actual",
  "addressable_store_base_actual",
  "top_customer_concentration_percent",
  "retailer_store_count_actual",
]);

function numericMentions(text: string): number[] {
  const mentions: number[] = [];
  const pattern = /(-?\d[\d,]*(?:\.\d+)?)\s*(billion|million|thousand|bn|mn|m|k)?\b/gi;
  for (const match of text.matchAll(pattern)) {
    const base = Number(match[1]?.replaceAll(",", ""));
    if (!Number.isFinite(base)) continue;
    const scale = match[2]?.toLowerCase();
    const multiplier = scale === "billion" || scale === "bn"
      ? 1_000_000_000
      : scale === "million" || scale === "mn" || scale === "m"
        ? 1_000_000
        : scale === "thousand" || scale === "k"
          ? 1_000
          : 1;
    mentions.push(base * multiplier);
  }
  return mentions;
}

/** Deterministic quote-level semantic checks. Failures are auto-rejected, not queued for review. */
export function validatePredicateEvidence(
  predicate: string,
  value: string,
  quoteText: string,
  observedAt: string,
  publishedAt?: string,
  countryIso2?: string,
): string[] {
  const contract = PREDICATE_VALUE_CONTRACTS[predicate];
  if (contract === undefined) return ["unknown_predicate"];
  const errors: string[] = [];

  const countryNames: Readonly<Record<string, readonly string[]>> = {
    ID: ["indonesia"],
    MY: ["malaysia"],
    PH: ["philippines", "philippine"],
    TH: ["thailand", "thai"],
    VN: ["vietnam", "viet nam", "vietnamese"],
    SA: ["saudi arabia", "saudi"],
    AE: ["united arab emirates", "uae", "emirati"],
    QA: ["qatar", "qatari"],
    KW: ["kuwait", "kuwaiti"],
    OM: ["oman", "omani"],
    MX: ["mexico", "mexican"],
    BR: ["brazil", "brazilian"],
    CO: ["colombia", "colombian"],
    CL: ["chile", "chilean"],
    PE: ["peru", "peruvian"],
    EG: ["egypt", "egyptian"],
    MA: ["morocco", "moroccan"],
    DZ: ["algeria", "algerian"],
    TN: ["tunisia", "tunisian"],
    LY: ["libya", "libyan"],
    IN: ["india", "indian"],
    SG: ["singapore"],
  };
  if (countryIso2 !== undefined) {
    const lowerQuote = quoteText.toLowerCase();
    const expectedNames = countryNames[countryIso2] ?? [];
    const expectedMentioned = expectedNames.some((name) => lowerQuote.includes(name));
    const foreignMentioned = Object.entries(countryNames).some(
      ([iso2, names]) => iso2 !== countryIso2 && names.some((name) => lowerQuote.includes(name)),
    );
    if (!expectedMentioned && foreignMentioned) errors.push("country_scope_mismatch");
  }

  if (contract.kind !== "ordinal" && DECIMAL_PATTERN.test(value)) {
    const target = Number(value);
    const supported = numericMentions(quoteText).some(
      (mention) => Math.abs(mention - target) <= Math.max(1e-9, Math.abs(target) * 1e-9),
    );
    if (!supported) errors.push("numeric_value_not_in_quote");
  }

  if (POINT_IN_TIME_PREDICATES.has(predicate)) {
    const observedYear = observedAt.slice(0, 4);
    const quoteYears = [...quoteText.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]);
    if (quoteYears.length > 0 && !quoteYears.includes(observedYear)) {
      errors.push("observed_year_not_supported_by_quote");
    } else if (quoteYears.length === 0 && publishedAt !== undefined && publishedAt.slice(0, 4) !== observedYear) {
      errors.push("observed_year_not_supported_by_source");
    }
  }

  if (predicate === "retailer_store_count_actual") {
    if (!/(stores?|outlets?)/i.test(quoteText)) errors.push("retailer_store_unit_not_explicit");
    if (!/(total|as of|as at|operates?|had|number of stores?|store network|store count|store base|store footprint|compris(?:e|es|ing)|consists? of)/i.test(quoteText)) {
      errors.push("retailer_total_store_count_not_explicit");
    }
    if (/(plan|target|aim|will open|new stores?|additional stores?)/i.test(quoteText) && !/(total|as of|as at|operates?|had|compris(?:e|es|ing)|consists? of)/i.test(quoteText)) {
      errors.push("opening_plan_not_actual_store_count");
    }
  }

  if (predicate === "qualified_retailer_count_actual") {
    if (/\btop\s*[-–]?\s*\d+\b/i.test(quoteText)) errors.push("top_n_is_not_retailer_population");
    if (!/(retailers?|retail chains?|retail companies|operators?|công ty bán lẻ)/i.test(quoteText)) {
      errors.push("retailer_count_scope_not_explicit");
    }
    if (/(stores?|outlets?|establishments?)/i.test(quoteText) && !/(number|count|total|there (?:are|were)).{0,40}(retailers?|chains?|companies|operators?)/i.test(quoteText)) {
      errors.push("store_or_establishment_count_not_retailer_count");
    }
  }

  if (predicate === "qualified_store_base_actual" || predicate === "addressable_store_base_actual") {
    if (!/(stores?|outlets?)/i.test(quoteText)) errors.push("store_scope_not_explicit");
    if (!/(modern (?:trade|retail)|chain|sector|market|nationwide|national|countrywide|total)/i.test(quoteText)) {
      errors.push("countrywide_chain_store_scope_not_explicit");
    }
    if (/(sari[- ]sari|warung|traditional|informal|micro[- ]?retail|all establishments)/i.test(quoteText)) {
      errors.push("non_target_store_scope");
    }
    if (/\b(?:had|operates?|operated|owns?)\b.{0,60}\b(?:stores?|outlets?)\b/i.test(quoteText) && !/(sector|market|nationwide|national|countrywide|total)/i.test(quoteText)) {
      errors.push("single_retailer_store_count");
    }
  }

  if (predicate === "format_store_count_actual") {
    if (!/(stores?|outlets?)/i.test(quoteText)) errors.push("format_store_unit_not_explicit");
    if (!/(convenien(?:ce|t)|mini ?market|supermarket|hypermarket|department store|drug ?store|pharmacy|modern trade|modern retail|grocery|specialty)/i.test(quoteText)) {
      errors.push("retail_format_not_explicit");
    }
    if (/\b(?:had|operates?|operated|owns?)\b.{0,60}\b(?:stores?|outlets?)\b/i.test(quoteText)) {
      errors.push("single_retailer_not_format_total");
    }
  }

  if (predicate === "modern_retail_share_percent" && !/(modern (?:trade|retail|grocery)).{0,100}(share|%|percent)|(?:share|%|percent).{0,100}modern (?:trade|retail|grocery)/i.test(quoteText)) {
    errors.push("modern_retail_share_scope_not_explicit");
  }
  if (predicate === "modern_retail_sales_cagr_percent" && (!/\bcagr\b|compound annual/i.test(quoteText) || !/(modern (?:trade|retail|grocery)|supermarkets?|hypermarkets?)/i.test(quoteText))) {
    errors.push("modern_retail_cagr_scope_not_explicit");
  }
  if (predicate === "retailer_store_growth_percent" && (!/(growth|grew|increase|decrease|declin)/i.test(quoteText) || !/(stores?|outlets?)/i.test(quoteText))) {
    errors.push("store_growth_scope_not_explicit");
  }
  if (
    predicate === "announced_store_openings_actual" &&
    !/(open|opening|(?:new|additional).{0,24}(?:stores?|outlets?))/i.test(quoteText)
  ) {
    errors.push("store_opening_scope_not_explicit");
  }
  if (predicate === "top_customer_concentration_percent") {
    if (!/(together|combined|top\s+\d+|leading).{0,120}(share|%|percent)|(?:share|%|percent).{0,120}(together|combined|top\s+\d+|leading)/i.test(quoteText)) {
      errors.push("combined_leader_share_not_explicit");
    }
    if (/(warehouse clubs?|single retailer)/i.test(quoteText)) errors.push("narrow_subformat_share");
  }
  if (
    predicate === "store_system_readiness_level" &&
    (!/(retailers?|retail stores?|store network)/i.test(quoteText) ||
      !/(pos|point.of.sale|erp|inventory|store system|digital payment)/i.test(quoteText))
  ) {
    errors.push("retail_store_system_signal_not_explicit");
  }
  if (
    predicate === "video_infrastructure_readiness_level" &&
    (!/(retailers?|retail stores?|stores?|shops?)/i.test(quoteText) ||
      !/(cctv|video analytics|video surveillance|cameras?)/i.test(quoteText))
  ) {
    errors.push("retail_video_signal_not_explicit");
  }
  if (
    predicate === "cloud_connectivity_readiness_level" &&
    (!/(retailers?|retail stores?|store network)/i.test(quoteText) ||
      !/(cloud|connectivity|connected stores?|broadband)/i.test(quoteText))
  ) {
    errors.push("retail_cloud_signal_not_explicit");
  }
  if (
    predicate === "digital_investment_signals_level" &&
    (!/(retailers?|retail stores?|retail sector|store network)/i.test(quoteText) ||
      !/(digital|technology|e-commerce|automation|analytics)/i.test(quoteText))
  ) {
    errors.push("retail_digital_investment_signal_not_explicit");
  }
  if (predicate === "use_case_need_fit_level" && !/(shrink|theft|fraud|shoplift|retail loss)/i.test(quoteText)) {
    errors.push("loss_prevention_signal_not_explicit");
  }
  if (
    predicate === "partner_channel_availability_level" &&
    !/(systems? integrators?|distributors?|resellers?|channel partners?|technology partners?)/i.test(quoteText)
  ) {
    errors.push("partner_channel_signal_not_explicit");
  }

  return errors;
}

export function predicateContractInstruction(predicate: string): string {
  const contract = PREDICATE_VALUE_CONTRACTS[predicate];
  if (contract === undefined) return `${predicate}: unsupported`;
  const value = contract.kind === "ordinal"
    ? `exactly one of ${contract.levels?.join("|") ?? ""}`
    : contract.kind === "integer"
      ? "a plain base-10 integer without commas or words"
      : "a plain base-10 number without commas, symbols, or words";
  const range = contract.min === undefined && contract.max === undefined
    ? ""
    : `; range ${contract.min ?? "unbounded"}..${contract.max ?? "unbounded"}`;
  return `${predicate}: value must be ${value}; unit must be ${contract.unit}${range}; scope: ${contract.evidenceScope}`;
}

export const RESEARCH_TOPICS: readonly TopicDefinition[] = [
  { code: "market_size", predicates: ["qualified_store_base_actual", "modern_retail_share_percent"], reviewPredicates: [], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "market_growth", predicates: ["modern_retail_sales_cagr_percent", "retailer_store_growth_percent"], reviewPredicates: [], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "format_store_count", predicates: ["format_store_count_actual"], reviewPredicates: [], minimumVerifiedClaims: 2, minimumIndependentSources: 1 },
  { code: "retailer_expansion", predicates: ["announced_store_openings_actual", "new_entrant_activity_level"], reviewPredicates: [], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "retailer_landscape", predicates: ["qualified_retailer_count_actual", "top_customer_concentration_percent"], reviewPredicates: [], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "retailer_foundations_a", predicates: ["retailer_store_count_actual"], reviewPredicates: [], minimumVerifiedClaims: 4, minimumIndependentSources: 2 },
  { code: "retailer_foundations_b", predicates: ["retailer_store_count_actual"], reviewPredicates: [], minimumVerifiedClaims: 4, minimumIndependentSources: 2 },
  { code: "digital_readiness", predicates: ["store_system_readiness_level", "cloud_connectivity_readiness_level", "digital_investment_signals_level"], reviewPredicates: [], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "video_infrastructure", predicates: ["video_infrastructure_readiness_level"], reviewPredicates: [], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "loss_prevention_need", predicates: ["use_case_need_fit_level"], reviewPredicates: [], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "privacy_and_video_regulation", predicates: ["privacy_video_regulation_fit_level", "video_processing_restriction_status"], reviewPredicates: ["privacy_video_regulation_fit_level", "video_processing_restriction_status"], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "data_residency", predicates: ["data_residency_fit_level"], reviewPredicates: ["data_residency_fit_level"], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
  { code: "partner_ecosystem", predicates: ["partner_channel_availability_level"], reviewPredicates: [], minimumVerifiedClaims: 1, minimumIndependentSources: 1 },
];

export function topicByCode(code: string): TopicDefinition | undefined {
  return RESEARCH_TOPICS.find((topic) => topic.code === code);
}

const FORMAT_SCOPE_BY_COUNTRY: Readonly<Record<string, string>> = {
  ID: "convenience/minimarket outlets",
  MY: "convenience/minimarket outlets",
  PH: "convenience-store outlets",
  TH: "convenience-store outlets",
  VN: "convenience/minimarket outlets",
};

const COUNTRY_SEARCH_LANGUAGES: Readonly<Record<string, readonly string[]>> = {
  ID: ["id", "en"], MY: ["ms", "en"], PH: ["fil", "en"], TH: ["th", "en"], VN: ["vi", "en"],
  SA: ["ar", "en"], AE: ["ar", "en"], QA: ["ar", "en"], KW: ["ar", "en"], OM: ["ar", "en"],
  MX: ["es", "en"], BR: ["pt", "en"], CO: ["es", "en"], CL: ["es", "en"], PE: ["es", "en"],
  EG: ["ar", "en"], MA: ["ar", "fr", "en"], DZ: ["ar", "fr", "en"], TN: ["ar", "fr", "en"], LY: ["ar", "en"],
};

const LOCAL_SEARCH_VOCABULARY: Readonly<Record<string, string>> = {
  ID: "Bahasa Indonesia: jumlah gerai, jumlah toko, minimarket, laporan tahunan, pertumbuhan ritel, sistem kasir, CCTV toko",
  MY: "Bahasa Melayu: bilangan kedai, jumlah cawangan, kedai serbaneka, pasar mini, laporan tahunan, pertumbuhan runcit, sistem POS, CCTV kedai",
  PH: "Filipino/English local usage: bilang ng tindahan, sangay, taunang ulat, paglago ng retail, convenience store, CCTV store",
  TH: "Thai: จำนวนสาขา, จำนวนร้าน, ร้านสะดวกซื้อ, มินิมาร์ท, รายงานประจำปี, การเติบโตค้าปลีก, ระบบ POS, กล้องวงจรปิด",
  VN: "Vietnamese: số lượng cửa hàng, số chi nhánh, cửa hàng tiện lợi, siêu thị mini, báo cáo thường niên, tăng trưởng bán lẻ, hệ thống POS, camera cửa hàng",
  SA: "Arabic: عدد الفروع، عدد المتاجر، متجر صغير، متجر ملائم، التقرير السنوي، نمو التجزئة",
  AE: "Arabic: عدد الفروع، عدد المتاجر، بقالة، متجر ملائم، التقرير السنوي، نمو التجزئة",
  QA: "Arabic: عدد الفروع، عدد المتاجر، متجر ملائم، التقرير السنوي، قطاع التجزئة",
  KW: "Arabic: عدد الفروع، عدد المتاجر، جمعية تعاونية، متجر ملائم، التقرير السنوي",
  OM: "Arabic: عدد الفروع، عدد المتاجر، متجر ملائم، التقرير السنوي، نمو التجزئة",
  MX: "Spanish: número de tiendas, sucursales, tienda de conveniencia, minimercado, informe anual, crecimiento minorista",
  BR: "Portuguese: número de lojas, filiais, loja de conveniência, minimercado, relatório anual, crescimento varejista",
  CO: "Spanish: número de tiendas, sucursales, tienda de conveniencia, minimercado, informe anual",
  CL: "Spanish: número de tiendas, locales, tienda de conveniencia, minimarket, memoria anual",
  PE: "Spanish: número de tiendas, locales, tienda de conveniencia, minimarket, memoria anual",
  EG: "Arabic: عدد الفروع، عدد المتاجر، متجر ملائم، سوق صغير، التقرير السنوي",
  MA: "Arabic/French: عدد الفروع، nombre de magasins, supérette, commerce de proximité, rapport annuel",
  DZ: "Arabic/French: عدد الفروع، nombre de magasins, supérette, commerce de proximité, rapport annuel",
  TN: "Arabic/French: عدد الفروع، nombre de magasins, supérette, commerce de proximité, rapport annuel",
  LY: "Arabic: عدد الفروع، عدد المتاجر، متجر ملائم، سوق صغير، قطاع التجزئة",
};

export function researchLanguages(countryIso2: string): readonly string[] {
  return COUNTRY_SEARCH_LANGUAGES[countryIso2] ?? ["en"];
}

export function localLanguageSearchInstruction(countryIso2: string): string {
  const languages = researchLanguages(countryIso2);
  const vocabulary = LOCAL_SEARCH_VOCABULARY[countryIso2];
  if (languages.length === 1 || vocabulary === undefined) return "Search in English.";
  return `Search in both the local language (${languages[0]}) and English. Use at least two local-language queries. Suggested local vocabulary: ${vocabulary}. Preserve source-language quotes verbatim; do not translate quote_text.`;
}

const RETAILER_BATCHES: Readonly<Record<string, readonly (readonly string[])[]>> = {
  ID: [["Alfamart", "Indomaret", "Alfamidi"], ["Mitra10", "MR.D.I.Y. Indonesia", "Guardian Indonesia"]],
  MY: [["99 Speed Mart", "7-Eleven Malaysia", "MR D.I.Y. Malaysia"], ["Watsons Malaysia", "KK Super Mart", "Guardian Malaysia"]],
  PH: [["7-Eleven Philippines", "Alfamart Philippines", "Puregold"], ["Mercury Drug", "Robinsons Retail", "Watsons Philippines"]],
  TH: [["7-Eleven Thailand / CP All", "Lotus's Thailand", "Big C Thailand"], ["CJ More", "Tops", "Watsons Thailand"]],
  VN: [["WinMart+", "Bach Hoa Xanh", "Circle K Vietnam"], ["Long Chau", "Pharmacity", "Guardian Vietnam"]],
  BR: [["AM/PM", "BR Mania", "Shell Select"], ["OXXO Brazil", "Carrefour Express", "Minuto Pão de Açúcar"]],
};

/** Topic-specific search instructions prevent nearby but semantically incompatible facts. */
export function topicResearchInstruction(topicCode: string, countryIso2: string): string {
  if (topicCode === "format_store_count") {
    const scope = FORMAT_SCOPE_BY_COUNTRY[countryIso2] ?? "one nationwide modern retail format";
    return `Find at least two actual historical observations about ${scope}, ideally around three years apart. Use the same nationwide format definition for every observation. Do not submit individual-chain counts, forecasts, or different formats as one series.`;
  }
  if (topicCode === "market_size") {
    return "Search national statistics or transparent market reports for a countrywide modern-chain outlet total and modern-trade sales share. Do not use an individual retailer, informal shops, all retail establishments, or a sub-format's internal share.";
  }
  if (topicCode === "market_growth") {
    return "Search for an explicitly stated country-level modern-retail CAGR or store-network growth rate. The quote must name the measured segment and period; do not substitute revenue growth for store growth.";
  }
  if (topicCode === "retailer_landscape") {
    return "A retailer count must count distinct chain companies/operators, not stores or establishments. Concentration must be the combined share of leading retailer groups in the national modern-retail market, not one company or one narrow format.";
  }
  if (topicCode.startsWith("retailer_foundations_")) {
    const batchIndex = topicCode.endsWith("_b") ? 1 : 0;
    const brazilHistoryInstruction = countryIso2 === "BR" && batchIndex === 0
      ? " Prioritize the official ABF 2022-2025 largest-franchise ranking tables. Extract both year columns for AM/PM, BR Mania, and Shell Select; use year-end observation dates and preserve the complete table row in each quote."
      : "";
    const targets = RETAILER_BATCHES[countryIso2]?.[batchIndex] ?? [];
    const targetInstruction = targets.length > 0
      ? `Research these target chains independently: ${targets.join(", ")}.`
      : batchIndex === 0
        ? "Identify and research the three largest qualified convenience, minimart, or small-format grocery chains in the country."
        : "Identify and research three additional qualified convenience, minimart, or small-format grocery chains not used in retailer_foundations_a.";
    return `${targetInstruction}${brazilHistoryInstruction} Find each retailer's actual total store count in this country at two dates, preferably latest and approximately three years earlier. Prioritize official annual reports, stock-exchange filings, and investor presentations. Every claim must set retailer_name to the exact chain name. Exclude opening plans, regional/global totals, franchise applications, and other countries.`;
  }
  if (topicCode === "retailer_expansion") {
    return "For openings, capture a named retailer's explicit new-store opening result or plan, not its total store base. For entrant activity, name concrete entrants in the quote or omit the classification.";
  }
  return "Submit only facts matching the predicate scope exactly; omit adjacent proxy facts rather than relabeling them.";
}
