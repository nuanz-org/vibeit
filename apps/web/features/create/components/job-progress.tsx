"use client";

import type { JobStatusResponse } from "@/lib/api/jobs";

import styles from "../styles.module.css";

const PHASE_LABEL: Record<string, string> = {
  plan: "Planning",
  codegen: "Generating code",
  validate: "Validating",
  repair: "Repairing",
};

export function JobProgress({
  status,
  jobId,
}: {
  status: JobStatusResponse | undefined;
  jobId: string;
}) {
  const phase = status?.phase ?? null;
  const st = status?.status ?? "queued";

  return (
    <div className={styles.progressCard}>
      <div className={styles.progressHeader}>
        <span className={styles.progressTitle}>Generation</span>
        <span className={styles.progressStatus} data-status={st}>
          {st}
        </span>
      </div>
      <p className={styles.muted}>
        Job <code className={styles.code}>{jobId.slice(0, 8)}…</code>
        {phase ? (
          <>
            {" "}
            · {PHASE_LABEL[phase] ?? phase}
            {status?.repair && status.repair.repairsUsed > 0
              ? ` · repair ${status.repair.repairsUsed}/${status.repair.maxRepairs}`
              : null}
          </>
        ) : null}
      </p>
      {status?.quota ? (
        <p className={styles.muted}>
          Quota {status.quota.createsUsed}/{status.quota.createsLimit} today
        </p>
      ) : null}
      <div className={styles.progressBarTrack} aria-hidden>
        <div
          className={styles.progressBarFill}
          style={{
            width:
              st === "succeeded"
                ? "100%"
                : st === "failed"
                  ? "100%"
                  : st === "running"
                    ? "60%"
                    : "20%",
            opacity: st === "failed" ? 0.45 : 1,
          }}
        />
      </div>
    </div>
  );
}
