import { createContext, useCallback, useContext, useState } from 'react';
import { router } from '@inertiajs/react';

type WikiEditContextType = {
    editMode: boolean;
    setEditMode: (on: boolean) => void;
    saving: boolean;
    setSaving: (s: boolean) => void;
    refreshData: () => void;
};

const WikiEditContext = createContext<WikiEditContextType>({
    editMode: false,
    setEditMode: () => {},
    saving: false,
    setSaving: () => {},
    refreshData: () => {},
});

export function WikiEditProvider({ children }: { children: React.ReactNode }) {
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const refreshData = useCallback(() => {
        router.reload({ preserveScroll: true });
    }, []);

    return (
        <WikiEditContext.Provider value={{ editMode, setEditMode, saving, setSaving, refreshData }}>
            {children}
        </WikiEditContext.Provider>
    );
}

export function useWikiEdit() {
    return useContext(WikiEditContext);
}
