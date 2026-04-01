import {
    Bug,
    Building,
    Building2,
    Calendar,
    Car,
    Component,
    Cpu,
    Dna,
    Factory,
    FileText,
    Flag,
    FlaskConicalIcon,
    Gem,
    HeartPulse,
    Landmark,
    Lightbulb,
    MapIcon,
    MapPin,
    MicroscopeIcon,
    Pill,
    Radio,
    ShieldCheck,
    Skull,
    Swords,
    TriangleAlertIcon,
    User,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiMetaEntityType } from '@/types/api';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    user: User,
    building: Building,
    calendar: Calendar,
    'map-pin': MapPin,
    landmark: Landmark,
    gem: Gem,
    lightbulb: Lightbulb,
    swords: Swords,
    car: Car,
    'building-2': Building2,
    'file-text': FileText,
    zap: Zap,
    bug: Bug,
    'heart-pulse': HeartPulse,
    pill: Pill,
    'shield-check': ShieldCheck,
    skull: Skull,
    cpu: Cpu,
    dna: Dna,
    flag: Flag,
    factory: Factory, // Alias for building
    'microscope': MicroscopeIcon, // Alias for lightbulb
    'alert-triangle': TriangleAlertIcon, // Alias for alert
    radio: Radio,
    map: MapIcon,
    "flask-conical": FlaskConicalIcon
};

type Props = {
    entityType: ApiMetaEntityType | null;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
};

export function TypeIcon({ entityType, size = 'sm', showLabel = false }: Props) {
    if (!entityType) {
        return null;
    }

    const IconComp = ICON_MAP[entityType.icon ?? ''];
    const iconSizes = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' };
    const textSizes = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' };

    return (
        <span
            className={cn('inline-flex items-center gap-1', textSizes[size])}
            style={{ color: entityType.color ?? '#6B7280' }}
        >
            {IconComp ? (
                <IconComp className={iconSizes[size]} />
            ) : (
                <span
                    className={cn('rounded-sm', iconSizes[size])}
                    style={{ backgroundColor: entityType.color ?? '#6B7280' }}
                />
            )}
            {showLabel && (
                <span className="font-medium uppercase tracking-wider">
                    {entityType.name}
                </span>
            )}
        </span>
    );
}
