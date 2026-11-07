"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UnauthorizedPage() {
    const [signingOut, setSigningOut] =
        useState(false);

    async function signOut() {
        setSigningOut(true);

        const supabase =
            createClient();

        await supabase.auth.signOut();

        window.location.href =
            "/login";
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "100px 20px",
                background: "#f8f7ff",
                color: "#171717",
            }}
        >
            <section
                style={{
                    width: "100%",
                    maxWidth: "780px",
                    padding: "40px",
                    border: "1px solid #e4e1ea",
                    borderRadius: "24px",
                    background: "#ffffff",
                    boxShadow:
                        "0 8px 30px rgba(0,0,0,0.06)",
                }}
            >
                <p
                    style={{
                        margin: "0 0 28px",
                        color: "#8468ff",
                        fontSize: "14px",
                        fontWeight: 800,
                        letterSpacing: "2px",
                    }}
                >
                    ACCESS DENIED
                </p>

                <h1
                    style={{
                        margin: "0 0 24px",
                        fontSize: "48px",
                        lineHeight: 1.1,
                    }}
                >
                    You are not an administrator.
                </h1>

                <p
                    style={{
                        margin: "0 0 20px",
                        fontSize: "20px",
                    }}
                >
                    This account does not have
                    superadmin access.
                </p>

                <button
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                    style={{
                        padding: "12px 22px",
                        border: "none",
                        borderRadius: "12px",
                        background: "#171717",
                        color: "white",
                        fontSize: "17px",
                        fontWeight: 600,
                        cursor: signingOut
                            ? "not-allowed"
                            : "pointer",
                        opacity: signingOut
                            ? 0.6
                            : 1,
                    }}
                >
                    {signingOut
                        ? "Signing out..."
                        : "Sign out"}
                </button>
            </section>
        </main>
    );
}