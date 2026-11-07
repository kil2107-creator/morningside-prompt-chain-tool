"use client";

import {
    useRouter,
} from "next/navigation";

import {
    createClient,
} from "@/lib/supabase/client";


export default function SignOutButton() {
    const router =
        useRouter();


    async function signOut() {
        const supabase =
            createClient();

        await supabase.auth
            .signOut();

        router.push(
            "/login"
        );

        router.refresh();
    }


    return (
        <button
            type="button"
            onClick={
                signOut
            }
            className="tool-signout-button"
        >
            Sign Out
        </button>
    );
}

