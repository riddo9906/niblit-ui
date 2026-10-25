import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { RuntimeEvent } from '../types/runtime';
import { usePreferences } from '../lib/preferences';

const EventBusContext = createContext<{
  events: RuntimeEvent[];
  pushEvent: (event: RuntimeEvent) => void;
}>({
  events: [],
  pushEvent: () => undefined,
});

export function EventBusProvider({ children }: { children: ReactNode }) {
  const preferences = usePreferences();
  const [events, setEvents] = useState<RuntimeEvent[]>([]);

  const pushEvent = useCallback((event: RuntimeEvent) => {
    setEvents((current) => [event, ...current].slice(0, preferences.eventLimit));
  }, [preferences.eventLimit]);

  const value = useMemo(() => ({ events, pushEvent }), [events, pushEvent]);

  return <EventBusContext.Provider value={value}>{children}</EventBusContext.Provider>;
}

export function useEventBus() {
  return useContext(EventBusContext);
}

export function createRuntimeEvent(overrides: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'type' | 'source'>): RuntimeEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: Date.now(),
    payload: {},
    ...overrides,
  };
}
