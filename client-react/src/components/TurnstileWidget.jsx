import { useEffect, useRef, useState } from 'react';

export default function TurnstileWidget({ onVerify, onExpire, onError }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [siteKey, setSiteKey] = useState(import.meta.env.VITE_TURNSTILE_SITE_KEY || '');
  const [ready, setReady] = useState(false);
  const [widgetState, setWidgetState] = useState('loading'); // 'loading' | 'rendered' | 'error'

  // If not configured in frontend env, try to get from backend config
  useEffect(() => {
    if (!siteKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout for backend

      fetch('/api/auth/config', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          clearTimeout(timeout);
          if (data && data.turnstileSiteKey) {
            setSiteKey(data.turnstileSiteKey);
          } else {
            setReady(true); // ready in dev bypass mode
          }
        })
        .catch((err) => {
          clearTimeout(timeout);
          console.warn('[Turnstile] Failed to fetch config from backend:', err.message);
          setReady(true); // Fall through to dev bypass
        });

      return () => {
        clearTimeout(timeout);
        controller.abort();
      };
    } else {
      setReady(true);
    }
  }, [siteKey]);

  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  const devVerifiedRef = useRef(false);

  // Load Turnstile script and render
  useEffect(() => {
    if (!ready) return;

    if (!siteKey) {
      // Dev mode without Turnstile keys configured
      if (!devVerifiedRef.current && onVerifyRef.current) {
        devVerifiedRef.current = true;
        onVerifyRef.current('dev-turnstile-token');
      }
      setWidgetState('rendered');
      return;
    }

    setWidgetState('loading');
    let script = document.querySelector('script[src*="turnstile/v0/api.js"]');
    let scriptLoadTimeout;

    function renderWidget() {
      if (!window.turnstile || !containerRef.current) {
        setWidgetState('error');
        return;
      }
      if (widgetIdRef.current !== null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            setWidgetState('rendered');
            if (onVerifyRef.current) onVerifyRef.current(token);
          },
          'expired-callback': () => {
            setWidgetState('rendered');
            if (onExpireRef.current) onExpireRef.current();
          },
          'error-callback': () => {
            setWidgetState('error');
            if (onErrorRef.current) onErrorRef.current();
          },
          theme: 'light',
          size: 'normal'
        });
        setWidgetState('rendered');
      } catch (err) {
        console.error('[Turnstile] Render error:', err);
        setWidgetState('error');
      }
    }

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;

      // Timeout for script loading
      scriptLoadTimeout = setTimeout(() => {
        if (!window.turnstile) {
          console.error('[Turnstile] Script load timed out after 15 seconds');
          setWidgetState('error');
        }
      }, 15000);

      script.onload = () => {
        clearTimeout(scriptLoadTimeout);
        if (window.turnstile) {
          window.turnstile.ready(renderWidget);
        }
      };
      script.onerror = () => {
        clearTimeout(scriptLoadTimeout);
        console.error('[Turnstile] Script failed to load');
        setWidgetState('error');
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      window.turnstile.ready(renderWidget);
    } else {
      script.addEventListener('load', () => {
        if (window.turnstile) {
          window.turnstile.ready(renderWidget);
        }
      });
    }

    return () => {
      clearTimeout(scriptLoadTimeout);
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {}
      }
    };
  }, [ready, siteKey]);

  function handleRetry() {
    setWidgetState('loading');
    devVerifiedRef.current = false;
    if (widgetIdRef.current !== null && window.turnstile) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
      widgetIdRef.current = null;
    }
    // Re-trigger by toggling ready
    setReady(false);
    setTimeout(() => {
      setSiteKey(import.meta.env.VITE_TURNSTILE_SITE_KEY || '');
      setReady(true);
    }, 100);
  }

  if (!siteKey) {
    return (
      <div style={{
        padding: '0.5rem 0.75rem',
        borderRadius: '8px',
        backgroundColor: '#f1f5f9',
        border: '1px dashed #94a3b8',
        fontSize: '0.75rem',
        color: '#475569',
        textAlign: 'center',
        margin: '0.5rem 0'
      }}>
        🛡️ Cloudflare Turnstile: Dev Mode (Set <code>VITE_TURNSTILE_SITE_KEY</code> for live verification)
      </div>
    );
  }

  return (
    <div style={{ margin: '0.75rem 0' }}>
      {widgetState === 'loading' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid #cbd5e1',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          Loading security verification...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {widgetState === 'error' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fecaca',
          fontSize: '0.8rem',
          color: '#b91c1c',
          textAlign: 'center'
        }}>
          <span>⚠️ Security verification failed to load.</span>
          <button
            type="button"
            onClick={handleRetry}
            style={{
              background: 'none',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#dc2626',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '0.25rem 0.75rem',
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          display: widgetState === 'loading' || widgetState === 'error' ? 'none' : 'flex',
          justifyContent: 'center'
        }}
      />
    </div>
  );
}
