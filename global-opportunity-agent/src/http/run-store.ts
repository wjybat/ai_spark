import { randomUUID } from "node:crypto";
import { runOpportunityPipeline } from "../agent/orchestrator.js";
import { customerById, regionById } from "../data/knowledge.js";
import type { PipelineEvent, PipelineOutput } from "../types/domain.js";

export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface RunRecord {
  id: string;
  regionId: string;
  customerId: string;
  countryId?: string;
  countryName?: string;
  requestedMode: "auto" | "demo" | "live";
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  events: PipelineEvent[];
  output?: PipelineOutput;
  error?: string;
}

type Listener = (event: PipelineEvent) => void;

export class RunStore {
  private readonly runs = new Map<string, RunRecord>();
  private readonly listeners = new Map<string, Set<Listener>>();

  create(input: { regionId: string; customerId: string; countryId?: string; countryName?: string; mode?: "auto" | "demo" | "live" }): RunRecord {
    const region = regionById.get(input.regionId);
    if (!region) throw new Error(`Unknown region: ${input.regionId}`);
    const customer = customerById.get(input.customerId);
    if (!customer) throw new Error(`Unknown customer: ${input.customerId}`);
    if (input.regionId !== "global" && !region.customerIds.includes(input.customerId)) {
      throw new Error(`Customer ${input.customerId} is not in region ${input.regionId}`);
    }
    if (Boolean(input.countryId) !== Boolean(input.countryName)) throw new Error("countryId and countryName must be provided together");
    if (input.countryName && !customer.countries.includes(input.countryName)) throw new Error(`Customer ${input.customerId} is not known in country ${input.countryName}`);
    if (input.countryId && !/^[a-z][a-z0-9_-]*$/.test(input.countryId)) throw new Error("countryId has an invalid format");
    const now = new Date().toISOString();
    const record: RunRecord = {
      id: randomUUID(),
      regionId: input.regionId,
      customerId: input.customerId,
      ...(input.countryId ? { countryId: input.countryId } : {}),
      ...(input.countryName ? { countryName: input.countryName } : {}),
      requestedMode: input.mode ?? "auto",
      status: "queued",
      createdAt: now,
      updatedAt: now,
      events: [],
    };
    this.runs.set(record.id, record);
    this.push(record.id, { runId: record.id, type: "run_created", timestamp: now, message: "run accepted" });
    return record;
  }

  get(id: string): RunRecord | undefined {
    return this.runs.get(id);
  }

  subscribe(id: string, listener: Listener): () => void {
    const run = this.runs.get(id);
    if (!run) throw new Error(`Unknown run: ${id}`);
    for (const event of run.events) listener(event);
    if (run.status === "completed" || run.status === "failed") return () => undefined;
    const set = this.listeners.get(id) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(id, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(id);
    };
  }

  start(id: string): void {
    const run = this.runs.get(id);
    if (!run) throw new Error(`Unknown run: ${id}`);
    if (run.status !== "queued") throw new Error(`Run ${id} is already ${run.status}`);
    run.status = "running";
    run.updatedAt = new Date().toISOString();
    void runOpportunityPipeline(
      {
        runId: run.id,
        regionId: run.regionId,
        customerId: run.customerId,
        ...(run.countryId ? { countryId: run.countryId } : {}),
        ...(run.countryName ? { countryName: run.countryName } : {}),
        mode: run.requestedMode,
      },
      async (event) => this.push(id, event),
    )
      .then((output) => {
        run.output = output;
        run.status = "completed";
        run.updatedAt = new Date().toISOString();
        this.push(id, {
          runId: id,
          type: "run_complete",
          timestamp: run.updatedAt,
          stage: 9,
          message: output.finalNarrative,
          data: output,
        });
        this.listeners.delete(id);
      })
      .catch((error: unknown) => {
        run.error = error instanceof Error ? error.message : String(error);
        run.status = "failed";
        run.updatedAt = new Date().toISOString();
        this.push(id, { runId: id, type: "run_error", timestamp: run.updatedAt, message: run.error });
        this.listeners.delete(id);
      });
  }

  private push(id: string, event: Omit<PipelineEvent, "id">): void {
    const run = this.runs.get(id);
    if (!run) return;
    const next: PipelineEvent = { ...event, id: run.events.length + 1 };
    run.events.push(next);
    run.updatedAt = next.timestamp;
    for (const listener of this.listeners.get(id) ?? []) listener(next);
  }
}
