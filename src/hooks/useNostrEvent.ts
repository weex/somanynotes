import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export function useNostrEvent(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-event', eventId],
    queryFn: async (c) => {
      if (!eventId) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{ ids: [eventId] }], { signal });

      return events[0] || null;
    },
    enabled: !!eventId,
  });
}