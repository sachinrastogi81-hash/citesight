'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Loader2, Globe, Package, Users, Swords, Megaphone } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { Sidebar } from '../../../components/Sidebar';
import {
  getBrandProfile,
  saveBrandProfile,
  getBrandVoice,
  saveBrandVoice,
  listBrandProducts,
  createBrandProduct,
  deleteBrandProduct,
  getBrandAudience,
  saveBrandAudience,
  listBrandCompetitors,
  createBrandCompetitor,
  deleteBrandCompetitor,
  getOnboardingConfig,
  type BrandProfile,
  type BrandVoice,
  type BrandProduct,
  type BrandAudience,
  type BrandCompetitorEntry,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
        background: type === 'success' ? 'var(--success)' : 'var(--danger)',
        color: '#fff', borderRadius: 'var(--radius)', padding: '0.75rem 1.25rem',
        fontSize: '0.875rem', fontWeight: 500, boxShadow: 'var(--shadow-lg)',
        maxWidth: '360px',
      }}
    >
      {msg}
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────

function SectionCard({
  icon, title, children,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <span style={{ color: 'var(--primary)' }}>{icon}</span>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Field helper ───────────────────────────────────────────────────────────────

function Field({
  label, children,
}: {
  label: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

// ── TagInput for phrase lists ──────────────────────────────────────────────────

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState('');

  function addTag() {
    const trimmed = inputVal.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputVal('');
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag));
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={placeholder ?? 'Type and press Enter'}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn-outline" onClick={addTag} style={{ flexShrink: 0 }}>
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {values.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                background: 'var(--primary-light)', color: 'var(--primary)',
                borderRadius: '999px', padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 500,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--primary)', padding: '0', lineHeight: 1, fontSize: '0.95rem',
                  display: 'flex', alignItems: 'center',
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BrandKitPage() {
  const { accessToken: token, loading } = useAuth();
  const router = useRouter();
  const workspaceId =
    typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) : null;

  const [initializing, setInitializing] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Profile state ──
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [profForm, setProfForm] = useState({ brandName: '', website: '', industry: '', description: '' });
  const [profBusy, setProfBusy] = useState(false);

  // ── Voice state ──
  const [voice, setVoice] = useState<BrandVoice | null>(null);
  const [voiceForm, setVoiceForm] = useState({
    tone: '', writingStyle: '', readingLevel: '',
    preferredPhrases: [] as string[], avoidPhrases: [] as string[],
  });
  const [voiceBusy, setVoiceBusy] = useState(false);

  // ── Products state ──
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [prodForm, setProdForm] = useState({ productName: '', description: '', productUrl: '' });
  const [prodBusy, setProdBusy] = useState(false);
  const [deletingProd, setDeletingProd] = useState<string | null>(null);

  // ── Audience state ──
  const [audience, setAudience] = useState<BrandAudience | null>(null);
  const [audForm, setAudForm] = useState({ primaryAudience: '', secondaryAudience: '', geography: '' });
  const [audBusy, setAudBusy] = useState(false);

  // ── Competitors state ──
  const [competitors, setCompetitors] = useState<BrandCompetitorEntry[]>([]);
  const [compForm, setCompForm] = useState({ competitorName: '', website: '' });
  const [compBusy, setCompBusy] = useState(false);
  const [deletingComp, setDeletingComp] = useState<string | null>(null);

  // ── Load all on mount ──
  useEffect(() => {
    if (loading) return;
    if (!token || !workspaceId) { router.replace('/login'); return; }

    Promise.all([
      getBrandProfile(token, workspaceId),
      getBrandVoice(token, workspaceId),
      listBrandProducts(token, workspaceId),
      getBrandAudience(token, workspaceId),
      listBrandCompetitors(token, workspaceId),
      getOnboardingConfig(token, workspaceId),
    ])
      .then(async ([prof, voi, prods, aud, comps, onboarding]) => {
        if (prof) {
          setProfile(prof);
          setProfForm({
            brandName: prof.brandName ?? '',
            website: prof.website ?? '',
            industry: prof.industry ?? '',
            description: prof.description ?? '',
          });
        } else if (onboarding.brand) {
          // Auto-seed Brand Profile from onboarding data (first visit to Brand Kit)
          const seeded = await saveBrandProfile(token, workspaceId, {
            brandName: onboarding.brand.name,
            website: onboarding.brand.domain ?? undefined,
            industry: onboarding.brand.category ?? undefined,
            description: onboarding.brand.description ?? undefined,
          }).catch(() => null);
          if (seeded) {
            setProfile(seeded);
            setProfForm({
              brandName: seeded.brandName ?? '',
              website: seeded.website ?? '',
              industry: seeded.industry ?? '',
              description: seeded.description ?? '',
            });
          }
        }

        if (voi) {
          setVoice(voi);
          setVoiceForm({
            tone: voi.tone ?? '',
            writingStyle: voi.writingStyle ?? '',
            readingLevel: voi.readingLevel ?? '',
            preferredPhrases: voi.preferredPhrases ?? [],
            avoidPhrases: voi.avoidPhrases ?? [],
          });
        }

        setProducts(prods);

        if (aud) {
          setAudience(aud);
          setAudForm({
            primaryAudience: aud.primaryAudience ?? '',
            secondaryAudience: aud.secondaryAudience ?? '',
            geography: aud.geography ?? '',
          });
        }

        // If no Brand Kit competitors but onboarding has some, seed them
        if (comps.length === 0 && onboarding.competitors.length > 0) {
          const seededComps = await Promise.all(
            onboarding.competitors.map((c) =>
              createBrandCompetitor(token, workspaceId, {
                competitorName: c.name ?? c.domain,
                website: c.domain ? (c.domain.startsWith('http') ? c.domain : `https://${c.domain}`) : undefined,
              }).catch(() => null),
            ),
          );
          setCompetitors(seededComps.filter(Boolean) as BrandCompetitorEntry[]);
        } else {
          setCompetitors(comps);
        }
      })
      .catch(() => showToast('Failed to load brand data', 'error'))
      .finally(() => setInitializing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loading, workspaceId]);

  // ── Save profile ──
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId) return;
    setProfBusy(true);
    try {
      const updated = await saveBrandProfile(token, workspaceId, {
        brandName: profForm.brandName,
        website: profForm.website || undefined,
        industry: profForm.industry || undefined,
        description: profForm.description || undefined,
      });
      setProfile(updated);
      showToast('Brand profile saved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setProfBusy(false);
    }
  }

  // ── Save voice ──
  async function handleSaveVoice(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId) return;
    setVoiceBusy(true);
    try {
      const updated = await saveBrandVoice(token, workspaceId, {
        tone: voiceForm.tone || undefined,
        writingStyle: voiceForm.writingStyle || undefined,
        readingLevel: voiceForm.readingLevel || undefined,
        preferredPhrases: voiceForm.preferredPhrases,
        avoidPhrases: voiceForm.avoidPhrases,
      });
      setVoice(updated);
      showToast('Brand voice saved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setVoiceBusy(false);
    }
  }

  // ── Add product ──
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId || !prodForm.productName.trim()) return;
    setProdBusy(true);
    try {
      const created = await createBrandProduct(token, workspaceId, {
        productName: prodForm.productName.trim(),
        description: prodForm.description || undefined,
        productUrl: prodForm.productUrl || undefined,
      });
      setProducts((prev) => [...prev, created]);
      setProdForm({ productName: '', description: '', productUrl: '' });
      showToast('Product added');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add product', 'error');
    } finally {
      setProdBusy(false);
    }
  }

  // ── Delete product ──
  async function handleDeleteProduct(id: string) {
    if (!token || !workspaceId) return;
    setDeletingProd(id);
    try {
      await deleteBrandProduct(token, workspaceId, id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeletingProd(null);
    }
  }

  // ── Save audience ──
  async function handleSaveAudience(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId) return;
    setAudBusy(true);
    try {
      const updated = await saveBrandAudience(token, workspaceId, {
        primaryAudience: audForm.primaryAudience || undefined,
        secondaryAudience: audForm.secondaryAudience || undefined,
        geography: audForm.geography || undefined,
      });
      setAudience(updated);
      showToast('Audience saved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setAudBusy(false);
    }
  }

  // ── Add competitor ──
  async function handleAddCompetitor(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId || !compForm.competitorName.trim()) return;
    setCompBusy(true);
    try {
      const created = await createBrandCompetitor(token, workspaceId, {
        competitorName: compForm.competitorName.trim(),
        website: compForm.website || undefined,
      });
      setCompetitors((prev) => [...prev, created]);
      setCompForm({ competitorName: '', website: '' });
      showToast('Competitor added');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add competitor', 'error');
    } finally {
      setCompBusy(false);
    }
  }

  // ── Delete competitor ──
  async function handleDeleteCompetitor(id: string) {
    if (!token || !workspaceId) return;
    setDeletingComp(id);
    try {
      await deleteBrandCompetitor(token, workspaceId, id);
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeletingComp(null);
    }
  }

  // ── Render ──
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="page-header" style={{ marginBottom: '2rem' }}>
            <div>
              <h1>Brand Kit</h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Define your brand identity so CiteSight can generate content in your voice.
              </p>
            </div>
          </div>

          {initializing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--muted)', padding: '2rem 0' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Loading brand data…
            </div>
          ) : (
            <div style={{ maxWidth: '760px' }}>

              {/* ── Profile ──────────────────────────────── */}
              <SectionCard icon={<Globe size={18} />} title="Brand Profile">
                <form onSubmit={handleSaveProfile}>
                  <Field label="Brand Name *">
                    <input
                      value={profForm.brandName}
                      onChange={(e) => setProfForm((f) => ({ ...f, brandName: e.target.value }))}
                      placeholder="Acme Corp"
                      required
                    />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Field label="Website">
                      <input
                        value={profForm.website}
                        onChange={(e) => setProfForm((f) => ({ ...f, website: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </Field>
                    <Field label="Industry">
                      <input
                        value={profForm.industry}
                        onChange={(e) => setProfForm((f) => ({ ...f, industry: e.target.value }))}
                        placeholder="e.g. SaaS, E-commerce"
                      />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea
                      value={profForm.description}
                      onChange={(e) => setProfForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="A short description of your brand and what you do"
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </Field>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-primary" disabled={profBusy}>
                      {profBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                      Save Profile
                    </button>
                  </div>
                </form>
              </SectionCard>

              {/* ── Voice ────────────────────────────────── */}
              <SectionCard icon={<Megaphone size={18} />} title="Brand Voice">
                <form onSubmit={handleSaveVoice}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <Field label="Tone">
                      <input
                        value={voiceForm.tone}
                        onChange={(e) => setVoiceForm((f) => ({ ...f, tone: e.target.value }))}
                        placeholder="e.g. Professional"
                      />
                    </Field>
                    <Field label="Writing Style">
                      <input
                        value={voiceForm.writingStyle}
                        onChange={(e) => setVoiceForm((f) => ({ ...f, writingStyle: e.target.value }))}
                        placeholder="e.g. Conversational"
                      />
                    </Field>
                    <Field label="Reading Level">
                      <input
                        value={voiceForm.readingLevel}
                        onChange={(e) => setVoiceForm((f) => ({ ...f, readingLevel: e.target.value }))}
                        placeholder="e.g. 8th grade"
                      />
                    </Field>
                  </div>
                  <Field label="Preferred Phrases">
                    <TagInput
                      values={voiceForm.preferredPhrases}
                      onChange={(v) => setVoiceForm((f) => ({ ...f, preferredPhrases: v }))}
                      placeholder="Type a phrase and press Enter"
                    />
                  </Field>
                  <Field label="Phrases to Avoid">
                    <TagInput
                      values={voiceForm.avoidPhrases}
                      onChange={(v) => setVoiceForm((f) => ({ ...f, avoidPhrases: v }))}
                      placeholder="Type a phrase and press Enter"
                    />
                  </Field>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-primary" disabled={voiceBusy}>
                      {voiceBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                      Save Voice
                    </button>
                  </div>
                </form>
              </SectionCard>

              {/* ── Products ─────────────────────────────── */}
              <SectionCard icon={<Package size={18} />} title="Products & Services">
                {products.length > 0 && (
                  <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {products.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.65rem 0.9rem', background: 'var(--bg)',
                          borderRadius: 'var(--radius)', border: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.productName}</div>
                          {p.description && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                              {p.description}
                            </div>
                          )}
                          {p.productUrl && (
                            <a
                              href={p.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.78rem', color: 'var(--primary)' }}
                            >
                              {p.productUrl}
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleDeleteProduct(p.id)}
                          disabled={deletingProd === p.id}
                          style={{ color: 'var(--danger)', padding: '0.4rem' }}
                          title="Remove product"
                        >
                          {deletingProd === p.id
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleAddProduct}>
                  <div
                    style={{
                      padding: '1rem', border: '1px dashed var(--line-strong)',
                      borderRadius: 'var(--radius)', background: 'var(--bg)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--muted)' }}>
                      Add a product or service
                    </div>
                    <Field label="Product Name *">
                      <input
                        value={prodForm.productName}
                        onChange={(e) => setProdForm((f) => ({ ...f, productName: e.target.value }))}
                        placeholder="e.g. CiteSight Pro"
                        required
                      />
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <Field label="Description">
                        <input
                          value={prodForm.description}
                          onChange={(e) => setProdForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="What it does"
                        />
                      </Field>
                      <Field label="URL">
                        <input
                          value={prodForm.productUrl}
                          onChange={(e) => setProdForm((f) => ({ ...f, productUrl: e.target.value }))}
                          placeholder="https://example.com/product"
                        />
                      </Field>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      <button type="submit" className="btn-primary" disabled={prodBusy}>
                        {prodBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                        Add Product
                      </button>
                    </div>
                  </div>
                </form>
              </SectionCard>

              {/* ── Audience ─────────────────────────────── */}
              <SectionCard icon={<Users size={18} />} title="Target Audience">
                <form onSubmit={handleSaveAudience}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Field label="Primary Audience">
                      <input
                        value={audForm.primaryAudience}
                        onChange={(e) => setAudForm((f) => ({ ...f, primaryAudience: e.target.value }))}
                        placeholder="e.g. B2B SaaS founders"
                      />
                    </Field>
                    <Field label="Secondary Audience">
                      <input
                        value={audForm.secondaryAudience}
                        onChange={(e) => setAudForm((f) => ({ ...f, secondaryAudience: e.target.value }))}
                        placeholder="e.g. Marketing managers"
                      />
                    </Field>
                  </div>
                  <Field label="Geography">
                    <input
                      value={audForm.geography}
                      onChange={(e) => setAudForm((f) => ({ ...f, geography: e.target.value }))}
                      placeholder="e.g. North America, Global, UK & Ireland"
                    />
                  </Field>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-primary" disabled={audBusy}>
                      {audBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                      Save Audience
                    </button>
                  </div>
                </form>
              </SectionCard>

              {/* ── Competitors ──────────────────────────── */}
              <SectionCard icon={<Swords size={18} />} title="Competitors">
                {competitors.length > 0 && (
                  <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {competitors.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.65rem 0.9rem', background: 'var(--bg)',
                          borderRadius: 'var(--radius)', border: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.competitorName}</div>
                          {c.website && (
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.78rem', color: 'var(--primary)' }}
                            >
                              {c.website}
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleDeleteCompetitor(c.id)}
                          disabled={deletingComp === c.id}
                          style={{ color: 'var(--danger)', padding: '0.4rem' }}
                          title="Remove competitor"
                        >
                          {deletingComp === c.id
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleAddCompetitor}>
                  <div
                    style={{
                      padding: '1rem', border: '1px dashed var(--line-strong)',
                      borderRadius: 'var(--radius)', background: 'var(--bg)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--muted)' }}>
                      Add a competitor
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <Field label="Competitor Name *">
                        <input
                          value={compForm.competitorName}
                          onChange={(e) => setCompForm((f) => ({ ...f, competitorName: e.target.value }))}
                          placeholder="e.g. Acme Rival Inc"
                          required
                        />
                      </Field>
                      <Field label="Website">
                        <input
                          value={compForm.website}
                          onChange={(e) => setCompForm((f) => ({ ...f, website: e.target.value }))}
                          placeholder="https://rival.com"
                        />
                      </Field>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      <button type="submit" className="btn-primary" disabled={compBusy}>
                        {compBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                        Add Competitor
                      </button>
                    </div>
                  </div>
                </form>
              </SectionCard>

            </div>
          )}
        </div>
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
