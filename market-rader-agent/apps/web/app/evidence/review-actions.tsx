"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewActions({
  candidateId,
  candidateHash,
}: {
  candidateId: string;
  candidateHash: string;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject"): Promise<void> {
    setPending(action);
    setError(null);
    try {
      const response = await fetch(`/api/evidence-candidates/${candidateId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected_candidate_hash: candidateHash }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        setError(body.error?.message ?? "操作失败");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="review-actions">
      <button
        type="button"
        className="btn-ok"
        onClick={() => void decide("approve")}
        disabled={pending !== null}
      >
        {pending === "approve" ? "处理中…" : "通过"}
      </button>
      <button
        type="button"
        className="btn-danger"
        onClick={() => void decide("reject")}
        disabled={pending !== null}
      >
        {pending === "reject" ? "处理中…" : "拒绝"}
      </button>
      {error !== null && <span className="review-action-error">{error}</span>}
    </div>
  );
}
