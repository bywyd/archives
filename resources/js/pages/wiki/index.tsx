import { Head, Link } from '@inertiajs/react';
import { BookOpen, Clock, Globe } from 'lucide-react';
import WikiLayout from '@/layouts/wiki-layout';
import type { ApiImage, ApiUniverse } from '@/types/api';

type Props = {
    universes: (ApiUniverse & { entities_count: number; timelines_count: number; media_sources_count?: number })[];
};

export default function WikiIndex({ universes }: Props) {
    return (
        <WikiLayout breadcrumbs={[{ title: 'Wiki', href: '/w' }, { title: 'All Universes' }]}>
            <Head title={"All Universes"}>
                <meta name="description" content="Browse all fictional universes in the Archives wiki." />
            </Head>

            <h1 className="mb-6 text-xl font-bold text-slate-900">All Universes</h1>

            <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {universes.map((u) => {
                    const banner = u.images?.find((i: ApiImage) => i.type === 'banner' || i.type === 'profile');
                    return (
                        <Link
                            key={u.id}
                            href={`/w/${u.slug}`}
                            className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        >
                            {banner ? (
                                <div className="overflow-hidden">
                                    <img
                                        src={banner.url}
                                        alt={u.name}
                                        loading="lazy"
                                        className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    />
                                </div>
                            ) : (
                                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100/50">
                                    <Globe className="size-10 text-sky-200" />
                                </div>
                            )}
                            <div className="p-4">
                                <h2 className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                                    {u.name}
                                </h2>
                                {u.description && (
                                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{u.description}</p>
                                )}
                                <div className="mt-3 flex gap-3 text-[11px] text-slate-400">
                                    <span className="flex items-center gap-1"><BookOpen className="size-3" /> {u.entities_count} entities</span>
                                    <span className="flex items-center gap-1"><Clock className="size-3" /> {u.timelines_count} timelines</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {universes.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-14 px-6">
                    <Globe className="mx-auto mb-3 size-10 text-slate-400" />
                    <p className="text-sm text-slate-500">No universes yet.</p>
                </div>
            )}
        </WikiLayout>
    );
}
