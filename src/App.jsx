import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './lib/store.jsx';
import { useAuth } from './lib/auth.jsx';
import Auth from './pages/Auth.jsx';
import { ForgotPassword, ResetPassword } from './pages/PasswordReset.jsx';
import { Spinner } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Opportunities from './pages/Opportunities.jsx';
import OpportunityDetail from './pages/OpportunityDetail.jsx';
import Documents from './pages/Documents.jsx';
import Applications from './pages/Applications.jsx';
import ApplicationWorkspace from './pages/ApplicationWorkspace.jsx';
import Essays from './pages/Essays.jsx';
import EssayBuilder from './pages/EssayBuilder.jsx';
import CVBuilder from './pages/CVBuilder.jsx';
import CourseIntel from './pages/CourseIntel.jsx';
import GuidePage from './pages/GuidePage.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';

function Loading() {
  return <div className="boot" role="status"><Spinner size={26} /><span>Loading your Horizon…</span></div>;
}

// Signed-in students only. Waits for the account's saved data before deciding where to go.
function RequireAccount({ children, needsProfile = true }) {
  const { status } = useAuth();
  const { state, ready } = useStore();
  const loc = useLocation();
  if (status === 'loading' || (status === 'in' && !ready)) return <Loading />;
  if (status !== 'in') return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (needsProfile && !state.profile) return <Navigate to="/start" replace />;
  return children;
}

const TITLES = { '/': 'Horizon — Build early. Apply with confidence.', '/signin': 'Sign in', '/signup': 'Create your account', '/forgot-password': 'Forgot password', '/reset-password': 'Reset password', '/start': 'Build your Horizon', '/home': 'Home', '/roadmap': 'My Roadmap', '/opportunities': 'Find Opportunities', '/documents': 'My Documents', '/applications': 'Applications', '/cv': 'CV builder', '/essays': 'Essays & statements', '/learn': 'Course Intelligence', '/profile': 'Profile' };

export default function App() {
  const loc = useLocation();
  useEffect(() => {
    const base = '/' + (loc.pathname.split('/')[1] || '');
    const t = TITLES[loc.pathname] || TITLES[base];
    document.title = loc.pathname === '/' ? TITLES['/'] : `${t || 'Horizon'} · Horizon`;
  }, [loc.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<Auth mode="signin" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/start" element={<RequireAccount needsProfile={false}><Onboarding /></RequireAccount>} />
      <Route element={<RequireAccount><Layout /></RequireAccount>}>
        <Route path="/home" element={<Dashboard />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/opportunities/:id" element={<OpportunityDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/:id" element={<ApplicationWorkspace />} />
        <Route path="/essays" element={<Essays />} />
        <Route path="/essays/:id" element={<EssayBuilder />} />
        <Route path="/cv" element={<CVBuilder />} />
        <Route path="/learn" element={<CourseIntel />} />
        <Route path="/learn/:slug" element={<GuidePage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
