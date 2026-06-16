'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Sparkles, FileText, ArrowRight, Zap, Shield, Globe, ChevronDown } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Humanizer from '@/components/Humanizer';
import BatchHumanizer from '@/components/BatchHumanizer';
import Detector from '@/components/Detector';
import History from '@/components/History';
import Settings from '@/components/Settings';
import ObservabilityDashboard from '@/components/ObservabilityDashboard';
import Toast from '@/components/Toast';
import Footer from '@/components/Footer';
import { Toast as ToastType, Tab } from '@/lib/types';
import { getTheme, setTheme as saveTheme, hasVisited, markVisited } from '@/lib/storage';

function HeroSection() {
  const scrollToHumanizer = () => {
    document.getElementById('humanizer-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none bg-grid" />
      <div className="absolute inset-0 pointer-events-none noise-overlay" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-500/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent-600/5 rounded-full blur-[80px]" />

      <div className="relative container mx-auto px-4 max-w-7xl text-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" /> Free & Open Source — No Login Required
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
            Transform <span className="hero-gradient">AI Text</span> Into<br />
            <span className="hero-gradient">Natural</span> Writing
          </h1>
          <p className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Free. No login. <strong className="text-dark-200">35 AI providers</strong>. Style-aware rewriting with multi-pass ninja mode.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-12 stagger-children animate-fade-in-up-delay">
          {[
            { icon: <Zap className="w-4 h-4" />, label: 'Instant Humanization' },
            { icon: <Shield className="w-4 h-4" />, label: 'Ninja Mode' },
            { icon: <FileText className="w-4 h-4" />, label: 'Upload PDF/DOCX' },
            { icon: '🔄', label: 'Multi-Pass' },
            { icon: '📝', label: 'Grammar Check' },
            { icon: <Globe className="w-4 h-4" />, label: '16+ Languages' },
          ].map(f => (
            <div key={f.label} className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-sm text-dark-200 hover:border-accent-500/40 hover-lift cursor-default">
              <span className="text-accent-400">{f.icon}</span> {f.label}
            </div>
          ))}
        </div>

        <button onClick={scrollToHumanizer}
          className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-400 hover:to-accent-500 text-white font-semibold text-lg shadow-2xl shadow-accent-500/25 transition-all duration-300 hover:scale-[1.03] glow-pulse animate-fade-in-up-delay-2">
          Start Humanizing <ArrowRight className="w-5 h-5" />
        </button>

        {/* Scroll indicator */}
        <div className="mt-12 animate-fade-in-up-delay-2">
          <button onClick={scrollToHumanizer} className="text-dark-500 hover:text-dark-300 transition-colors" aria-label="Scroll down">
            <ChevronDown className="w-6 h-6 mx-auto animate-float" />
          </button>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: '1', icon: <FileText className="w-7 h-7" />, title: 'Paste or Upload', desc: 'Paste your AI-generated text or upload a PDF/DOCX file directly.' },
    { num: '2', icon: <Sparkles className="w-7 h-7" />, title: 'Choose Style', desc: 'Pick your preferred writing style, tone, and humanization level.' },
    { num: '3', icon: <ArrowRight className="w-7 h-7" />, title: 'Get Results', desc: 'Receive naturally humanized text with detection scores in seconds.' },
  ];

  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 pointer-events-none bg-grid opacity-50" />
      <div className="relative container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">How It Works</h2>
          <p className="text-dark-400 text-lg">Three simple steps to natural writing</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-8 text-center hover:border-accent-500/30 hover-lift group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-accent-500/5 rounded-full blur-2xl group-hover:bg-accent-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-accent-500/15 text-accent-400 flex items-center justify-center mx-auto mb-5 group-hover:bg-accent-500/25 transition-colors duration-300">
                  {s.icon}
                </div>
                <div className="text-xs text-accent-500/80 font-bold uppercase tracking-widest mb-3">Step {s.num}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{s.title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: '35', label: 'AI Providers' },
    { value: '4', label: 'Rewrite Levels' },
    { value: '13', label: 'Tone Presets' },
    { value: '16+', label: 'Languages' },
  ];

  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="glass-card rounded-2xl p-8 md:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((s, i) => (
              <div key={s.label} className="text-center">
                <p className="text-4xl md:text-5xl font-extrabold hero-gradient animate-count" style={{ animationDelay: `${i * 0.1}s` }}>{s.value}</p>
                <p className="text-dark-400 text-sm mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBadges() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-7xl text-center">
        <div className="flex flex-wrap justify-center gap-3 text-xs text-dark-500">
          <span className="px-4 py-2 rounded-full glass-card hover:border-accent-500/30 transition-colors">&#x1f512; 100% Private</span>
          <span className="px-4 py-2 rounded-full glass-card hover:border-accent-500/30 transition-colors">&#x26a1; No Login Required</span>
          <span className="px-4 py-2 rounded-full glass-card hover:border-accent-500/30 transition-colors">&#x1f310; Open Source (MIT)</span>
          <span className="px-4 py-2 rounded-full glass-card hover:border-accent-500/30 transition-colors">&#x1f4e6; Self-Hostable</span>
          <span className="px-4 py-2 rounded-full glass-card hover:border-accent-500/30 transition-colors">&#x1f916; Chrome Extension</span>
        </div>
      </div>
    </section>
  );
}

