import { useEffect, useState } from 'react';

export function WikiReadingProgress({ color }: { color?: string }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        function onScroll() {
            const el = document.documentElement;
            const scrollTop = el.scrollTop || document.body.scrollTop;
            const scrollHeight = el.scrollHeight - el.clientHeight;
            setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    if (progress <= 0) return null;

    return (
        <div className="fixed left-0 right-0 z-50 h-0.5" style={{ top: 0 }}>
            <div
                className="h-full transition-[width] duration-100 ease-out"
                style={{
                    width: `${progress}%`,
                    backgroundColor: color ?? 'var(--universe-primary, #2563eb)',
                }}
            />
        </div>
    );
}
