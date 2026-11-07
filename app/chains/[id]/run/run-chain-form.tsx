"use client";

import {
    useEffect,
    useState,
} from "react";

import type {
    FormEvent,
} from "react";

import Link from "next/link";


type StepOutput = {
    stepId: string;
    stepOrder: number;
    stepName: string;
    promptText: string;
    output: string;
    latencyMs: number;
    model: string;
};


type RunResult = {
    id: string;
    status: string;
    imageUrl: string;
    outputs: StepOutput[];
};


type Props = {
    chainId: string;
    chainName: string;
    stepCount: number;
};


export default function RunChainForm({
                                         chainId,
                                         chainName,
                                         stepCount,
                                     }: Props) {
    const [
        image,
        setImage,
    ] =
        useState<File | null>(
            null
        );

    const [
        preview,
        setPreview,
    ] =
        useState("");

    const [
        running,
        setRunning,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState("");

    const [
        result,
        setResult,
    ] =
        useState<RunResult | null>(
            null
        );


    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(
                    preview
                );
            }
        };
    }, [preview]);


    function chooseImage(
        file: File | null
    ) {
        if (preview) {
            URL.revokeObjectURL(
                preview
            );
        }

        setImage(
            file
        );

        setResult(
            null
        );

        setError("");


        if (file) {
            setPreview(
                URL.createObjectURL(
                    file
                )
            );
        } else {
            setPreview("");
        }
    }


    async function runChain(
        event:
        FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();


        if (!image) {
            setError(
                "Please choose an image."
            );

            return;
        }


        if (
            stepCount === 0
        ) {
            setError(
                "This prompt chain does not contain any steps."
            );

            return;
        }


        setRunning(true);
        setError("");
        setResult(null);


        const formData =
            new FormData();

        formData.append(
            "chain_id",
            chainId
        );

        formData.append(
            "image",
            image
        );


        const controller =
            new AbortController();

        /*
         * Overall browser timeout.
         *
         * Individual AI calls also have
         * server-side timeouts.
         */
        const timeoutId =
            setTimeout(
                () => {
                    controller.abort();
                },
                180000
            );


        try {
            const response =
                await fetch(
                    "/api/run-chain",
                    {
                        method:
                            "POST",

                        body:
                        formData,

                        signal:
                        controller.signal,
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok
            ) {
                setError(
                    data.error ??
                    "Could not run prompt chain."
                );

                return;
            }


            setResult(
                data.run
            );
        } catch (error) {
            console.error(
                error
            );


            if (
                error instanceof
                Error &&
                error.name ===
                "AbortError"
            ) {
                setError(
                    "The prompt chain took too long to complete. Please try again."
                );
            } else {
                setError(
                    "Could not run prompt chain."
                );
            }
        } finally {
            clearTimeout(
                timeoutId
            );

            setRunning(
                false
            );
        }
    }


    return (
        <>
            <section className="tool-card">
                <div className="tool-section-heading">
                    <div>
                        <p className="tool-eyebrow">
                            Input
                        </p>

                        <h2>
                            Run Workflow
                        </h2>
                    </div>

                    <span className="tool-count">
                        {stepCount}{" "}
                        {stepCount === 1
                            ? "step"
                            : "steps"}
                    </span>
                </div>


                <p className="tool-muted runner-description">
                    The image is sent to
                    Step 1. Each later
                    step receives the
                    output produced by
                    the step immediately
                    before it.
                </p>


                <form
                    onSubmit={
                        runChain
                    }
                    className="tool-form"
                >
                    <div className="tool-field">
                        <label
                            htmlFor="run-image"
                        >
                            Input Image
                        </label>

                        <input
                            id="run-image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(
                                event
                            ) =>
                                chooseImage(
                                    event
                                        .target
                                        .files?.[0] ??
                                    null
                                )
                            }
                            required
                        />

                        <p className="tool-helper">
                            JPEG, PNG, or
                            WebP. Maximum
                            5 MB.
                        </p>
                    </div>


                    {preview && (
                        <div className="run-image-frame">
                            <img
                                src={
                                    preview
                                }
                                alt="Prompt chain input preview"
                                className="run-image-preview"
                            />
                        </div>
                    )}


                    <button
                        type="submit"
                        disabled={
                            running ||
                            stepCount ===
                            0
                        }
                        className="tool-primary-button"
                    >
                        {running
                            ? `Running ${chainName}...`
                            : "Run Prompt Chain"}
                    </button>
                </form>


                {error && (
                    <div className="run-error">
                        {error}
                    </div>
                )}
            </section>


            {result && (
                <section className="tool-card">
                    <div className="tool-section-heading">
                        <div>
                            <p className="tool-eyebrow">
                                Completed
                            </p>

                            <h2>
                                Chain Output
                            </h2>
                        </div>

                        <span className="status-pill status-active">
                            Succeeded
                        </span>
                    </div>


                    <div className="run-output-list">
                        {result.outputs.map(
                            (
                                output
                            ) => (
                                <article
                                    key={
                                        output.stepId
                                    }
                                    className="run-output-card"
                                >
                                    <div className="run-output-heading">
                                        <span>
                                            STEP{" "}
                                            {
                                                output.stepOrder
                                            }
                                        </span>

                                        <strong>
                                            {
                                                output.stepName
                                            }
                                        </strong>
                                    </div>

                                    <div className="run-output-prompt">
                                        <strong>
                                            Prompt
                                        </strong>

                                        <p>
                                            {
                                                output.promptText
                                            }
                                        </p>
                                    </div>

                                    <div className="run-output-result">
                                        <strong>
                                            Output
                                        </strong>

                                        <p>
                                            {
                                                output.output
                                            }
                                        </p>
                                    </div>

                                    <p className="run-output-meta">
                                        {
                                            output.model
                                        }{" "}
                                        •{" "}
                                        {(
                                            output.latencyMs /
                                            1000
                                        ).toFixed(
                                            2
                                        )}
                                        s
                                    </p>
                                </article>
                            )
                        )}
                    </div>


                    <div className="runner-actions">
                        <Link
                            href={`/chains/${chainId}/media`}
                            className="tool-primary-button"
                        >
                            View Generated Media
                        </Link>

                        <Link
                            href={`/chains/${chainId}`}
                            className="tool-secondary-button"
                        >
                            Back to Chain
                        </Link>
                    </div>
                </section>
            )}
        </>
    );
}

