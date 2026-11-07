"use client";

import Script from "next/script";
import { useRef } from "react";

type GoogleAccounts = {
    accounts: {
        id: {
            initialize: (config: {
                client_id: string;
                ux_mode: "redirect";
                login_uri: string;
            }) => void;

            renderButton: (
                element: HTMLElement,
                options: {
                    theme: string;
                    size: string;
                    text: string;
                    shape: string;
                }
            ) => void;
        };
    };
};

declare global {
    interface Window {
        google?: GoogleAccounts;
    }
}

export default function GoogleSignIn() {
    const buttonRef = useRef<HTMLDivElement>(null);

    function renderGoogleButton() {
        if (!window.google || !buttonRef.current) return;

        window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            ux_mode: "redirect",
            login_uri: `${window.location.origin}/auth/callback`,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
        });
    }

    return (
        <>
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onReady={renderGoogleButton}
            />

            <div ref={buttonRef} />
        </>
    );
}
