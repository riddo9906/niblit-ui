import type { Dispatch, SetStateAction } from 'react';
import { createRuntimeEvent } from '../events/eventBus';
import type { LayerName } from '../types/runtime';

interface DemoConnectorOptions {
  pushEvent: (event: ReturnType<typeof createRuntimeEvent>) => void;
  setActiveLayer: Dispatch<SetStateAction<LayerName>>;
  setLayerStatus: Dispatch<SetStateAction<Record<LayerName, string>>>;
  setHeartbeat: Dispatch<SetStateAction<number>>;
}

export function startDemoRuntimeConnector({
  pushEvent,
  setActiveLayer,
  setLayerStatus,
  setHeartbeat,
}: DemoConnectorOptions) {
  const layers: LayerName[] = ['cognitive', 'inference', 'execution'];
  let index = 0;

  const intervalId = window.setInterval(() => {
    index = (index + 1) % layers.length;
    const nextLayer = layers[index];

    setActiveLayer(nextLayer);
    setLayerStatus((current) => ({
      ...current,
      [nextLayer]: current[nextLayer] === 'Healthy' ? 'Active' : 'Healthy',
    }));
    setHeartbeat((value) => value + 1);

    pushEvent(
      createRuntimeEvent({
        type: 'system.heartbeat',
        source: 'system',
        payload: { activeLayer: nextLayer, tick: index + 1 },
      }),
    );

    pushEvent(
      createRuntimeEvent({
        type: `${nextLayer}.signal`,
        source: nextLayer,
        payload: { activeLayer: nextLayer, confidence: 0.8 + index * 0.05 },
      }),
    );
  }, 1500);

  return () => window.clearInterval(intervalId);
}
