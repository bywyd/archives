import { Link } from '@inertiajs/react';
import { ArrowRight, ExternalLink } from 'lucide-react';

type Props = {
    universeSlug: string;
    entitySlug: string;
};

export function OpenInWorkspace({ universeSlug, entitySlug }: Props) {
    return (
        <Link
            href={`/archives/${universeSlug}?open=entity-dossier&universe=${encodeURIComponent(universeSlug)}&entity=${encodeURIComponent(entitySlug)}`}
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-md transition-all no-underline shadow-sm hover:bg-blue-100 hover:border-blue-600 hover:text-blue-700 hover:shadow-md hover:-translate-y-px active:translate-y-0"
        >
            <ExternalLink className="size-3.5" />
            <span>Open in Archives</span>
            <ArrowRight className="size-3 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
        </Link>
    );
}
