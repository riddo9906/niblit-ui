import { useRuntimeStore } from '../state/runtimeStore';
import { StatusDot, statusKind } from '../components/ui/StatusDot';
import { SectionHeader } from '../components/ui/States';

/**
 * Trading — governance view.
 * Renders only the runtime state Niblit actually reports (execution layer
 * status). Observe mode is a governance state; no execution controls exist.
 */
export default function TradingPage() {
  const { layerStatus } = useRuntimeStore();
  const kind = statusKind(layerStatus.execution);
  const stateLabel = layerStatus.execution || 'Unavailable';

  return (
    <div className="trading-page">
      <SectionHeader title="Trading Runtime" meta="Governed · port 8100" />
      <div className="ov-columns">
        <section>
          <SectionHeader title="Runtime State" />
          <div className="trade-state">
            <StatusDot kind={kind === 'idle' ? 'idle' : kind} label={stateLabel} pulse={kind === 'ok'} />
            <dl className="ov-kv">
              <div className="ov-kv__row"><dt>Backend</dt><dd><code>Paper</code></dd></div>
              <div className="ov-kv__row"><dt>Mode</dt><dd><code>OBSERVE</code></dd></div>
              <div className="ov-kv__row"><dt>Execution</dt><dd>DISABLED</dd></div>
            </dl>
          </div>
        </section>

        <section>
          <SectionHeader title="Governance" />
          <div className="ov-governance">
            <p className="ov-governance__note">
              Every order path remains behind DecisionValidator, RiskEngine and ExecutionCoordinator.
              This surface intentionally exposes no execution bypass: enabling live execution is a
              backend governance decision, not a UI toggle.
            </p>
          </div>
          <SectionHeader title="Market Data" />
          <p className="trade-note">Provider not reported by the current trading runtime API.</p>
        </section>
      </div>
    </div>
  );
}
