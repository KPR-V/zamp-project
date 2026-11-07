import { EventEmitter } from 'events';
import type { RunState } from './types';

// Global singleton EventEmitter across Route Handlers in the same Node.js runtime
declare global {
  // eslint-disable-next-line no-var
  var __vendorEvents: EventEmitter | undefined;
}

export const vendorEvents: EventEmitter = global.__vendorEvents || new EventEmitter();

// Increase max listeners to prevent warnings with multiple SSE dashboard tabs
vendorEvents.setMaxListeners(50);

if (process.env.NODE_ENV !== 'production' || !global.__vendorEvents) {
  global.__vendorEvents = vendorEvents;
}

export type VendorEventType = 'new_submission' | 'step_progress' | 'run_complete';

export interface VendorEventPayload {
  type: VendorEventType;
  state: RunState;
  isExternal?: boolean;
}

export function emitVendorEvent(type: VendorEventType, state: RunState, isExternal = true): void {
  const payload: VendorEventPayload = { type, state, isExternal };
  vendorEvents.emit(type, payload);
  vendorEvents.emit('all', payload);
}

