import { Link } from 'react-router-dom';
import SubsystemPanel from '../components/SubsystemPanel';
export default function CognitivePage() {
 return <div><div className="quick-links"><Link to="/architecture">Inspect layer connections</Link><Link to="/commands?q=cognition">Find cognitive commands</Link></div><SubsystemPanel section="cognitive" title="Cognitive runtime and readiness" /></div>;
}
