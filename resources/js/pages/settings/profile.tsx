import { Transition } from '@headlessui/react';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit(),
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Profile information"
                        description="Update your name and email address"
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Click here to resend the
                                                    verification email.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    A new verification link has
                                                    been sent to your email
                                                    address.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                {/*  Agent Profile  */}
                                <div className="border-t pt-6">
                                    <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        Agent Profile
                                    </p>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="agent_codename">Agent Codename</Label>
                                            <Input
                                                id="agent_codename"
                                                name="agent_codename"
                                                defaultValue={(auth.user.agent_codename as string | null) ?? ''}
                                                placeholder="e.g. WRAITH"
                                            />
                                            <InputError message={errors.agent_codename} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="clearance_level">Clearance Level</Label>
                                            <select
                                                id="clearance_level"
                                                name="clearance_level"
                                                defaultValue={(auth.user.clearance_level as string | null) ?? 'LEVEL-1'}
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                                            >
                                                {['LEVEL-1', 'LEVEL-2', 'LEVEL-3', 'LEVEL-4', 'LEVEL-5'].map((lvl) => (
                                                    <option key={lvl} value={lvl}>{lvl}</option>
                                                ))}
                                            </select>
                                            <InputError message={errors.clearance_level} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="rank">Rank / Title</Label>
                                            <Input
                                                id="rank"
                                                name="rank"
                                                defaultValue={(auth.user.rank as string | null) ?? ''}
                                                placeholder="e.g. Senior Analyst"
                                            />
                                            <InputError message={errors.rank} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="department">Department</Label>
                                            <Input
                                                id="department"
                                                name="department"
                                                defaultValue={(auth.user.department as string | null) ?? ''}
                                                placeholder="e.g. Special Operations"
                                            />
                                            <InputError message={errors.department} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="assigned_since">Assigned Since</Label>
                                            <Input
                                                id="assigned_since"
                                                name="assigned_since"
                                                type="date"
                                                defaultValue={(auth.user.assigned_since as string | null) ?? ''}
                                            />
                                            <InputError message={errors.assigned_since} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Save
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            Saved
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
