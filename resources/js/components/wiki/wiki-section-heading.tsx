import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type Props = {
    id: string;
    title: string;
    icon?: ReactNode;
    count?: number;
    level?: 'h2' | 'h3';
    collapsible?: boolean;
    defaultOpen?: boolean;
    actions?: ReactNode;
    children?: ReactNode;
};

export function WikiSectionHeading({
    id,
    title,
    icon,
    count,
    level = 'h2',
    collapsible = false,
    defaultOpen = true,
    actions,
    children,
}: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const Tag = level;

    const headingClasses =
        level === 'h2'
            ? 'text-xl font-semibold text-slate-900 dark:text-slate-100'
            : 'text-lg font-semibold text-slate-800 dark:text-slate-200';

    return (
        <div className="mb-8 scroll-mt-20" id={id}>
            <div className="mb-4 flex items-center gap-2 border-b-2 border-blue-100 pb-2 dark:border-blue-900/40">
                {collapsible ? (
                    <button
                        onClick={() => setOpen(!open)}
                        className="flex flex-1 items-center gap-2 text-left"
                    >
                        {icon && <span className="shrink-0">{icon}</span>}
                        <Tag className={headingClasses}>
                            <a href={`#${id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                {title}
                            </a>
                        </Tag>
                        {count != null && (
                            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {count}
                            </span>
                        )}
                        <ChevronDown
                            className={`ml-auto size-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
                                open ? 'rotate-0' : '-rotate-90'
                            }`}
                        />
                    </button>
                ) : (
                    <div className="flex flex-1 items-center gap-2">
                        {icon && <span className="shrink-0">{icon}</span>}
                        <Tag className={headingClasses}>
                            <a href={`#${id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                {title}
                            </a>
                        </Tag>
                        {count != null && (
                            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {count}
                            </span>
                        )}
                    </div>
                )}
                {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
            </div>

            {collapsible ? (
                <div
                    className={`grid transition-all duration-200 ease-in-out ${
                        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                >
                    <div className="overflow-hidden">{children}</div>
                </div>
            ) : (
                children
            )}
        </div>
    );
}
