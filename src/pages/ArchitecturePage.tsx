import SubsystemPanel from '../components/SubsystemPanel';
export default function ArchitecturePage() {
 return <div><h1>Architecture</h1><p>Core governs lifecycle and memory. Cloud owns inference, Lean owns trading, and the desktop calls Core. Discovery, process status, and actual wiring checks are shown separately.</p><SubsystemPanel section="architecture" title="Repository, layer, and event connections" /></div>;
}
