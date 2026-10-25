import type { Dispatch, SetStateAction } from 'react';
import { USE_DEMO_CONNECTOR } from '../config/api';
import { apiUrl } from '../config/api';
import { createRuntimeEvent } from '../events/eventBus';
import type { LayerName } from '../types/runtime';
import {
  fetchHealth,
  openRuntimeWebSocket,
} from './niblitApi';

interface ConnectorOptions {
  refreshMs?: number;
  liveUpdates?: boolean;
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

export function startApiRuntimeConnector(options: ConnectorOptions): () => void {
  const cleanups: Array<() => void> = [];
  let heartbeat = 0;
  let disposed = false;
  let polling = false;
  let controller = new AbortController();

  const pollStatus = async () => {
    if (disposed || polling) return;
    polling = true;
    controller = new AbortController();
    let snapshot: Record<string, any> | null = null;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(apiUrl('/api/desktop/overview'), { signal: controller.signal });
      if (response.ok) snapshot = await response.json();
    } catch { /* show disconnected state; never substitute simulated health */ }
    finally { window.clearTimeout(timeout); polling = false; }
    if (disposed) return;

    heartbeat += 1;
    options.setHeartbeat(heartbeat);

    options.setLayerStatus({
      cognitive: snapshot?.core_available ? String(snapshot.core?.status || 'Unknown') : 'Unavailable',
      inference: snapshot?.cloud?.available ? String(snapshot.cloud.data?.status || 'Connected') : 'Unavailable',
      execution: snapshot?.trading?.available ? String(snapshot.trading.data?.state || 'Unknown') : 'Unavailable',
    });

    options.pushEvent(
      createRuntimeEvent({
        type: 'system.heartbeat',
        source: 'system',
        payload: {
          heartbeat,
          snapshot,
        },
      }),
    );
  };

  const pollId = window.setInterval(() => {
    void pollStatus();
  }, options.refreshMs ?? 10000);
  cleanups.push(() => window.clearInterval(pollId));
  if (options.liveUpdates === false) window.clearInterval(pollId);
  void pollStatus();

  const closeSocket = options.liveUpdates === false ? () => undefined : openRuntimeWebSocket(
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
    disposed = true;
    controller.abort();
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
          message: 'Core is not connected. Check the Core address in Settings and use Test connection.',
        },
      }),
    );
    return startApiRuntimeConnector(options);
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
