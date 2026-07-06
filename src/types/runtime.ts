export type LayerName = 'cognitive' | 'inference' | 'execution';
export type EventSource = 'cognitive' | 'inference' | 'execution' | 'system';

export interface RuntimeEvent {
  id: string;
  type: string;
  source: EventSource;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface LayerSummary {
  name: LayerName;
  title: string;
  description: string;
  accent: string;
}

export interface RuntimeSnapshot {
  activeLayer: LayerName;
  layerStatus: Record<LayerName, string>;
  events: RuntimeEvent[];
}
