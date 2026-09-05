# Pi Agent Research Provider

The Research Worker can use the local Pi model authentication and the installed `parallel-search` MCP server.

## Enable

1. Confirm Pi is authenticated and `parallel-search` is configured in one of Pi MCP's standard config files (for example `~/.config/mcp/mcp.json`).
2. Set:

```dotenv
SEARCH_PROVIDER=pi-agent
PI_AGENT_TIMEOUT_MS=300000
PI_AGENT_THINKING_LEVEL=low
AGENT_CHAT_THINKING_LEVEL=minimal
WORKER_CONCURRENCY=3
```

When the machine uses `HTTP_PROXY`, `HTTPS_PROXY`, or `ALL_PROXY`, start the Worker with `NODE_USE_ENV_PROXY=1`. The repository's Worker `dev` and `start` scripts enable this for Node 24 automatically.

Use `SEARCH_PROVIDER=fixture` for deterministic offline tests and replay. A live `pi-agent` Research Scan does not import the Fixture baseline.

## Regional scenarios

The Web region selector is backed by immutable Scenario Revisions rather than a display-only filter. `config/regions.v2.json` defines four five-country scopes: Southeast Asia, Middle East, Latin America, and North Africa. `config/countries.v1.json` provides the corresponding 20 country records and research languages. Each revision freezes its region-specific Metric Definition Set, Reference Set, and Scoring Model IDs. The three new regions use independent configurations that transparently inherit shared SEA anchors and are marked `shared_baseline`. Product has approved using this baseline without forcing otherwise publishable country scores to `provisional`; the benchmark provenance remains visible. A scan request carries either `region_code` or an explicit `scenario_revision_id`, never both; the Research Plan creates jobs only for countries frozen in that revision. Rankings, task runs, review queues, and verified evidence are scoped to the selected region and never fall back to another region when no result exists.

To remove an existing Fixture baseline and all scores derived from it, while retaining live Pi candidates, run:

```bash
pnpm data:clear-fixture
```

The command creates an online SQLite backup under `BACKUP_DIR` before deleting anything. Historical runs whose derived values were cleared are marked `stale`.

## Safety and provenance

The Worker processes up to `WORKER_CONCURRENCY` independently leased jobs in parallel. Each research job creates its own in-memory Pi SDK session. Research Policy `1.7.0` plans both English and configured local-language searches (`id`, `ms`, `fil`, `th`, `vi`, `ar`, `es`, `pt`, `fr`) and requires at least two local-language queries within each live Pi research job; submitted quotations remain verbatim in the source language. It disables project context and all filesystem/shell tools. It loads only these Search Skills from the local Pi installation:

- `mcp-scripting`
- `research`
- `retail-news-scraper`

Their content is injected as search methodology and source-selection guidance. Instructions inside those Skills that require sub-agents, file writes, scripts, or unavailable tools are explicitly disabled for the Worker.

The model can call only:

- `parallel-search_web_search`
- `parallel-search_web_fetch`
- `submit_market_research`, a typed terminal submission tool

Submitted claims require a predicate and observation date from the frozen research plan, an HTTP(S) URL, a valid structured value/unit, and an exact quote from the submitted source excerpt. The active high-recall policy keeps only minimum machine-grounding failures hard: a disallowed predicate, malformed value/unit/date, non-HTTP(S) URL, quote absent from the submitted excerpt, observation outside the Scenario window, missing retailer identity, or a numeric value absent from the quote. Country/scope/year/format/total wording, regulatory classification, conflicts, and indirect retail signals are advisory. Advisory claims are automatically persisted as valid Candidates and Verified Claims with `verification_method=auto_low_precision`, quality capped at 40%, and their warnings retained for audit. No human approval is required.

Pi evidence is persisted with `provider=pi-agent`, the extractor model, source domain, and source metadata. Scoring Model `1.2.0` uses a 20% dimension-display coverage gate and a 60% country-level overall coverage gate for the high-recall workflow; available indicators are deterministically renormalized and missing indicators are never filled with zero. Country results that use `auto_low_precision` claims may publish when deterministic coverage and blocker gates pass; Claim-level low-precision provenance and quality caps remain visible. A technically successful job that produces no Candidate is surfaced as `insufficient_evidence` rather than an ordinary successful job in the Tasks UI. Legacy `review_required` candidates remain available for audit, but new regulatory, blocker, semantic-warning, and same-period conflict candidates follow the low-precision automatic verification policy; conflicts remain separate Claim records rather than being silently overwritten. Research-plan reuse is provider-isolated and respects each topic's minimum Claim count. Retailer-foundation work is reused only after at least three qualified retailers have an actual observation pair spanning 2.5–3.5 years; adjacent annual observations no longer suppress historical research. Pi score runs read only Pi snapshots and can never consume Fixture claims.

To apply the latest deterministic contracts to existing active Pi Claims, create a backup, deactivate failures, and recompute the latest completed Pi Scan, run:

```bash
pnpm data:revalidate-evidence
```

## Conversational Agent

When `SEARCH_PROVIDER=pi-agent`, the Web Agent uses a separate bounded Pi session for natural multi-turn dialogue. Chat latency is controlled independently by `AGENT_CHAT_THINKING_LEVEL` (default `minimal`), while research keeps `PI_AGENT_THINKING_LEVEL`. It has only persisted ranking, country comparison/detail, metric explanation, evidence lookup, scan-status lookup, and a grounded-answer submission tool. It has no filesystem, shell, browser, web-search, mutation, forecasting, or scenario-simulation tools. Market facts must cite facts returned during the current turn; if Pi is unavailable, a deterministic read-only fallback remains available. Web development and production scripts enable `NODE_USE_ENV_PROXY=1` so local Pi authentication works through the configured proxy.

## Deterministic derived metrics

The model never invents a score or unsupported number. Metrics that are not normally published as direct facts are calculated by `engine-1.4.0` from Verified Claims using the versioned `derived-retail-v1` rules:

- qualified retailer count: direct country total, otherwise the number of distinct named retailers whose latest verified actual count is at least 500 stores; at least three retailers are required;
- qualified/addressable store base: direct country total, otherwise the sum of the latest verified actual counts for at least three 500+ store retailers;
- format/store growth: direct country series, otherwise a latest-store-count-weighted CAGR across at least three named retailers with matching periods;
- estimated ACV: direct value, otherwise qualified customer count × USD 0.15m midpoint; when customer count is unavailable, addressable stores ÷ 500 stores per ideal customer;
- competition intensity: deterministic interpolation of qualified retailer count and top-customer concentration;
- localization sales friction: partner availability mapped as `none=5`, `limited=3`, `strong=1`;
- expanding retailer share: distinct positive opening-announcement origin clusters ÷ qualified retailer count, treated as a lower-bound proxy.

The `retailer_foundations_a` and `retailer_foundations_b` research topics split each country's named target retailers into independent batches, with up to six focused queries and six documents per batch. They collect named-retailer actual store counts from official annual reports and exchange filings. Each Claim carries a normalized retailer identity, and the pipeline also writes a retailer observation record. Opening plans never qualify as actual store counts.

Growth research uses a `2022-01-01` baseline so the latest complete 2025 annual reports can support a true three-year CAGR. For annual retailer growth, the engine selects the latest observation pair within the configured 0.75–1.5 year interval instead of incorrectly comparing the absolute oldest and newest observations.

Every derived Metric Value links to all input Claims and exposes its aggregation method, configuration, and calculation version through the metric explanation API. Derived values may improve coverage but do not bypass overall, critical-dimension, review, or Hard Blocker gates.
