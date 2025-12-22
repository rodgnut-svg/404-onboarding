/**
 * Debug logging utility that can be toggled via environment variables.
 * 
 * Enable debug logging by setting either:
 * - NEXT_PUBLIC_DEBUG=true (available in browser and server)
 * - DEBUG=true (server-only)
 */
export const DEBUG =
  process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.DEBUG === "true";

/**
 * Debug log function that only logs when DEBUG is enabled.
 * Usage: dlog("message", variable1, variable2, ...)
 */
export function dlog(...args: any[]): void {
  if (DEBUG) {
    console.log("[DEBUG]", ...args);
  }
}
