import { useEffect, useState } from 'react';

type TocItem = {
    id: string;
    title: string;
    children?: TocItem[];
};

type Props = {
    toc: TocItem[];
};

export function WikiToc({ toc }: Props) {
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        const ids = toc.flatMap((item) => [item.id, ...(item.children?.map((c) => c.id) ?? [])]);
        const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
        if (elements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                        break;
                    }
                }
            },
            { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [toc]);

    return (
        <div className="hidden w-54 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pl-6 pr-4 lg:block lg:w-60 md:w-56 " style={{ scrollbarWidth: 'thin' }}>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-3.5 pl-2">On this page</p>
            <nav>
                {toc.map((item) => (
                    <div key={item.id}>
                        <a
                            href={`#${item.id}`}
                            className={`block py-1 px-2 text-[0.8125rem] no-underline border-l-2 mb-px leading-snug transition-all rounded-r-md ${
                                activeId === item.id
                                    ? 'text-blue-600 border-l-blue-600 font-medium bg-blue-50'
                                    : 'text-slate-500 border-transparent hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            {item.title}
                        </a>
                        {item.children?.map((child) => (
                            <a
                                key={child.id}
                                href={`#${child.id}`}
                                className={`block py-1 px-2 pl-5 text-xs no-underline border-l-2 mb-px leading-snug transition-all rounded-r-md ${
                                    activeId === child.id
                                        ? 'text-blue-600 border-l-blue-600 font-medium bg-blue-50'
                                        : 'text-slate-400 border-transparent hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {child.title}
                            </a>
                        ))}
                    </div>
                ))}
            </nav>
        </div>
    );
}
