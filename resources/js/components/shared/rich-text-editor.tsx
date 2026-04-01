/**
 * RichTextEditor - TipTap-based WYSIWYG editor used by both the archives workbench
 * (entity-editor sections tab) and the wiki inline edit forms.
 *
 * Features:
 * - Full formatting toolbar: bold, italic, h2/h3/h4, bullet/ordered lists, blockquote, code, hr
 * - External URL link insertion
 * - Entity cross-reference link insertion via in-editor search popover
 * - Stores entity refs as <a class="entity-ref" data-entity-slug ...> HTML
 * - `theme='arc'` uses arc- CSS classes; `theme='wiki'` uses Tailwind classes
 */
import { EditorContent, Mark, mergeAttributes, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold,
    Code,
    HelpCircle,
    Italic,
    Link as LinkIcon,
    Link2Off,
    List,
    ListOrdered,
    Minus,
    Quote,
    Search,
    Type,
    Unlink,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiSearchResult } from '@/types/api';

// 
// EntityRef TipTap Mark Extension
// 

export const EntityRefExtension = Mark.create({
    name: 'entityRef',
    priority: 1001,

    addAttributes() {
        return {
            href: { default: null },
            entitySlug: { default: null, parseHTML: (el) => el.getAttribute('data-entity-slug') },
            entityName: { default: null, parseHTML: (el) => el.getAttribute('data-entity-name') },
            entityType: { default: null, parseHTML: (el) => el.getAttribute('data-entity-type') },
            entityDesc: { default: null, parseHTML: (el) => el.getAttribute('data-entity-desc') },
        };
    },

    parseHTML() {
        return [{ tag: 'a[data-entity-slug]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'a',
            mergeAttributes(HTMLAttributes, {
                class: 'entity-ref entity-ref-mark',
                href: HTMLAttributes.href ?? '#',
                'data-entity-slug': HTMLAttributes.entitySlug,
                'data-entity-name': HTMLAttributes.entityName,
                'data-entity-type': HTMLAttributes.entityType,
                'data-entity-desc': HTMLAttributes.entityDesc,
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setEntityRef:
                (attrs: { entitySlug: string; entityName: string; entityType?: string | null; entityDesc?: string | null; href: string; label?: string }) =>
                ({ chain, state }) => {
                    const { selection } = state;
                    const hasSelection = !selection.empty;
                    if (hasSelection) {
                        return chain()
                            .setMark('entityRef', {
                                href: attrs.href,
                                entitySlug: attrs.entitySlug,
                                entityName: attrs.entityName,
                                entityType: attrs.entityType ?? null,
                                entityDesc: attrs.entityDesc ?? null,
                            })
                            .run();
                    }
                    // No selection - insert label as text with the mark
                    const label = attrs.label || attrs.entityName;
                    return chain()
                        .insertContent({
                            type: 'text',
                            text: label,
                            marks: [
                                {
                                    type: 'entityRef',
                                    attrs: {
                                        href: attrs.href,
                                        entitySlug: attrs.entitySlug,
                                        entityName: attrs.entityName,
                                        entityType: attrs.entityType ?? null,
                                        entityDesc: attrs.entityDesc ?? null,
                                    },
                                },
                            ],
                        })
                        .run();
                },
            unsetEntityRef:
                () =>
                ({ chain }) => {
                    return chain().unsetMark('entityRef').run();
                },
        } as any;
    },
});

// 
// Component Props
// 

type Props = {
    value: string;
    onChange: (html: string) => void;
    universeId: number;
    universeSlug: string;
    theme?: 'wiki' | 'arc';
    placeholder?: string;
    minHeight?: number;
};

// 
// Entity Link Popover
// 

function EntityLinkPopover({
    universeId,
    universeSlug,
    onSelect,
    onClose,
    theme,
}: {
    universeId: number;
    universeSlug: string;
    onSelect: (result: ApiSearchResult, label: string) => void;
    onClose: () => void;
    theme: 'wiki' | 'arc';
}) {
    const [query, setQuery] = useState('');
    const [label, setLabel] = useState('');
    const [results, setResults] = useState<ApiSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [highlighted, setHighlighted] = useState<ApiSearchResult | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const search = useCallback((q: string) => {
        if (!q.trim()) { setResults([]); return; }
        setLoading(true);
        api.universeSearch(universeId, q)
            .then((res) => { setResults(res.data.slice(0, 8)); })
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, [universeId]);

    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 220);
    };

    const handleSelect = (result: ApiSearchResult) => {
        setHighlighted(result);
        setLabel(result.name);
    };

    const handleConfirm = () => {
        if (!highlighted) return;
        onSelect(highlighted, label || highlighted.name);
    };

    const isArc = theme === 'arc';

    return (
        <div
            className={cn(
                'absolute left-0 top-full z-50 mt-1 w-80 rounded border shadow-lg',
                isArc
                    ? 'border-[var(--arc-border)] bg-[var(--arc-surface)]'
                    : 'border-slate-200 bg-white',
            )}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        >
            <div className={cn('flex items-center gap-2 border-b px-2 py-1.5', isArc ? 'border-[var(--arc-border)]' : 'border-slate-100')}>
                <Search className={cn('size-3 shrink-0', isArc ? 'text-[var(--arc-accent)]' : 'text-blue-500')} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Search entity…"
                    className={cn('flex-1 bg-transparent text-xs outline-none', isArc ? 'text-[var(--arc-text)] placeholder:text-[var(--arc-text-muted)]' : 'text-slate-900 placeholder:text-slate-400')}
                />
                <button onClick={onClose} className={cn('shrink-0', isArc ? 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]' : 'text-slate-400 hover:text-slate-700')}>
                    <X className="size-3" />
                </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <ul className="max-h-48 overflow-y-auto py-1">
                    {results.map((r) => (
                        <li key={r.id}>
                            <button
                                type="button"
                                onClick={() => handleSelect(r)}
                                className={cn(
                                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                                    highlighted?.id === r.id
                                        ? isArc ? 'bg-[var(--arc-accent-dim)] text-[var(--arc-accent)]' : 'bg-blue-50 text-blue-700'
                                        : isArc ? 'text-[var(--arc-text)] hover:bg-[var(--arc-surface-hover)]' : 'text-slate-800 hover:bg-slate-50',
                                )}
                            >
                                <span className="flex-1 truncate font-medium">{r.name}</span>
                                {r.entity_type && (
                                    <span className={cn('shrink-0 rounded px-1 py-0.5 text-[9px] uppercase tracking-wide', isArc ? 'bg-[var(--arc-surface-alt)] text-[var(--arc-text-muted)]' : 'bg-slate-100 text-slate-500')}>
                                        {r.entity_type.name}
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {!loading && query.trim() && results.length === 0 && (
                <p className={cn('px-3 py-2 text-xs', isArc ? 'text-[var(--arc-text-muted)]' : 'text-slate-400')}>No results</p>
            )}
            {loading && <p className={cn('px-3 py-2 text-xs', isArc ? 'text-[var(--arc-text-muted)]' : 'text-slate-400')}>Searching…</p>}

            {/* Label override + confirm */}
            {highlighted && (
                <div className={cn('border-t px-2 pb-2 pt-2 space-y-1.5', isArc ? 'border-[var(--arc-border)]' : 'border-slate-100')}>
                    <label className={cn('block text-[9px] uppercase tracking-wide', isArc ? 'text-[var(--arc-text-muted)]' : 'text-slate-400')}>Link label</label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className={cn('w-full rounded border px-2 py-1 text-xs outline-none', isArc ? 'border-[var(--arc-border)] bg-[var(--arc-surface)] text-[var(--arc-text)]' : 'border-slate-200 bg-white text-slate-900 focus:border-blue-400')}
                        placeholder="Display text…"
                    />
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={cn('w-full rounded px-2 py-1 text-xs font-semibold', isArc ? 'bg-[var(--arc-accent)] text-white hover:opacity-90' : 'bg-blue-600 text-white hover:bg-blue-700')}
                    >
                        Insert link
                    </button>
                </div>
            )}
        </div>
    );
}

// 
// Toolbar Button helper
// 

function ToolBtn({
    active,
    onClick,
    title,
    children,
    theme,
    disabled,
}: {
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    theme: 'wiki' | 'arc';
    disabled?: boolean;
}) {
    const isArc = theme === 'arc';
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className={cn(
                'flex size-6 items-center justify-center rounded text-xs transition-colors',
                active
                    ? isArc ? 'bg-[var(--arc-accent)] text-white' : 'bg-blue-100 text-blue-700'
                    : isArc ? 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-alt)] hover:text-[var(--arc-text)]' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                disabled && 'opacity-40 cursor-not-allowed',
            )}
        >
            {children}
        </button>
    );
}

// 
// Editor Help Panel
// 

const SHORTCUTS: { keys: string; label: string }[] = [
    { keys: 'Ctrl+B', label: 'Bold' },
    { keys: 'Ctrl+I', label: 'Italic' },
    { keys: 'Ctrl+Alt+2', label: 'Heading 2' },
    { keys: 'Ctrl+Alt+3', label: 'Heading 3' },
    { keys: 'Ctrl+Alt+4', label: 'Heading 4' },
    { keys: 'Ctrl+Shift+8', label: 'Bullet list' },
    { keys: 'Ctrl+Shift+7', label: 'Ordered list' },
    { keys: 'Ctrl+Shift+B', label: 'Blockquote' },
    { keys: 'Ctrl+`', label: 'Inline code' },
];

const HTML_OUTPUTS: { format: string; tag: string; note?: string }[] = [
    { format: 'Bold', tag: '<strong>' },
    { format: 'Italic', tag: '<em>' },
    { format: 'Heading 2 / 3 / 4', tag: '<h2> · <h3> · <h4>' },
    { format: 'Bullet list', tag: '<ul><li>' },
    { format: 'Ordered list', tag: '<ol><li>' },
    { format: 'Blockquote', tag: '<blockquote>' },
    { format: 'Inline code', tag: '<code>' },
    { format: 'Horizontal rule', tag: '<hr>' },
    { format: 'External link', tag: '<a href="…">', note: 'Opens URL prompt' },
    { format: 'Entity reference', tag: '<a class="entity-ref" data-entity-slug="…">', note: 'Entity-aware link' },
];

function EditorHelpPanel({ theme }: { theme: 'wiki' | 'arc' }) {
    const isArc = theme === 'arc';
    const label = isArc
        ? 'arc-mono text-[9px] font-bold uppercase tracking-widest text-[var(--arc-accent)] mb-1.5'
        : 'text-[10px] font-semibold uppercase tracking-wide text-blue-600 mb-1.5';
    const mono = isArc
        ? 'font-mono text-[9px] text-[var(--arc-accent)] bg-[var(--arc-surface-alt)] px-1 py-0.5 rounded'
        : 'font-mono text-[10px] text-blue-700 bg-blue-50 px-1 py-0.5 rounded';
    const muted = isArc ? 'text-[var(--arc-text-muted)]' : 'text-slate-400';
    const row = isArc
        ? 'flex items-start gap-2 border-b border-[var(--arc-border)]/40 py-1'
        : 'flex items-start gap-2 border-b border-slate-100 py-1';
    const note = isArc ? 'text-[var(--arc-text-muted)] text-[9px]' : 'text-slate-400 text-[10px]';

    return (
        <div
            className={cn(
                'grid grid-cols-2 gap-x-6 gap-y-0 border-b px-3 py-3 text-xs',
                isArc
                    ? 'border-[var(--arc-border)] bg-[var(--arc-surface-alt)]/60'
                    : 'border-slate-100 bg-slate-50/80',
            )}
        >
            {/* Keyboard Shortcuts */}
            <div>
                <p className={label}>Keyboard Shortcuts</p>
                <div className="space-y-0">
                    {SHORTCUTS.map((s) => (
                        <div key={s.keys} className={row}>
                            <code className={cn(mono, 'shrink-0 whitespace-nowrap')}>{s.keys}</code>
                            <span className={cn('flex-1', muted)}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* HTML output + entity ref info */}
            <div>
                <p className={label}>HTML Output</p>
                <div className="space-y-0">
                    {HTML_OUTPUTS.map((h) => (
                        <div key={h.format} className={row}>
                            <span className={cn('w-28 shrink-0', muted)}>{h.format}</span>
                            <code className={mono}>{h.tag}</code>
                            {h.note && <span className={note}>{h.note}</span>}
                        </div>
                    ))}
                </div>

                <div className={cn('mt-3 rounded border p-2 text-[10px] space-y-1', isArc ? 'border-[var(--arc-accent)]/20 bg-[var(--arc-accent)]/5' : 'border-blue-100 bg-blue-50/60')}>
                    <p className={cn('font-semibold', isArc ? 'text-[var(--arc-accent)]' : 'text-blue-700')}>Entity Reference rendering</p>
                    <p className={muted}>
                        <span className={cn('font-medium', isArc ? 'text-[var(--arc-text)]' : 'text-slate-700')}>Archives (arc):</span>{' '}
                        Clicking an entity link opens the entity dossier panel inline.
                    </p>
                    <p className={muted}>
                        <span className={cn('font-medium', isArc ? 'text-[var(--arc-text)]' : 'text-slate-700')}>Wiki (public):</span>{' '}
                        Hovering an entity link shows a floating tooltip card with name, type, and description.
                    </p>
                </div>
            </div>
        </div>
    );
}

// 
// Main RichTextEditor component
// 

export function RichTextEditor({
    value,
    onChange,
    universeId,
    universeSlug,
    theme = 'wiki',
    placeholder = 'Write section content…',
    minHeight = 140,
}: Props) {
    const [entityPopoverOpen, setEntityPopoverOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const isArc = theme === 'arc';

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3, 4] },
                // Disable code block (we only use inline code)
                codeBlock: false,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-blue-600 underline' },
            }),
            Placeholder.configure({ placeholder }),
            EntityRefExtension,
        ],
        content: value,
        onUpdate: ({ editor: e }) => {
            onChange(e.getHTML());
        },
        editorProps: {
            attributes: {
                class: cn(
                    'outline-none',
                    isArc
                        ? 'text-[var(--arc-text)] text-xs leading-relaxed'
                        : 'text-sm leading-relaxed text-slate-800',
                ),
            },
        },
    });

    // Sync external value changes into editor
    const valueRef = useRef(value);
    useEffect(() => {
        if (!editor || value === valueRef.current) return;
        valueRef.current = value;
        // Only update if content genuinely differs
        if (editor.getHTML() !== value) {
            editor.commands.setContent(value, false);
        }
    }, [editor, value]);

    const handleInsertLink = () => {
        if (!editor) return;
        const url = window.prompt('Enter URL:');
        if (!url) return;
        if (editor.state.selection.empty) {
            editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
        } else {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    const handleEntitySelect = (result: ApiSearchResult, label: string) => {
        if (!editor) return;
        editor.chain().focus().setEntityRef({
            entitySlug: result.slug,
            entityName: result.name,
            entityType: result.entity_type?.name ?? null,
            entityDesc: result.short_description ?? null,
            href: `/w/${universeSlug}/${result.slug}`,
            label,
        } as any).run();
        setEntityPopoverOpen(false);
    };

    if (!editor) return null;

    const isEntityRefActive = editor.isActive('entityRef');

    return (
        <div
            className={cn(
                'rounded border',
                isArc
                    ? 'border-[var(--arc-border)] bg-[var(--arc-surface)]'
                    : 'border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400',
            )}
        >
            {/* Toolbar */}
            <div
                className={cn(
                    'flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1',
                    isArc ? 'border-[var(--arc-border)] bg-[var(--arc-surface-alt)]' : 'border-slate-100 bg-slate-50',
                )}
            >
                <ToolBtn theme={theme} title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-3" /></ToolBtn>
                <ToolBtn theme={theme} title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-3" /></ToolBtn>

                <div className={cn('mx-1 h-4 w-px', isArc ? 'bg-[var(--arc-border)]' : 'bg-slate-200')} />

                <ToolBtn theme={theme} title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <span className="text-[9px] font-bold">H2</span>
                </ToolBtn>
                <ToolBtn theme={theme} title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                    <span className="text-[9px] font-bold">H3</span>
                </ToolBtn>
                <ToolBtn theme={theme} title="Heading 4" active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
                    <span className="text-[9px] font-bold">H4</span>
                </ToolBtn>

                <div className={cn('mx-1 h-4 w-px', isArc ? 'bg-[var(--arc-border)]' : 'bg-slate-200')} />

                <ToolBtn theme={theme} title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-3" /></ToolBtn>
                <ToolBtn theme={theme} title="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-3" /></ToolBtn>

                <div className={cn('mx-1 h-4 w-px', isArc ? 'bg-[var(--arc-border)]' : 'bg-slate-200')} />

                <ToolBtn theme={theme} title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-3" /></ToolBtn>
                <ToolBtn theme={theme} title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="size-3" /></ToolBtn>
                <ToolBtn theme={theme} title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-3" /></ToolBtn>

                <div className={cn('mx-1 h-4 w-px', isArc ? 'bg-[var(--arc-border)]' : 'bg-slate-200')} />

                <ToolBtn theme={theme} title="Insert external link" active={editor.isActive('link')} onClick={handleInsertLink}><LinkIcon className="size-3" /></ToolBtn>
                {editor.isActive('link') && (
                    <ToolBtn theme={theme} title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className="size-3" /></ToolBtn>
                )}

                <div className={cn('mx-1 h-4 w-px', isArc ? 'bg-[var(--arc-border)]' : 'bg-slate-200')} />

                {/* Entity link button */}
                <div className="relative">
                    <ToolBtn
                        theme={theme}
                        title={isEntityRefActive ? 'Remove entity link' : 'Insert entity reference link'}
                        active={isEntityRefActive || entityPopoverOpen}
                        onClick={() => {
                            if (isEntityRefActive) {
                                editor.chain().focus().unsetEntityRef().run();
                            } else {
                                setEntityPopoverOpen((o) => !o);
                            }
                        }}
                    >
                        <span className="flex items-center gap-0.5">
                            <Link2Off className="size-3" />
                            <span className={cn('text-[8px] font-bold leading-none', isArc ? '' : 'text-blue-600')}>EN</span>
                        </span>
                    </ToolBtn>

                    {entityPopoverOpen && (
                        <EntityLinkPopover
                            universeId={universeId}
                            universeSlug={universeSlug}
                            onSelect={handleEntitySelect}
                            onClose={() => setEntityPopoverOpen(false)}
                            theme={theme}
                        />
                    )}
                </div>

                {/* Spacer + help toggle */}
                <div className="ml-auto">
                    <ToolBtn
                        theme={theme}
                        title={helpOpen ? 'Hide formatting help' : 'Show formatting help'}
                        active={helpOpen}
                        onClick={() => setHelpOpen((o) => !o)}
                    >
                        <HelpCircle className="size-3" />
                    </ToolBtn>
                </div>
            </div>

            {/* Collapsible help panel */}
            {helpOpen && <EditorHelpPanel theme={theme} />}

            {/* Editor area */}
            <div
                className={cn('prose-content px-3 py-2.5')}
                style={{ minHeight }}
                onClick={() => editor.commands.focus()}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
