import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useEventBus } from '../events/eventBus';
import { startDemoRuntimeConnector } from '../services/runtimeConnector';
import type { LayerName, RuntimeEvent } from '../types/runtime';

interface RuntimeStoreValue {
  activeLayer: LayerName;
  events: RuntimeEvent[];
  heartbeat: number;
  layerStatus: Record<LayerName, string>;
  setActiveLayer: (layer: LayerName) => void;
  setLayerStatus: (layer: LayerName, value: string) => void;
}

const layerStatusSeed: Record<LayerName, string> = {
  cognitive: 'Healthy',
  inference: 'Bridge active',
  execution: 'Connected',
};

const RuntimeStoreContext = createContext<RuntimeStoreValue>({
  activeLayer: 'cognitive',
  events: [],
  heartbeat: 0,
  layerStatus: layerStatusSeed,
  setActiveLayer: () => undefined,
  setLayerStatus: () => undefined,
});

export function RuntimeStoreProvider({ children }: { children: ReactNode }) {
  const { events, pushEvent } = useEventBus();
  const [activeLayer, setActiveLayer] = useState<LayerName>('cognitive');
  const [heartbeat, setHeartbeat] = useState(0);
  const [layerStatus, setLayerStatusState] = useState<Record<LayerName, string>>(layerStatusSeed);

  useEffect(() => {
    return startDemoRuntimeConnector({
      pushEvent,
      setActiveLayer,
      setLayerStatus: setLayerStatusState,
      setHeartbeat,
    });
  }, [pushEvent]);

  const value = useMemo<RuntimeStoreValue>(() => ({
    activeLayer,
    events,
    heartbeat,
    layerStatus,
    setActiveLayer,
    setLayerStatus: (layer, value) => {
      setLayerStatusState((current) => ({ ...current, [layer]: value }));
    },
  }), [activeLayer, events, heartbeat, layerStatus]);

  return <RuntimeStoreContext.Provider value={value}>{children}</RuntimeStoreContext.Provider>;
}

export function useRuntimeStore() {
  return useContext(RuntimeStoreContext);
}
