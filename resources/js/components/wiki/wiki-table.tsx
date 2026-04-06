import type { ReactNode } from 'react';

type Column<T> = {
    key: string;
    header: string;
    className?: string;
    render: (row: T) => ReactNode;
};

type Props<T> = {
    columns: Column<T>[];
    data: T[];
    keyFn: (row: T) => string | number;
    className?: string;
};

export function WikiTable<T>({ columns, data, keyFn, className = '' }: Props<T>) {
    if (data.length === 0) return null;

    return (
        <div className={`overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/60 ${className}`}>
            <table className="w-full text-[0.8125rem]">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/50">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-3.5 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${col.className ?? ''}`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr
                            key={keyFn(row)}
                            className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={`px-3.5 py-2.5 align-middle ${col.className ?? ''}`}
                                >
                                    {col.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
