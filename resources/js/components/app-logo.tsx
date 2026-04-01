import AppLogoIcon from '@/components/app-logo-icon';
import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { name: appName, branding } = usePage().props;
    const appLogo = branding?.logo_url;
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sky-100 dark:bg-sky-900 text-sidebar-primary-foreground">
                {/* <AppLogoIcon className="size-7 fill-current text-sky-500 dark:text-sky-100" /> */}

                {appLogo ? 
                    <img src={appLogo} alt={appName+" Logo"} className="size-7" />
                : 
                    <AppLogoIcon className="size-7 text-blue-600" />    
                }
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    Archives
                </span>
            </div>
        </>
    );
}
