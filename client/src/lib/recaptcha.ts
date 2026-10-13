// Google reCAPTCHA v3 client-side integration with graceful dev/demo fallback

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface RecaptchaConfig {
  siteKey: string;
  isEnabled: boolean;
  isDemo: boolean;
}

let cachedConfig: RecaptchaConfig | null = null;
let scriptLoadingPromise: Promise<void> | null = null;

/**
 * Fetch reCAPTCHA configuration from server or client environment
 */
export async function getRecaptchaConfig(): Promise<RecaptchaConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  // 1. Check client-side Vite environment variable first
  const envSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

  try {
    const res = await fetch('/api/recaptcha/site-key');
    if (res.ok) {
      const data = await res.json();
      cachedConfig = {
        siteKey: envSiteKey || data.siteKey || '',
        isEnabled: Boolean(data.isEnabled),
        isDemo: Boolean(data.isDemo),
      };
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[reCAPTCHA] Failed to fetch server config, falling back to local env:', err);
  }

  cachedConfig = {
    siteKey: envSiteKey || '',
    isEnabled: Boolean(envSiteKey),
    isDemo: !envSiteKey,
  };
  return cachedConfig;
}

/**
 * Load Google reCAPTCHA v3 script dynamically
 */
export async function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === 'undefined') return;

  if (window.grecaptcha) {
    return new Promise((resolve) => window.grecaptcha!.ready(resolve));
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    // If siteKey is missing or placeholder, don't attempt external network load
    if (!siteKey || siteKey === 'test' || siteKey === 'demo') {
      resolve();
      return;
    }

    const scriptId = 'google-recaptcha-v3-script';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      if (window.grecaptcha) {
        window.grecaptcha.ready(resolve);
      } else {
        existingScript.addEventListener('load', () => {
          if (window.grecaptcha) {
            window.grecaptcha.ready(resolve);
          } else {
            resolve();
          }
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;

    const timeout = setTimeout(() => {
      console.warn('[reCAPTCHA] Script load timed out; proceeding in fallback mode.');
      resolve();
    }, 6000);

    script.onload = () => {
      clearTimeout(timeout);
      if (window.grecaptcha) {
        window.grecaptcha.ready(resolve);
      } else {
        resolve();
      }
    };

    script.onerror = (e) => {
      clearTimeout(timeout);
      console.warn('[reCAPTCHA] Script load blocked or failed (e.g. adblocker); proceeding in fallback mode.', e);
      resolve();
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Executes reCAPTCHA v3 to retrieve a token for the given action
 */
export async function executeRecaptcha(action: string = 'upload_rom'): Promise<{ token: string; isDemo: boolean }> {
  try {
    const config = await getRecaptchaConfig();

    if (!config.siteKey || config.isDemo) {
      // Demo / dev fallback token
      return { token: `dev_recaptcha_token_${Date.now()}`, isDemo: true };
    }

    await loadRecaptchaScript(config.siteKey);

    if (window.grecaptcha && typeof window.grecaptcha.execute === 'function') {
      const token = await window.grecaptcha.execute(config.siteKey, { action });
      return { token, isDemo: false };
    }

    // Fallback if grecaptcha is blocked by browser adblocker
    return { token: `fallback_token_${Date.now()}`, isDemo: true };
  } catch (error) {
    console.warn('[reCAPTCHA] Execution exception, returning dev fallback:', error);
    return { token: `fallback_token_${Date.now()}`, isDemo: true };
  }
}

/**
 * Verify reCAPTCHA token against the server verification endpoint
 */
export async function verifyRecaptchaToken(token: string, action: string = 'upload_rom'): Promise<{ success: boolean; score?: number; error?: string; isDemo?: boolean }> {
  try {
    const res = await fetch('/api/recaptcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    });

    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('[reCAPTCHA] Server verification network error:', error);
    return { success: false, error: error?.message || 'Verification network failure' };
  }
}
