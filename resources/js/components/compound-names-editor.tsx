import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

export function CompoundNamesEditor({ value, onChange }: {
    value: string[];
    onChange: (names: string[]) => void;
}) {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const addName = () => {
        const name = input.trim();
        if (!name) return;
        if (value.some(v => v.toLowerCase() === name.toLowerCase())) {
            setError('Duplicate phrase');
            return;
        }
        onChange([...value, name]);
        setInput('');
        setError(null);
    };

    const removeName = (idx: number) => {
        onChange(value.filter((_, i) => i !== idx));
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2">
                {value.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No compound names yet.</span>
                )}
                {value.map((name, idx) => (
                    <Badge key={name + idx} variant="secondary" className="flex items-center gap-1 px-2 py-1 text-xs">
                        {name}
                        <button type="button" onClick={() => removeName(idx)} className="ml-1">
                            <X className="size-3.5" />
                        </button>
                    </Badge>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    value={input}
                    onChange={e => { setInput(e.target.value); setError(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') addName(); }}
                    placeholder="Add a new phrase (e.g. raccoon city)"
                    className="flex-1"
                />
                <Button type="button" onClick={addName} size="sm" variant="outline">
                    <Plus className="size-4 mr-1" /> Add
                </Button>
            </div>
            {error && <div className="text-xs text-destructive mt-1">{error}</div>}
        </div>
    );
}
