(function () {
  const eventTypes = ["run_created", "agent_start", "tool_start", "tool_progress", "tool_end", "message_delta", "run_complete", "run_error"];
  const targetByCountry = {
    chile: { regionId: "south-america", customerId: "cencosud", customerName: "Cencosud" },
    argentina: { regionId: "south-america", customerId: "cencosud", customerName: "Cencosud" },
    peru: { regionId: "south-america", customerId: "cencosud", customerName: "Cencosud" },
    colombia: { regionId: "south-america", customerId: "cencosud", customerName: "Cencosud" },
    canada: { regionId: "canada", customerId: "loblaw", customerName: "Loblaw Companies Limited" },
    usa: { regionId: "south-america", customerId: "cencosud", customerName: "Cencosud" },
    australia: { regionId: "oceania", customerId: "sigma-chemist", customerName: "Sigma Healthcare / Chemist Warehouse" },
    new_zealand: { regionId: "oceania", customerId: "sigma-chemist", customerName: "Sigma Healthcare / Chemist Warehouse" },
    ireland: { regionId: "oceania", customerId: "sigma-chemist", customerName: "Sigma Healthcare / Chemist Warehouse" },
    uae: { regionId: "oceania", customerId: "sigma-chemist", customerName: "Sigma Healthcare / Chemist Warehouse" },
    china: { regionId: "oceania", customerId: "sigma-chemist", customerName: "Sigma Healthcare / Chemist Warehouse" },
    brazil: { regionId: "south-america", customerId: "cencosud", customerName: "Cencosud" }
  };

  async function readJson(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Agent API request failed (${response.status})`);
    return body;
  }

  async function health() {
    return readJson(await fetch("/api/health", { headers: { Accept: "application/json" } }));
  }

  async function catalog() {
    return readJson(await fetch("/api/catalog", { headers: { Accept: "application/json" } }));
  }

  async function startRun({ regionId, customerId, mode = "auto", onEvent }) {
    const created = await readJson(await fetch("/api/agent/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ regionId, customerId, mode })
    }));

    return new Promise((resolve, reject) => {
      const source = new EventSource(created.eventsUrl);
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        source.close();
        fn(value);
      };
      eventTypes.forEach((type) => {
        source.addEventListener(type, (raw) => {
          let event;
          try { event = JSON.parse(raw.data); }
          catch { return; }
          onEvent?.(event);
          if (event.type === "run_complete") finish(resolve, event.data);
          if (event.type === "run_error") finish(reject, new Error(event.message || "Agent run failed"));
        });
      });
      source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) finish(reject, new Error("Agent event stream disconnected"));
      };
    });
  }

  function targetForCountry(countryId) {
    return targetByCountry[countryId] || null;
  }

  Object.assign(window, { AgentApi: { health, catalog, startRun, targetForCountry, targetByCountry } });
})();
