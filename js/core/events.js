/**
 * Minimal event bus.
 *
 * Used for things the renderer must react to without a full state commit —
 * currently the timer tick, which patches the clock in place every 100ms.
 */

export function createBus() {
  const channels = new Map();

  return {
    on(type, handler) {
      if (!channels.has(type)) channels.set(type, new Set());
      channels.get(type).add(handler);
      return () => channels.get(type)?.delete(handler);
    },

    emit(type, payload) {
      const handlers = channels.get(type);
      if (!handlers) return;
      for (const handler of [...handlers]) handler(payload);
    },
  };
}
