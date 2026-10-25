import { Link } from 'react-router-dom';
import SubsystemPanel from '../components/SubsystemPanel';
export default function OverviewPage() {
 return <div className="overview-page"><h1>Niblit runtime</h1><p>Live state from the governing Core and its connected services.</p>
 <div className="quick-links"><Link to="/chat">Open conversation</Link><Link to="/architecture">Inspect architecture</Link><Link to="/commands">Browse commands</Link><Link to="/settings">Connection and settings</Link></div>
 <SubsystemPanel section="overview" title="System overview" /></div>;
}
