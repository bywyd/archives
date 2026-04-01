// ============================================================
// Archives - Navigation History Store (Zustand)
// Tracks recently viewed entities and provides navigation history
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiEntitySummary, ApiMetaEntityType, ApiMetaEntityStatus, ApiImage } from '@/types/api';

export type HistoryEntry = {
    id: number;
    type: 'entity' | 'universe' | 'timeline' | 'media-source';
    entityId: number;
    universeId: number;
    slug: string;
    name: string;
    shortDescription: string | null;
    entityType: ApiMetaEntityType | null;
    entityStatus: ApiMetaEntityStatus | null;
    profileImage: string | null;
    viewedAt: string;
};

export type PinnedItem = HistoryEntry & {
    pinnedAt: string;
    note?: string;
};

type HistoryStore = {
    history: HistoryEntry[];
    pinned: PinnedItem[];
    maxHistorySize: number;

    addToHistory: (entry: Omit<HistoryEntry, 'viewedAt' | 'id'>) => void;
    clearHistory: () => void;
    removeFromHistory: (entityId: number, universeId: number) => void;

    pinItem: (entry: Omit<PinnedItem, 'pinnedAt' | 'id'>) => void;
    unpinItem: (entityId: number, universeId: number) => void;
    isPinned: (entityId: number, universeId: number) => boolean;
    updatePinNote: (entityId: number, universeId: number, note: string) => void;

    getRecentByUniverse: (universeId: number, limit?: number) => HistoryEntry[];
    getRecentByType: (entityType: string, limit?: number) => HistoryEntry[];
};

let historyIdCounter = 0;

export const useHistoryStore = create<HistoryStore>()(
    persist(
        (set, get) => ({
            history: [],
            pinned: [],
            maxHistorySize: 50,

            addToHistory(entry) {
                set((s) => {
                    // Remove existing entry for same entity to avoid duplicates
                    const filtered = s.history.filter(
                        (h) => !(h.entityId === entry.entityId && h.universeId === entry.universeId)
                    );

                    const newEntry: HistoryEntry = {
                        ...entry,
                        id: ++historyIdCounter,
                        viewedAt: new Date().toISOString(),
                    };

                    // Add new entry at the beginning, limit to maxHistorySize
                    const updated = [newEntry, ...filtered].slice(0, s.maxHistorySize);
                    return { history: updated };
                });
            },

            clearHistory() {
                set({ history: [] });
            },

            removeFromHistory(entityId, universeId) {
                set((s) => ({
                    history: s.history.filter(
                        (h) => !(h.entityId === entityId && h.universeId === universeId)
                    ),
                }));
            },

            pinItem(entry) {
                set((s) => {
                    // Don't allow duplicates
                    if (s.pinned.some((p) => p.entityId === entry.entityId && p.universeId === entry.universeId)) {
                        return s;
                    }

                    const newPinned: PinnedItem = {
                        ...entry,
                        id: ++historyIdCounter,
                        pinnedAt: new Date().toISOString(),
                    };

                    return { pinned: [...s.pinned, newPinned] };
                });
            },

            unpinItem(entityId, universeId) {
                set((s) => ({
                    pinned: s.pinned.filter(
                        (p) => !(p.entityId === entityId && p.universeId === universeId)
                    ),
                }));
            },

            isPinned(entityId, universeId) {
                return get().pinned.some(
                    (p) => p.entityId === entityId && p.universeId === universeId
                );
            },

            updatePinNote(entityId, universeId, note) {
                set((s) => ({
                    pinned: s.pinned.map((p) =>
                        p.entityId === entityId && p.universeId === universeId
                            ? { ...p, note }
                            : p
                    ),
                }));
            },

            getRecentByUniverse(universeId, limit = 10) {
                return get()
                    .history.filter((h) => h.universeId === universeId)
                    .slice(0, limit);
            },

            getRecentByType(entityType, limit = 10) {
                return get()
                    .history.filter((h) => h.entityType?.slug === entityType)
                    .slice(0, limit);
            },
        }),
        {
            name: 'archives-history',
            version: 1,
        }
    )
);