function GroqFreeGuide() {
  const steps = [
    { num: '1', title: 'Open Settings and clear old keys', desc: 'Go to Settings > Danger Zone > Clear All API Keys (optional reset).', image: '/steps/1.jpg', width: 611, height: 1280 },
    { num: '2', title: 'Choose Groq (FREE)', desc: 'In Free Providers, select Groq (FREE).', image: '/steps/2.jpg', width: 608, height: 1280 },
    { num: '3', title: 'Click Get API Key', desc: 'Open Groq provider settings and click Get API Key.', image: '/steps/3.jpg', width: 653, height: 1280 },
    { num: '4', title: 'Create key in Groq Console', desc: 'Set a key name and expiration preference, then create key.', image: '/steps/4.jpg', width: 659, height: 1280 },
    { num: '5', title: 'Copy key', desc: 'Copy the generated Groq key immediately.', image: '/steps/5.jpg', width: 661, height: 1280 },
    { num: '6', title: 'Paste and save in app', desc: 'Paste key into the Groq API key field and press Save.', image: '/steps/6.jpg', width: 657, height: 1280 },
    { num: '7', title: 'Test key', desc: 'Click Test Key and confirm the key is valid.', image: '/steps/7.jpg', width: 655, height: 1280 },
    { num: '8', title: 'Keep Groq (FREE) active', desc: 'Return to provider selection and ensure Groq (FREE) is selected.', image: '/steps/8.jpg', width: 606, height: 1280 },
    { num: '9', title: 'Set humanizer preferences', desc: 'Configure rewrite level, style, tone, target score, and max words.', image: '/steps/9.jpg', width: 656, height: 1280 },
    { num: '10', title: 'Run the pipeline', desc: 'Paste/upload text and run rewrite > post-process > polish.', image: '/steps/10.jpg', width: 601, height: 1280 },
    { num: '11', title: 'Review and export', desc: 'Review output, re-humanize if needed, then export.', image: '/steps/11.jpg', width: 608, height: 1280 },
  ];

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Get Started Free in 60 Seconds</h2>
          <p className="text-dark-400 text-lg">Follow this walkthrough for <strong className="text-dark-200">Groq (Free)</strong> setup</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {steps.map((step) => (
            <article key={step.num} className="glass-card rounded-2xl p-5 border border-dark-700/40 hover:border-accent-500/20 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-lg bg-accent-500/15 text-accent-400 flex items-center justify-center text-sm font-bold">{step.num}</span>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
              </div>
              <p className="text-dark-400 text-sm mb-4">{step.desc}</p>
              <Image src={step.image} alt={`Groq (Free) step ${step.num}: ${step.title}`} width={step.width} height={step.height} className="w-full h-auto rounded-xl border border-dark-700/40" />
            </article>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-5 mt-8 border border-red-500/30">
          <p className="text-sm text-dark-200">
            <strong className="text-red-400">Safety:</strong> Never share API keys in public messages or screenshots. Use <strong>Settings &gt; Danger Zone &gt; Clear All API Keys</strong> to remove saved keys.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('humanizer');
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isReturningUser, setIsReturningUser] = useState(false);

  useEffect(() => {
    const saved = getTheme();
    setThemeState(saved);
    document.documentElement.classList.toggle('light', saved === 'light');
    document.documentElement.classList.toggle('dark', saved === 'dark');

    const visited = hasVisited();
    setIsReturningUser(visited);
    if (!visited) markVisited();
  }, []);

  const toggleTheme = () => {
    const t = theme === 'dark' ? 'light' : 'dark';
    setThemeState(t); saveTheme(t);
    document.documentElement.classList.toggle('light', t === 'light');
    document.documentElement.classList.toggle('dark', t === 'dark');
  };

  const showToast = useCallback((type: ToastType['type'], message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <div className={`min-h-screen ${theme} flex flex-col`}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} toggleTheme={toggleTheme} />

      {activeTab === 'humanizer' && (
        <>
          {!isReturningUser && <HeroSection />}
          {!isReturningUser && <StatsBar />}
          {!isReturningUser && <HowItWorks />}
          <main className={`container mx-auto px-4 py-6 max-w-7xl ${isReturningUser ? 'pt-24' : ''}`} id="humanizer-section">
            <Humanizer showToast={showToast} onGoToSettings={() => setActiveTab('settings')} isFirstVisit={!isReturningUser} />
          </main>
          {!isReturningUser && <GroqFreeGuide />}
          {!isReturningUser && <TrustBadges />}
        </>
      )}

      {activeTab === 'batch' && (
        <main className="container mx-auto px-4 py-6 max-w-7xl flex-1">
          <BatchHumanizer showToast={showToast} />
        </main>
      )}

      {activeTab !== 'humanizer' && activeTab !== 'batch' && (
        <main className="container mx-auto px-4 py-6 max-w-7xl flex-1">
          {activeTab === 'detector' && <Detector showToast={showToast} />}
          {activeTab === 'dashboard' && <ObservabilityDashboard showToast={showToast} />}
          {activeTab === 'history' && <History showToast={showToast} setActiveTab={setActiveTab} />}
          {activeTab === 'settings' && <Settings showToast={showToast} />}
        </main>
      )}

      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => <Toast key={t.id} toast={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />)}
      </div>
      <Footer />
    </div>
  );
}
