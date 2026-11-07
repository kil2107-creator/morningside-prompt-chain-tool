
import Link from "next/link";

import {
    notFound,
} from "next/navigation";

import {
    requireSuperadmin,
} from "@/lib/require-superadmin";

import SignOutButton from "@/app/sign-out-button";

import RunChainForm from "./run-chain-form";


type Props = {
    params: Promise<{
        id: string;
    }>;
};


export const dynamic =
    "force-dynamic";


export default async function RunChainPage({
                                               params,
                                           }: Props) {
    const {
        id,
    } =
        await params;


    const {
        admin,
    } =
        await requireSuperadmin();


    const {
        data: chain,
        error,
    } =
        await admin
            .from(
                "prompt_chains"
            )
            .select(
                "id, name, slug, description, is_active"
            )
            .eq(
                "id",
                id
            )
            .maybeSingle();


    if (error) {
        throw new Error(
            `Could not load prompt chain: ${error.message}`
        );
    }


    if (!chain) {
        notFound();
    }


    const {
        data: steps,
        error:
            stepsError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "id"
            )
            .eq(
                "prompt_chain_id",
                id
            );


    if (
        stepsError
    ) {
        throw new Error(
            `Could not load prompt steps: ${stepsError.message}`
        );
    }


    return (
        <main className="tool-page">
            <div className="tool-container">

                <Link
                    href={`/chains/${chain.id}`}
                    className="back-link"
                >
                    ← Back to Chain
                </Link>


                <header className="chain-detail-header">
                    <div>
                        <p className="tool-eyebrow">
                            Run Prompt Chain
                        </p>

                        <h1>
                            {
                                chain.name
                            }
                        </h1>

                        <p className="tool-subtitle">
                            Upload an image and
                            execute all prompt
                            steps from top to
                            bottom.
                        </p>
                    </div>

                    <SignOutButton />
                </header>


                <RunChainForm
                    chainId={
                        chain.id
                    }
                    chainName={
                        chain.name
                    }
                    stepCount={
                        steps?.length ??
                        0
                    }
                />
            </div>
        </main>
    );
}

