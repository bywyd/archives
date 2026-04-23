import { useCallback, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { useWindowStore } from '@/stores/window-store';

//  CSRF helper 

function getCsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

//  Styles 

const panelStyle: React.CSSProperties = {
    background: 'rgba(15,23,42,0.97)',
    borderTop: '3px solid rgba(37,99,235,0.65)',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(37,99,235,0.2)',
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    padding: '0.45rem 0.65rem',
    outline: 'none',
    letterSpacing: '0.02em',
    transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'rgba(148,163,184,0.6)',
    marginBottom: '0.3rem',
    display: 'block',
};

//  Component 

export function LoginWindow() {
    const { windows, closeWindow } = useWindowStore();
    const windowId = windows.find((w) => w.type === 'login')?.id ?? null;

    const [email,       setEmail]       = useState('');
    const [password,    setPassword]    = useState('');
    const [submitting,  setSubmitting]  = useState(false);
    const [errors,      setErrors]      = useState<{ email?: string; password?: string; general?: string }>({});
    const emailRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setErrors({});
            setSubmitting(true);

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email, password, remember: false }),
                });

                if (response.ok || response.status === 204) {
                    // Reload Inertia shared props (refreshes auth.user without nav)
                    router.reload({ only: ['auth'] });
                    if (windowId) closeWindow(windowId);
                    return;
                }

                if (response.status === 422) {
                    const body = await response.json() as { errors?: Record<string, string[]>; message?: string };
                    const fieldErrors: typeof errors = {};
                    if (body.errors?.email)    fieldErrors.email    = body.errors.email[0];
                    if (body.errors?.password) fieldErrors.password = body.errors.password[0];
                    if (!fieldErrors.email && !fieldErrors.password) {
                        fieldErrors.general = body.message ?? 'Authentication failed.';
                    }
                    setErrors(fieldErrors);
                    return;
                }

                // Redirect happened (Fortify redirects to /dashboard on web requests)
                // but we hit it via XHR so we get a 200/302  reload to sync auth
                router.reload({ only: ['auth'] });
                if (windowId) closeWindow(windowId);
            } catch {
                setErrors({ general: 'Network error  unable to reach authentication server.' });
            } finally {
                setSubmitting(false);
            }
        },
        [email, password, windowId, closeWindow],
    );

    return (
        <div className="h-full flex flex-col" style={panelStyle}>
            {/* Header */}
            <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid rgba(37,99,235,0.15)' }}
            >
                <span className="font-mono text-[10px] tracking-widest uppercase text-blue-400/70">
                    System Access
                </span>
                <span
                    className="ml-auto inline-block w-2 h-2 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.7)', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }}
                />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5 flex-1">
                {/* General error */}
                {errors.general && (
                    <div
                        className="font-mono text-[10px] tracking-wide uppercase px-3 py-2"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(252,165,165,0.9)' }}
                    >
                        {errors.general}
                    </div>
                )}

                {/* Classification notice */}
                <div
                    className="font-mono text-[9px] tracking-widest uppercase px-3 py-2 text-center"
                    style={{ border: '1px solid rgba(37,99,235,0.15)', color: 'rgba(96,165,250,0.5)' }}
                >
                    Archives Corporation - Authorized Personnel Only
                </div>

                <div className="flex flex-col gap-3">
                    {/* Email */}
                    <div>
                        <label style={labelStyle}>Agent Identifier</label>
                        <input
                            ref={emailRef}
                            type="email"
                            autoComplete="username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={submitting}
                            placeholder="operator@archives.corp"
                            style={{
                                ...inputStyle,
                                ...(errors.email ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? 'rgba(239,68,68,0.5)' : 'rgba(37,99,235,0.2)'; }}
                        />
                        {errors.email && (
                            <span className="font-mono text-[9px] tracking-wide" style={{ color: 'rgba(252,165,165,0.85)' }}>
                                {errors.email}
                            </span>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label style={labelStyle}>Access Code</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={submitting}
                            placeholder="••••••••"
                            style={{
                                ...inputStyle,
                                ...(errors.password ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = errors.password ? 'rgba(239,68,68,0.5)' : 'rgba(37,99,235,0.2)'; }}
                        />
                        {errors.password && (
                            <span className="font-mono text-[9px] tracking-wide" style={{ color: 'rgba(252,165,165,0.85)' }}>
                                {errors.password}
                            </span>
                        )}
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="mt-auto font-mono text-[11px] tracking-widest uppercase py-2.5 transition-all"
                    style={{
                        background: submitting ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.2)',
                        border: '1px solid rgba(37,99,235,0.4)',
                        color: submitting ? 'rgba(148,163,184,0.5)' : 'rgba(147,197,253,0.9)',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.16em',
                    }}
                    onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = 'rgba(37,99,235,0.3)'; }}
                    onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = 'rgba(37,99,235,0.2)'; }}
                >
                    {submitting ? 'Authenticating...' : '[ Authenticate ]'}
                </button>
            </form>

            {/* register button */}
            <div
                className="px-5 pb-4 pt-2 text-center"
                style={{ borderTop: '1px solid rgba(37,99,235,0.15)' }}
            >
                <span
                    className="font-mono text-[10px] tracking-widest uppercase text-blue-400/70 cursor-pointer"
                    onClick={() => router.visit('/register')}
                >
                    [ Register ]
                </span>
            </div>
        </div>
    );
}
