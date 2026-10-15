const pending = new Map();
// A room's writes remain in arrival order while moderation awaits network responses.
// This queue is process-local; the deployment guide documents multi-instance limits.
export async function serializeRoom(room, operation) {
  const previous = pending.get(room) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  pending.set(room, current);
  try {
    return await current;
  } finally {
    if (pending.get(room) === current) pending.delete(room);
  }
}
