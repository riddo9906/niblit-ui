import { Link } from 'react-router-dom';
import SubsystemPanel from '../components/SubsystemPanel';
export default function InferencePage() {
 return <div><div className="quick-links"><Link to="/chat?mode=inference">Test a model in chat</Link><Link to="/settings">Generation preferences</Link></div><SubsystemPanel section="inference" title="Models and inference runtime" /></div>;
}
