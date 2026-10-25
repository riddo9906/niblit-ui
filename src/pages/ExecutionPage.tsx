import { Link } from 'react-router-dom';
import SubsystemPanel from '../components/SubsystemPanel';
export default function ExecutionPage() {
 return <div><div className="quick-links"><Link to="/commands">Prepare a governed action</Link><Link to="/architecture">Inspect process ownership</Link></div><SubsystemPanel section="execution" title="Execution, services, and recent events" /></div>;
}
