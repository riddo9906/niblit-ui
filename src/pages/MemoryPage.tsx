import { Link } from 'react-router-dom';
import SubsystemPanel from '../components/SubsystemPanel';
export default function MemoryPage() {
 return <div><div className="quick-links"><Link to="/commands?q=knowledge">Knowledge commands</Link><Link to="/chat?prompt=What%20do%20you%20remember%20about%20our%20project%3F">Ask about memory</Link></div><SubsystemPanel section="memory" title="Knowledge and conversation memory" queryable /></div>;
}
