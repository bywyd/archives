import type { CSSProperties } from 'react';
import type { ApiImage } from '@/types/api';

type UniverseLike = {
    settings?: Record<string, unknown> | null;
    images?: ApiImage[];
} | null | undefined;

/**
 * Extracts branding values from a universe object and converts them into
 * CSS custom properties ready to inject on a container element.
 *
 * Used by both the Archives workbench layout and the Wiki layout so that
 * per-universe theming is handled once and shared across both UIs.
 */
export function useUniverseTheme(universe: UniverseLike) {
    const themeColor = (universe?.settings?.theme_color as string | undefined) || null;
    const images = universe?.images ?? [];

    const iconUrl   = images.find((i) => i.type === 'icon')?.url   ?? null;
    const logoUrl   = images.find((i) => i.type === 'profile')?.url ?? null;
    const bannerUrl = images.find((i) => i.type === 'banner')?.url  ?? null;

    // CSS custom properties injected on the layout root element.
    // --universe-primary:     the exact chosen colour
    // --universe-primary-dim: ~10% opacity tint  → use for subtle backgrounds
    // --universe-primary-20:  ~20% opacity       → use for hover states / borders
    const cssVars: CSSProperties = themeColor
        ? ({
              '--universe-primary':     themeColor,
              '--universe-primary-dim': themeColor + '1a', // 10% opacity
              '--universe-primary-20':  themeColor + '33', // 20% opacity
          } as CSSProperties)
        : {};

    return { themeColor, iconUrl, logoUrl, bannerUrl, cssVars, hasTheme: !!themeColor };
}
