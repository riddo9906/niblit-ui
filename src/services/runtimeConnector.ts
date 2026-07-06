import type { Dispatch, SetStateAction } from 'react';
import { USE_DEMO_CONNECTOR } from '../config/api';
import { createRuntimeEvent } from '../events/eventBus';
import type { LayerName } from '../types/runtime';
import {
  fetchCloudRuntimeStatus,
  fetchHealth,
  fetchRuntimeStatus,
  openRuntimeWebSocket,
} from './niblitApi';

interface ConnectorOptions {
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
}: ConnectorOptions) {
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
        payload: { activeLayer: nextLayer, tick: index + 1, demo: true },
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

function mapStatusToLayers(status: Record<string, unknown> | null): Partial<Record<LayerName, string>> {
  if (!status) {
    return {};
  }
  const mode = String(status.runtime_mode ?? status.status ?? 'unknown');
  const provider = String(status.active_provider ?? 'n/a');
  return {
    cognitive: mode === 'degraded' ? 'Degraded' : 'Healthy',
    inference: provider !== 'n/a' ? `Provider: ${provider}` : 'Bridge idle',
    execution: typeof status.threads === 'number' ? `${status.threads} threads` : 'Connected',
  };
}

export function startApiRuntimeConnector(options: ConnectorOptions): () => void {
  const cleanups: Array<() => void> = [];
  let heartbeat = 0;

  const pollStatus = async () => {
    const [runtimeStatus, cloudStatus] = await Promise.all([
      fetchRuntimeStatus(),
      fetchCloudRuntimeStatus(),
    ]);

    heartbeat += 1;
    options.setHeartbeat(heartbeat);

    const layerPatch = mapStatusToLayers(runtimeStatus);
    if (Object.keys(layerPatch).length > 0) {
      options.setLayerStatus((current) => ({ ...current, ...layerPatch }));
    }

    if (cloudStatus) {
      options.setLayerStatus((current) => ({
        ...current,
        inference: String(cloudStatus.mode ?? current.inference),
      }));
    }

    options.pushEvent(
      createRuntimeEvent({
        type: 'system.heartbeat',
        source: 'system',
        payload: {
          heartbeat,
          runtime: runtimeStatus,
          cloud: cloudStatus,
        },
      }),
    );
  };

  const pollId = window.setInterval(() => {
    void pollStatus();
  }, 3000);
  cleanups.push(() => window.clearInterval(pollId));
  void pollStatus();

  const closeSocket = openRuntimeWebSocket(
    (frame) => {
      const events = Array.isArray(frame.events) ? frame.events : [];
      for (const item of events) {
        if (!item || typeof item !== 'object') {
          continue;
        }
        const record = item as Record<string, unknown>;
        options.pushEvent(
          createRuntimeEvent({
            type: String(record.type ?? 'runtime.event'),
            source: 'cognitive',
            payload: record,
          }),
        );
      }
      const layer = String(frame.type ?? '');
      if (layer.includes('telemetry')) {
        options.setActiveLayer('cognitive');
      }
    },
    (message) => {
      options.pushEvent(
        createRuntimeEvent({
          type: 'runtime.warning',
          source: 'system',
          payload: { message },
        }),
      );
    },
  );
  cleanups.push(closeSocket);

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

export async function startRuntimeConnector(options: ConnectorOptions): Promise<() => void> {
  if (USE_DEMO_CONNECTOR) {
    return startDemoRuntimeConnector(options);
  }

  const healthy = await fetchHealth();
  if (!healthy) {
    options.pushEvent(
      createRuntimeEvent({
        type: 'runtime.warning',
        source: 'system',
        payload: {
          message: 'Niblit API unreachable — running demo connector. Set VITE_NIBLIT_API_URL.',
        },
      }),
    );
    return startDemoRuntimeConnector(options);
  }

  options.pushEvent(
    createRuntimeEvent({
      type: 'runtime.connected',
      source: 'system',
      payload: { transport: 'http+ws' },
    }),
  );

  return startApiRuntimeConnector(options);
}
