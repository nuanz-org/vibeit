/**
 * Errors thrown by RuntimeHostBridge (timeouts, protocol, frame errors).
 */

import type { RuntimeErrorCode } from "../contract/errors";
import { RUNTIME_ERROR_CODES } from "../contract/errors";
import type { RuntimeRequestId } from "../contract/messages";

export class RuntimeBridgeError extends Error {
  readonly code: RuntimeErrorCode;
  readonly requestId?: RuntimeRequestId;
  readonly details?: unknown;

  constructor(
    code: RuntimeErrorCode,
    message: string,
    options?: {
      requestId?: RuntimeRequestId;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "RuntimeBridgeError";
    this.code = code;
    this.requestId = options?.requestId;
    this.details = options?.details;
  }

  static fromFrameError(input: {
    code: RuntimeErrorCode;
    message: string;
    requestId?: RuntimeRequestId;
    details?: unknown;
  }): RuntimeBridgeError {
    return new RuntimeBridgeError(input.code, input.message, {
      requestId: input.requestId,
      details: input.details,
    });
  }

  static timeout(
    kind: "ready" | "command",
    timeoutMs: number,
    requestId?: RuntimeRequestId,
  ): RuntimeBridgeError {
    if (kind === "ready") {
      return new RuntimeBridgeError(
        RUNTIME_ERROR_CODES.NOT_READY,
        `Timed out waiting for runtime frame ready after ${timeoutMs}ms`,
        { details: { timeoutMs } },
      );
    }
    return new RuntimeBridgeError(
      RUNTIME_ERROR_CODES.UNKNOWN,
      `Timed out waiting for runtime command response after ${timeoutMs}ms`,
      { requestId, details: { timeoutMs } },
    );
  }
}
