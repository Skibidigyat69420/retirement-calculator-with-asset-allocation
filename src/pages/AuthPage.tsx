import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, FileText, ShieldCheck, Users } from 'lucide-react';
import { LogoMark } from '../components/layout/BrandMark';

export function AuthPage({ onEnter }: { onEnter: () => void }) {
  const navigate = useNavigate();
  const enterWorkspace = () => {
    onEnter();
    navigate('/');
  };

  return (
    <main className="auth-page">
      <header className="auth-simple-header"><Link to="/" className="auth-brand"><LogoMark size={30} /><span>Sound Thesis</span></Link><span>Advisor workspace</span></header>
      <section className="auth-simple-layout">
        <aside className="auth-simple-intro">
          <span className="eyebrow">A practical client workspace</span>
          <h1>Make client work easier to run.</h1>
          <p>Start with the client, create a clear Investment Policy Statement, and keep every decision in one place.</p>
          <ul className="auth-product-list">
            <li><Users size={17} /><span><strong>Clients</strong><small>Search and manage each household.</small></span></li>
            <li><FileText size={17} /><span><strong>Investment policy</strong><small>Generate a policy from the essential facts.</small></span></li>
            <li><ClipboardList size={17} /><span><strong>Review</strong><small>Return to the plan when decisions change.</small></span></li>
          </ul>
        </aside>
        <section className="auth-panel">
          <div className="auth-form-wrap">
            <div className="auth-form-heading"><span className="eyebrow">Advisor workspace</span><h2>Ready when you are.</h2><p>No account, password, or setup sequence. Open the workspace and start with a client.</p></div>
            <button className="auth-submit" type="button" onClick={enterWorkspace}>Enter workspace <ArrowRight size={17} /></button>
            <div className="auth-security"><ShieldCheck size={14} /><span>Your plan stays in this browser until you choose to connect a data source.</span></div>
          </div>
        </section>
      </section>
      <footer className="auth-simple-footer"><span>© 2026 Sound Thesis</span><span>Private practice software</span></footer>
    </main>
  );
}
