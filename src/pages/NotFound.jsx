import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Empty } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="page"><div className="container">
      <Empty icon={Compass} title="This page doesn’t exist" body="The link may be out of date. Head back home and continue from there.">
        <Link to="/home" className="btn primary">Go to Home</Link>
      </Empty>
    </div></div>
  );
}
