# `@repo/contracts`

Shared TypeScript contracts for Vibeit (M0-thin).

| Artifact | Location |
|----------|----------|
| **TS source of truth** | this package (`src/`) |
| **Human docs** | `md/contracts/` |

## Surface

| Slice | Contents |
|-------|----------|
| **M0a** | `VibeTool`, `ToolParams`, `ToolAssets`, `MountOptions` |
| **M0b** | `ParamField` kinds, `ParamSchema`, `AssetSlot` / `AssetSlots` |
| **M0c** | `TargetId`, `TARGET_REGISTRY`, canvas2d skeleton harness |
| **M0d** | `ToolPlan`, `AsapToolPlan`, `createAsapToolPlan` |
| **M0e** | Job DTOs: create / status / result / quota / errors |
| **M0f** | Capture MIME, `crossOrigin`, provisional storage CORS |

```ts
import type {
  VibeTool,
  ToolPlan,
  CreateJobRequest,
  JobStatusResponse,
} from "@repo/contracts";
import {
  ASAP_TARGET,
  ASSET_CROSS_ORIGIN,
  PROVISIONAL_STORAGE_CORS,
  createAsapToolPlan,
  isTerminalJobStatus,
  jobMayBecomePublished,
} from "@repo/contracts";
import { createTool } from "@repo/contracts/skeletons/canvas2d";
```

## Scripts

```bash
pnpm --filter @repo/contracts check-types
pnpm --filter @repo/contracts lint
```
