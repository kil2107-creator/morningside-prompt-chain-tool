import Link from "next/link";

import {
    notFound,
} from "next/navigation";

import {
    requireSuperadmin,
} from "@/lib/require-superadmin";

import SignOutButton from "@/app/sign-out-button";


type Props = {
    params: Promise<{
        id: string;
    }>;
};


export const dynamic =
    "force-dynamic";


export default async function GeneratedMediaPage({
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


    /*
     * Load chain.
     */

    const {
        data: chain,
        error:
            chainError,
    } =
        await admin
            .from(
                "prompt_chains"
            )
            .select(
                "id, name"
            )
            .eq(
                "id",
                id
            )
            .maybeSingle();


    if (
        chainError
    ) {
        throw new Error(
            `Could not load prompt chain: ${chainError.message}`
        );
    }


    if (!chain) {
        notFound();
    }


    /*
     * Load runs for this specific chain.
     */

    const {
        data: runs,
        error:
            runsError,
    } =
        await admin
            .from(
                "generation_requests"
            )
            .select(
                "id, image_id, status, error_message, started_at, completed_at"
            )
            .eq(
                "prompt_chain_id",
                chain.id
            )
            .order(
                "started_at",
                {
                    ascending:
                        false,
                }
            );


    if (
        runsError
    ) {
        throw new Error(
            `Could not load generated media: ${runsError.message}`
        );
    }


    const requestIds =
        (
            runs ??
            []
        ).map(
            (
                run
            ) =>
                run.id
        );


    const imageIds =
        Array.from(
            new Set(
                (
                    runs ??
                    []
                )
                    .map(
                        (
                            run
                        ) =>
                            run.image_id
                    )
                    .filter(
                        (
                            value
                        ): value is string =>
                            Boolean(
                                value
                            )
                    )
            )
        );


    /*
     * Load images.
     */

    const {
        data: images,
    } =
        imageIds.length >
        0
            ? await admin
                .from(
                    "images"
                )
                .select(
                    "id, storage_bucket, storage_path, original_filename"
                )
                .in(
                    "id",
                    imageIds
                )
            : {
                data: [],
            };


    /*
     * Load step responses.
     */

    const {
        data: responses,
    } =
        requestIds.length >
        0
            ? await admin
                .from(
                    "llm_responses"
                )
                .select(
                    "id, generation_request_id, prompt_chain_step_id, response_text, latency_ms, success, error_message, created_at"
                )
                .in(
                    "generation_request_id",
                    requestIds
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            true,
                    }
                )
            : {
                data: [],
            };


    /*
     * Current step names.
     */

    const {
        data: steps,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "id, step_order, name"
            )
            .eq(
                "prompt_chain_id",
                chain.id
            );


    const imageMap =
        new Map(
            (
                images ??
                []
            ).map(
                (
                    image
                ) => [
                    image.id,
                    image,
                ]
            )
        );


    const stepMap =
        new Map(
            (
                steps ??
                []
            ).map(
                (
                    step
                ) => [
                    step.id,
                    step,
                ]
            )
        );


    function formatDate(
        date:
            | string
            | null
    ) {
        if (!date) {
            return "—";
        }

        return new Intl.DateTimeFormat(
            "en-US",
            {
                month:
                    "short",

                day:
                    "numeric",

                year:
                    "numeric",

                hour:
                    "numeric",

                minute:
                    "2-digit",
            }
        ).format(
            new Date(
                date
            )
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
                            Generated Media
                        </p>

                        <h1>
                            {
                                chain.name
                            }
                        </h1>

                        <p className="tool-subtitle">
                            View previous
                            executions and
                            step-by-step AI
                            outputs produced by
                            this prompt chain.
                        </p>
                    </div>

                    <SignOutButton />
                </header>


                <div className="chain-toolbar">
                    <Link
                        href={`/chains/${chain.id}/run`}
                        className="tool-primary-button"
                    >
                        Run Chain
                    </Link>
                </div>


                {!runs ||
                runs.length ===
                0 ? (
                    <section className="tool-empty">
                        <h3>
                            No generated media yet
                        </h3>

                        <p>
                            Run this prompt
                            chain to create its
                            first generation
                            record.
                        </p>
                    </section>
                ) : (
                    <div className="history-list">
                        {runs.map(
                            (
                                run
                            ) => {
                                const image =
                                    run.image_id
                                        ? imageMap.get(
                                            run.image_id
                                        )
                                        : null;


                                let imageUrl =
                                    "";


                                if (
                                    image
                                ) {
                                    imageUrl =
                                        admin.storage
                                            .from(
                                                image.storage_bucket
                                            )
                                            .getPublicUrl(
                                                image.storage_path
                                            )
                                            .data
                                            .publicUrl;
                                }


                                const allRunResponses =
                                    (
                                        responses ??
                                        []
                                    ).filter(
                                        (
                                            response
                                        ) =>
                                            response.generation_request_id ===
                                            run.id
                                    );


                                /*
                                 * A step may have multiple model attempts:
                                 *
                                 * primary failed
                                 * fallback succeeded
                                 *
                                 * For the normal Generated Media view,
                                 * show only the final successful result.
                                 *
                                 * If every attempt failed, show the
                                 * latest failure instead.
                                 */

                                const responseByStep =
                                    new Map<
                                        string,
                                        typeof allRunResponses[number]
                                    >();


                                for (
                                    const response of
                                    allRunResponses
                                    ) {
                                    const key =
                                        response
                                            .prompt_chain_step_id ??
                                        response.id;

                                    const existing =
                                        responseByStep.get(
                                            key
                                        );


                                    /*
                                     * First response for this step.
                                     */
                                    if (!existing) {
                                        responseByStep.set(
                                            key,
                                            response
                                        );

                                        continue;
                                    }


                                    /*
                                     * Prefer a successful response
                                     * over a failed attempt.
                                     */
                                    if (
                                        response.success &&
                                        !existing.success
                                    ) {
                                        responseByStep.set(
                                            key,
                                            response
                                        );

                                        continue;
                                    }


                                    /*
                                     * If both have the same success
                                     * state, keep the later attempt.
                                     */
                                    if (
                                        response.created_at >
                                        existing.created_at
                                    ) {
                                        responseByStep.set(
                                            key,
                                            response
                                        );
                                    }
                                }


                                const runResponses =
                                    Array.from(
                                        responseByStep.values()
                                    ).sort(
                                        (
                                            a,
                                            b
                                        ) => {
                                            const stepA =
                                                a.prompt_chain_step_id
                                                    ? stepMap.get(
                                                        a.prompt_chain_step_id
                                                    )
                                                    : null;

                                            const stepB =
                                                b.prompt_chain_step_id
                                                    ? stepMap.get(
                                                        b.prompt_chain_step_id
                                                    )
                                                    : null;

                                            return (
                                                (
                                                    stepA
                                                        ?.step_order ??
                                                    999
                                                ) -
                                                (
                                                    stepB
                                                        ?.step_order ??
                                                    999
                                                )
                                            );
                                        }
                                    );


                                return (
                                    <article
                                        key={
                                            run.id
                                        }
                                        className="history-card"
                                    >
                                        <div className="history-header">
                                            <div>
                                                <p className="tool-eyebrow">
                                                    Run
                                                </p>

                                                <h2>
                                                    {
                                                        formatDate(
                                                            run.started_at
                                                        )
                                                    }
                                                </h2>
                                            </div>

                                            <span
                                                className={
                                                    run.status ===
                                                    "succeeded"
                                                        ? "status-pill status-active"
                                                        : "status-pill status-inactive"
                                                }
                                            >
                                                {
                                                    run.status
                                                }
                                            </span>
                                        </div>


                                        {imageUrl && (
                                            <div className="history-image-frame">
                                                <img
                                                    src={
                                                        imageUrl
                                                    }
                                                    alt={
                                                        image
                                                            ?.original_filename ??
                                                        "Prompt chain input"
                                                    }
                                                    className="history-image"
                                                />
                                            </div>
                                        )}


                                        {run.error_message && (
                                            <div className="run-error">
                                                {
                                                    run.error_message
                                                }
                                            </div>
                                        )}


                                        <div className="history-output-list">
                                            {runResponses.map(
                                                (
                                                    response,
                                                    index
                                                ) => {
                                                    const step =
                                                        response.prompt_chain_step_id
                                                            ? stepMap.get(
                                                                response.prompt_chain_step_id
                                                            )
                                                            : null;


                                                    return (
                                                        <div
                                                            key={
                                                                response.id
                                                            }
                                                            className="history-output"
                                                        >
                                                            <div className="run-output-heading">
                                                                <span>
                                                                    STEP{" "}
                                                                    {step
                                                                            ?.step_order ??
                                                                        index +
                                                                        1}
                                                                </span>

                                                                <strong>
                                                                    {step
                                                                            ?.name ??
                                                                        "Prompt Step"}
                                                                </strong>
                                                            </div>

                                                            {response.success ? (
                                                                <p>
                                                                    {
                                                                        response.response_text
                                                                    }
                                                                </p>
                                                            ) : (
                                                                <p className="history-error-text">
                                                                    Failed:{" "}
                                                                    {
                                                                        response.error_message
                                                                    }
                                                                </p>
                                                            )}

                                                            <p className="run-output-meta">
                                                                {response.latency_ms
                                                                    ? `${(
                                                                        response.latency_ms /
                                                                        1000
                                                                    ).toFixed(
                                                                        2
                                                                    )}s`
                                                                    : "—"}
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

