'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import {
  autofillOnboarding,
  createWorkspace,
  getOnboardingConfig,
  listWorkspaces,
  saveOnboardingConfig,
  updateWorkspace
} from '../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';
const ENGINE_OPTIONS = ['CHATGPT', 'PERPLEXITY', 'GEMINI', 'GOOGLE_AIO'] as const;

export default function OnboardingPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewWorkspace = searchParams.get('new') === '1';
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDomain, setWorkspaceDomain] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [category, setCategory] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [competitorsText, setCompetitorsText] = useState('');
  const [engines, setEngines] = useState<string[]>(['CHATGPT']);
  const [autofilling, setAutofilling] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!accessToken || !user) {
      router.replace('/login');
      return;
    }

    // When coming from "New workspace", skip loading any existing workspace
    if (isNewWorkspace) return;

    const storedWorkspace = localStorage.getItem(WORKSPACE_KEY);
    if (storedWorkspace) {
      setWorkspaceId(storedWorkspace);
      return;
    }

    setBusy(true);
    listWorkspaces(accessToken)
      .then((items) => {
        if (items.length === 0) {
          setStep(0);
          return;
        }
        setWorkspaceId(items[0].id);
        localStorage.setItem(WORKSPACE_KEY, items[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load workspaces'))
      .finally(() => setBusy(false));
  }, [accessToken, loading, router, user]);

  useEffect(() => {
    if (!accessToken || !workspaceId) return;

    setBusy(true);
    getOnboardingConfig(accessToken, workspaceId)
      .then((config) => {
        if (config.onboardingComplete) {
          router.replace('/dashboard');
          return;
        }
        if (config.brand) {
          setBrandName(config.brand.name || '');
          setBrandDescription(config.brand.description || '');
          setCategory(config.brand.category || '');
          if (config.brand.domain) setWorkspaceDomain(config.brand.domain);
        }
        if (config.topics.length) {
          setTopicsText(config.topics.map((t) => t.name).join(', '));
        }
        if (config.competitors.length) {
          setCompetitorsText(config.competitors.map((c) => c.domain).join(', '));
        }
        if (config.engines.length) {
          setEngines(config.engines);
        }
        setStep(1);
      })
      .catch(() => {
        setStep(1);
      })
      .finally(() => setBusy(false));
  }, [accessToken, router, workspaceId]);

  const topics = useMemo(
    () => topicsText.split(',').map((t) => t.trim()).filter(Boolean),
    [topicsText]
  );

  const competitors = useMemo(
    () => competitorsText.split(',').map((d) => d.trim()).filter(Boolean),
    [competitorsText]
  );

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function domainToSlug(domain: string) {
    const cleaned = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
    return slugify(cleaned.replace(/\./g, '-'));
  }

  async function handleCreateWorkspace(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError('');
    setBusy(true);
    try {
      const cleanDomain = workspaceDomain.trim();
      const slug = domainToSlug(cleanDomain);

      let wsId = workspaceId;
      if (wsId) {
        await updateWorkspace(accessToken, wsId, { name: workspaceName.trim(), slug });
      } else {
        const ws = await createWorkspace(accessToken, workspaceName.trim(), slug);
        wsId = ws.id;
        setWorkspaceId(ws.id);
        localStorage.setItem(WORKSPACE_KEY, ws.id);
      }

      setAutofilling(true);
      try {
        const suggestion = await autofillOnboarding(accessToken, {
          workspaceId: wsId!,
          domain: cleanDomain
        });
        setBrandName(suggestion.brandName || '');
        setBrandDescription(suggestion.brandDescription || '');
        setCategory(suggestion.category || '');
        setTopicsText((suggestion.topics || []).join(', '));
        setCompetitorsText((suggestion.competitors || []).map((c) => c.domain).join(', '));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI autofill failed');
      } finally {
        setAutofilling(false);
      }

      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workspace creation failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    if (!accessToken || !workspaceId) return;
    setError('');
    setBusy(true);
    try {
      const payload = {
        workspaceId,
        brandName: brandName.trim(),
        brandDomain: workspaceDomain.trim() || undefined,
        brandDescription: brandDescription.trim() || undefined,
        category: category.trim() || undefined,
        topics,
        competitors: competitors.map((domain) => ({ domain })),
        engines
      };
      const res = await saveOnboardingConfig(accessToken, payload);
      if (res.onboardingComplete) {
        router.push('/dashboard');
      } else {
        setError('Please complete required fields (brand, topics, engines).');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !accessToken) return null;

  return (
    <main className="wizard">
      <section className="wizard-card">
        <header className="wizard-header">
          <h1>Workspace Onboarding</h1>
          <p>Let’s get your first workspace ready for tracking.</p>
        </header>

        <div className="wizard-steps">
          {['Workspace', 'Brand', 'Topics', 'Competitors', 'Engines'].map((label, index) => (
            <div key={label} className={`wizard-step ${index === step ? 'active' : index < step ? 'done' : ''}`}>
              <span>{index + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {error && <p className="auth-error">{error}</p>}

        {step === 0 && (
          <form className="wizard-panel" onSubmit={handleCreateWorkspace}>
            <label htmlFor="workspaceName">Workspace name</label>
            <input
              id="workspaceName"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Acme Corp"
              required
            />

            <label htmlFor="workspaceDomain">Company domain</label>
            <input
              id="workspaceDomain"
              value={workspaceDomain}
              onChange={(e) => setWorkspaceDomain(e.target.value)}
              placeholder="acme.com"
              required
            />

            <button type="submit" disabled={busy || !workspaceName || !workspaceDomain}>
              {busy ? 'Creating…' : 'Create workspace'}
            </button>
            {autofilling && <p className="wizard-help">Auto-filling brand, topics, and competitors with AI…</p>}
          </form>
        )}

        {step === 1 && (
          <div className="wizard-panel">
            <label htmlFor="brandName">Brand name</label>
            <input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Acme" />

            <label htmlFor="brandDescription">Brand description</label>
            <textarea id="brandDescription" rows={3} value={brandDescription} onChange={(e) => setBrandDescription(e.target.value)} placeholder="What does your product do?" />

            <label htmlFor="category">Category</label>
            <input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="AI search, analytics, etc." />

            <div className="wizard-actions">
              <button type="button" className="btn-outline" onClick={() => setStep(0)} disabled={busy}>Back</button>
              <button type="button" onClick={() => setStep(2)} disabled={busy || !brandName.trim()}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-panel">
            <label htmlFor="topics">Top topics</label>
            <textarea
              id="topics"
              rows={3}
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              placeholder="AI search, LLM answers, enterprise search"
            />
            <p className="wizard-help">Separate topics with commas.</p>

            <div className="wizard-actions">
              <button type="button" className="btn-outline" onClick={() => setStep(1)} disabled={busy}>Back</button>
              <button type="button" onClick={() => setStep(3)} disabled={busy || topics.length === 0}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-panel">
            <label htmlFor="competitors">Competitors</label>
            <textarea
              id="competitors"
              rows={3}
              value={competitorsText}
              onChange={(e) => setCompetitorsText(e.target.value)}
              placeholder="competitor.com, rival.io"
            />
            <p className="wizard-help">Optional. Separate domains with commas.</p>

            <div className="wizard-actions">
              <button type="button" className="btn-outline" onClick={() => setStep(2)} disabled={busy}>Back</button>
              <button type="button" onClick={() => setStep(4)} disabled={busy}>Continue</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-panel">
            <p className="wizard-help">Pick the AI engines to track.</p>
            <div className="wizard-checkboxes">
              {ENGINE_OPTIONS.map((engine) => (
                <label key={engine} className={`wizard-checkbox ${engines.includes(engine) ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={engines.includes(engine)}
                    onChange={(e) => {
                      if (e.target.checked) setEngines((prev) => [...prev, engine]);
                      else setEngines((prev) => prev.filter((item) => item !== engine));
                    }}
                  />
                  {engine}
                </label>
              ))}
            </div>

            <div className="wizard-actions">
              <button type="button" className="btn-outline" onClick={() => setStep(3)} disabled={busy}>Back</button>
              <button type="button" onClick={handleFinish} disabled={busy || engines.length === 0}>
                {busy ? 'Saving…' : 'Finish onboarding'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
