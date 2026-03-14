import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>CiteSight</h1>
        <p style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
          AI-powered Answer Engine Optimization
        </p>
        <Link href="/login">
          <button type="button" style={{ width: '100%', marginBottom: '0.5rem' }}>Sign in</button>
        </Link>
        <p className="auth-footer">
          Don&apos;t have an account? <Link href="/register">Create one</Link>
        </p>
      </div>
    </main>
  );
}
