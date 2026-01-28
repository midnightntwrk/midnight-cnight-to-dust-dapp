/**
 * Browser polyfills for Node.js built-ins
 * This file must be imported at the very top of client-side entry points
 * BEFORE any libraries that depend on Buffer (like @lucid-evolution/lucid, bech32, etc.)
 */
import { Buffer } from 'buffer';

// Polyfill Buffer for browser environments
// This is needed for @lucid-evolution/lucid and bech32m libraries
if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

// Also set on window for legacy compatibility
if (typeof window !== 'undefined' && !window.Buffer) {
  (window as typeof globalThis).Buffer = Buffer;
}

export {};
