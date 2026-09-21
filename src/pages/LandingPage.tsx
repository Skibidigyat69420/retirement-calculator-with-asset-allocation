import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { animate, createScope, stagger } from 'animejs';
import { ArrowRight, ChartNoAxesCombined, FileText, Gauge, ShieldCheck } from 'lucide-react';
import { LogoMark } from '../components/layout/BrandMark';

const proofRows = [
  ['01', 'Native inputs', 'Record assets, income, debt and goals in their actual currencies.'],
  ['02', 'INR truth layer', 'Normalize the complete household before allocation and risk comparisons.'],
  ['03', 'Decision output', 'Solve backwards, compare pathways and print the dossier as a slide deck.'],
];

const capabilities = [
  { icon: ChartNoAxesCombined, code: 'ALLOC/01', title: 'Allocation X-ray', copy: 'Current, target and projected exposures on one comparable INR base.' },
  { icon: Gauge, code: 'RISK/02', title: 'Risk anatomy', copy: 'Capacity, tolerance, drawdown and goal confidence shown without decorative noise.' },
  { icon: FileText, code: 'DOSSIER/03', title: 'Meeting-grade output', copy: 'A live web dossier that exports directly into a clean 16:9 PDF deck.' },
  { icon: ShieldCheck, code: 'PLAN/04', title: 'Reverse planning', copy: 'Solve the SIP, capital, return or retirement-age lever that actually closes the gap.' },
];

export function LandingPage() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
    }).add((self) => {
      const reduceMotion = self?.matches.reduceMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reduceMotion ? 0 : 720;
      animate('.landing-nav, .landing-hero .landing-reveal', {
        opacity: [0, 1],
        y: reduceMotion ? 0 : [24, 0],
        delay: stagger(reduceMotion ? 0 : 70),
        duration,
        ease: 'out(4)',
      });
      animate('.landing-word', {
        opacity: [0, 1],
        x: reduceMotion ? 0 : [-34, 0],
        delay: stagger(reduceMotion ? 0 : 90, { start: reduceMotion ? 0 : 120 }),
        duration: reduceMotion ? 0 : 860,
        ease: 'out(4)',
      });
      animate('.landing-bars i', {
        scaleY: [0, 1],
        delay: stagger(reduceMotion ? 0 : 42, { from: 'center', start: reduceMotion ? 0 : 420 }),
        duration: reduceMotion ? 0 : 780,
        ease: 'out(4)',
      });
      animate('.landing-proof article, .landing-section-head, .landing-capability-grid article, .landing-final', {
        opacity: [0, 1],
        y: reduceMotion ? 0 : [18, 0],
        delay: reduceMotion ? 0 : 260,
        duration,
        ease: 'out(4)',
      });
      animate('.landing-rule-fill', {
        scaleX: [0, 1],
        duration: reduceMotion ? 0 : 1100,
        delay: reduceMotion ? 0 : 240,
        ease: 'inOut(3)',
      });
      if (!reduceMotion) {
        animate('.landing-scanner', {
          x: ['-110%', '110%'],
          duration: 5200,
          ease: 'linear',
          loop: true,
        });
      }
    });
    return () => scope.revert();
  }, []);

  return (
    <main ref={root} className="landing-page">
      <nav className="landing-nav landing-reveal" aria-label="Primary navigation">
        <Link to="/" className="landing-brand"><LogoMark size={30} /><span>Sound Thesis</span></Link>
        <div className="landing-nav-meta"><span>WEALTH OPERATING SYSTEM</span><span>INR BASE / GLOBAL INPUTS</span></div>
        <Link to="/login" className="landing-login">Enter workspace <ArrowRight size={15} /></Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-index landing-reveal">PRIVATE WEALTH / DECISION INTELLIGENCE / 2026</p>
          <h1><span className="landing-word">WEALTH,</span><br /><span className="landing-word">MADE</span><br /><span className="landing-word landing-word-outline">LEGIBLE.</span></h1>
          <div className="landing-rule"><i className="landing-rule-fill" /></div>
          <div className="landing-hero-bottom landing-reveal">
            <p>A rigorous planning workspace for advisers who need every currency, every allocation and every trade-off to resolve into one comparable truth.</p>
            <Link to="/login" className="landing-cta">Open the system <ArrowRight size={18} /></Link>
          </div>
        </div>

        <div className="landing-terminal landing-reveal" aria-label="Illustrative portfolio intelligence panel">
          <div className="landing-terminal-head"><span>ST / HOUSEHOLD_001</span><span>LIVE MODEL</span></div>
          <div className="landing-terminal-value"><span>NET POSITION / INR</span><strong>₹12.84CR</strong><small>ALL NATIVE INPUTS NORMALIZED</small></div>
          <div className="landing-terminal-grid">
            <div><span>ALLOCATION DRIFT</span><strong>08.4%</strong></div><div><span>PLAN CONFIDENCE</span><strong>82%</strong></div>
            <div><span>REQUIRED SIP</span><strong>₹1.42L</strong></div><div><span>RISK BAND</span><strong>R4 / 05</strong></div>
          </div>
          <div className="landing-bars" aria-hidden="true">
            {[74, 52, 88, 42, 68, 92, 58, 81, 47, 70, 62, 96].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            <span className="landing-scanner" />
          </div>
          <div className="landing-terminal-foot"><span>INPUT: USD / EUR / GBP / SGD / +162</span><span>OUTPUT: INR</span></div>
        </div>
      </section>

      <section className="landing-proof">
        {proofRows.map(([index, title, copy]) => <article className="landing-reveal" key={index}><span>{index}</span><h2>{title}</h2><p>{copy}</p></article>)}
      </section>

      <section className="landing-capabilities">
        <header className="landing-section-head landing-reveal"><span>THE SYSTEM / 04 MODULES</span><h2>LESS ORNAMENT.<br />MORE EVIDENCE.</h2><p>One monochrome interface from first fact-find to final review deck.</p></header>
        <div className="landing-capability-grid">
          {capabilities.map(({ icon: Icon, code, title, copy }) => <article className="landing-reveal" key={code}><div><span>{code}</span><Icon size={23} /></div><h3>{title}</h3><p>{copy}</p><i /></article>)}
        </div>
      </section>

      <section className="landing-final landing-reveal">
        <div><span>READY WHEN THE ADVICE IS.</span><h2>BUILD THE PLAN.<br />DEFEND THE DECISION.</h2></div>
        <Link to="/login">Enter advisor workspace <ArrowRight size={20} /></Link>
      </section>

      <footer className="landing-footer"><span>© 2026 SOUND THESIS</span><span>REFERENCE RATES / NOT EXECUTION PRICES</span><span>PRIVACY BY DESIGN</span></footer>
    </main>
  );
}
