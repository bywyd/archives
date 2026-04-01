import { useState, useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Globe, Search } from 'lucide-react';
import { OperationsMap } from '@/components/workbench/operations-map';
import AppLogoIcon from '@/components/app-logo-icon';
import { useArchive } from '@/contexts/archive-context';
import * as api from '@/lib/api';
import type { ApiUniverse } from '@/types/api';

export function UniverseSelectorScreen() {
    const { universes: preloaded } = useArchive();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ApiUniverse[] | null>(null);
    const [searching, setSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { name: appName, branding } = usePage().props;
    const appLogo = branding?.logo_url;

    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            setResults(null);
            setSearching(false);
            return;
        }
        setSearching(true);
        const t = setTimeout(() => {
            api.searchUniverses(trimmed)
                .then((r) => setResults(r.data))
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const displayed = results ?? preloaded;

    return (
        <div className="relative flex h-screen w-screen overflow-hidden">
            {/* Full-screen operations map as backdrop */}
            <div className="absolute inset-0">
                <OperationsMap />
            </div>

            {/* Centered overlay */}
            <div className="relative z-30 flex h-full w-full flex-col items-center justify-center">
                {/* Branding */}
                <div className="pointer-events-none mb-6 flex select-none flex-col items-center gap-2">
                    {/* <AppLogoIcon className="size-14 text-blue-600/80" /> */}
                    {appLogo ? 
                        <img src={appLogo} alt={appName+" Logo"} className="size-14" />
                    : 
                        <AppLogoIcon className="size-14 text-blue-400" />    
                    }
                    <div className="flex flex-col items-center gap-0.5">
                        <span
                            className="font-mono text-2xl font-extrabold uppercase tracking-[0.25em]"
                            style={{ color: 'rgba(37,99,235,0.9)' }}
                        >
                            ARCHIVES
                        </span>
                        <span
                            className="font-mono text-[9px] uppercase tracking-[0.2em]"
                            style={{ color: 'rgba(100,116,139,0.7)' }}
                        >
                            SELECT UNIVERSE TO ACCESS
                        </span>
                    </div>
                </div>

                {/* Search input */}
                <div
                    className="mb-4 flex w-full max-w-sm items-center gap-2.5 px-4 py-2"
                    style={{
                        background: 'rgba(15,23,42,0.92)',
                        border: '1px solid rgba(37,99,235,0.25)',
                        borderLeftWidth: 3,
                        borderLeftColor: 'rgba(37,99,235,0.55)',
                    }}
                >
                    <Search size={11} className="shrink-0" style={{ color: 'rgba(96,165,250,0.5)' }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search universes…"
                        className="flex-1 bg-transparent font-mono text-[11px] placeholder:text-slate-700 focus:outline-none"
                        style={{ color: 'rgba(203,213,225,0.9)', letterSpacing: '0.04em' }}
                        autoFocus
                    />
                    {searching && (
                        <span
                            className="font-mono text-[8px] uppercase tracking-widest"
                            style={{ color: 'rgba(96,165,250,0.4)' }}
                        >
                            …
                        </span>
                    )}
                    {query && !searching && (
                        <button
                            onClick={() => setQuery('')}
                            style={{ color: 'rgba(100,116,139,0.6)' }}
                        >
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Universe cards */}
                {displayed.length === 0 && !searching ? (
                    <div
                        className="flex flex-col items-center gap-2 px-8 py-10 select-none"
                        style={{
                            background: 'rgba(15,23,42,0.92)',
                            border: '1px solid rgba(37,99,235,0.2)',
                            borderLeftWidth: '3px',
                            borderLeftColor: 'rgba(37,99,235,0.45)',
                        }}
                    >
                        <Globe className="size-5 text-slate-600" />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                            {query ? 'No universes found' : 'No universes on record'}
                        </span>
                    </div>
                ) : (
                    <div className="flex max-w-3xl flex-wrap justify-center gap-3 px-8">
                        {displayed.map((u) => (
                            <Link
                                key={u.id}
                                href={`/archives/${u.slug}`}
                                className="group flex w-56 flex-col gap-2 p-4 transition-all"
                                style={{
                                    background: 'rgba(15,23,42,0.88)',
                                    border: '1px solid rgba(37,99,235,0.2)',
                                    borderLeftWidth: '3px',
                                    borderLeftColor: 'rgba(37,99,235,0.4)',
                                }}
                                onMouseEnter={(e) => {
                                    const el = e.currentTarget;
                                    el.style.background = 'rgba(15,23,42,0.97)';
                                    el.style.borderLeftColor = 'rgba(37,99,235,0.85)';
                                }}
                                onMouseLeave={(e) => {
                                    const el = e.currentTarget;
                                    el.style.background = 'rgba(15,23,42,0.88)';
                                    el.style.borderLeftColor = 'rgba(37,99,235,0.4)';
                                }}
                            >
                                {/* Name row */}
                                <div className="flex items-center gap-2">
                                    <Globe
                                        className="size-3.5 shrink-0 transition-colors"
                                        style={{ color: 'rgba(96,165,250,0.65)' }}
                                    />
                                    <span className="flex-1 truncate font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                                        {u.name}
                                    </span>
                                </div>

                                {/* Description */}
                                {u.description && (
                                    <p
                                        className="font-mono text-[9px] leading-relaxed"
                                        style={{
                                            color: 'rgba(100,116,139,0.75)',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        } as React.CSSProperties}
                                    >
                                        {u.description}
                                    </p>
                                )}

                                {/* Footer row */}
                                <div
                                    className="mt-auto flex items-center gap-2 pt-1.5"
                                    style={{ borderTop: '1px solid rgba(37,99,235,0.10)' }}
                                >
                                    {u.entities_count != null && (
                                        <span className="font-mono text-[8px] uppercase tracking-wider text-slate-500">
                                            <span className="text-slate-300">{u.entities_count}</span>{' '}
                                            ENTITIES
                                        </span>
                                    )}
                                    <span
                                        className="ml-auto font-mono text-[8px] uppercase tracking-widest transition-colors"
                                        style={{ color: 'rgba(96,165,250,0.45)' }}
                                    >
                                        ACCESS →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
