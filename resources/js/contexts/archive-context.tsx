import { createContext, useContext } from 'react';
import type { ApiUniverse } from '@/types/api';

type ArchiveContextValue = {
    universes: ApiUniverse[];
    currentUniverse: ApiUniverse | null;
};

export const ArchiveContext = createContext<ArchiveContextValue>({
    universes: [],
    currentUniverse: null,
});

export function useArchive(): ArchiveContextValue {
    return useContext(ArchiveContext);
}
