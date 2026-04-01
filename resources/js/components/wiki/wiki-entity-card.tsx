import { Link } from '@inertiajs/react';
import { TypeIcon } from '@/components/archives/type-icon';
import type { ApiEntitySummary, ApiImage } from '@/types/api';

type Props = {
    entity: ApiEntitySummary;
    universeSlug: string;
};

export function WikiEntityCard({ entity, universeSlug }: Props) {
    const profileImage = entity.images?.find((i: ApiImage) => i.type === 'profile');

    return (
        <Link
            href={`/w/${universeSlug}/${entity.slug}`}
            className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
        >
            <div className="relative overflow-hidden">
                {profileImage ? (
                    <img
                        src={profileImage.thumbnail_url ?? profileImage.url}
                        alt={entity.name}
                        className="w-full aspect-[4/3] object-cover block bg-gradient-to-br from-slate-50 to-blue-50 transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                        <span className="text-2xl font-light text-slate-300">
                            {entity.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                {entity.entity_type && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm shadow-sm">
                        <TypeIcon entityType={entity.entity_type} size="sm" />
                        <span className="text-slate-500">{entity.entity_type.name}</span>
                    </div>
                )}
            </div>
            <div className="p-3.5 flex-1 flex flex-col gap-1.5">
                <div className="text-sm font-semibold text-slate-900 leading-tight transition-colors group-hover:text-blue-600">{entity.name}</div>
                {entity.short_description && (
                    <p className="text-xs text-slate-500 leading-normal line-clamp-2">{entity.short_description}</p>
                )}
            </div>
        </Link>
    );
}
