import Link from "next/link";

import {
    notFound,
} from "next/navigation";

import {
    requireSuperadmin,
} from "@/lib/require-superadmin";

import {
    deletePromptChain,
    updatePromptChain,
} from "@/app/chains/actions";

import {
    createPromptStep,
    deletePromptStep,
    movePromptStepDown,
    movePromptStepUp,
    updatePromptStep,
} from "@/app/chains/step-actions";

import SignOutButton from "@/app/sign-out-button";


type Props = {
    params: Promise<{
        id: string;
    }>;
};


export const dynamic =
    "force-dynamic";


export default async function PromptChainPage({
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
     * --------------------------------------------------
     * LOAD PROMPT CHAIN
     * --------------------------------------------------
     */

    const {
        data: chain,
        error,
    } =
        await admin
            .from(
                "prompt_chains"
            )
            .select(
                "id, name, slug, description, is_active, created_at, updated_at"
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


    /*
     * --------------------------------------------------
     * LOAD PROMPT STEPS
     * --------------------------------------------------
     */

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
                "id, step_order, name, prompt_text, created_at, updated_at"
            )
            .eq(
                "prompt_chain_id",
                id
            )
            .order(
                "step_order",
                {
                    ascending:
                        true,
                }
            );


    if (stepsError) {
        throw new Error(
            `Could not load prompt steps: ${stepsError.message}`
        );
    }


    const totalSteps =
        steps?.length ??
        0;


    return (
        <main className="tool-page">
            <div className="tool-container">

                <Link
                    href="/"
                    className="back-link"
                >
                    ← Back to Prompt Chains
                </Link>


                {/* Header */}

                <header className="chain-detail-header">
                    <div>
                        <p className="tool-eyebrow">
                            Prompt Chain
                        </p>

                        <h1>
                            {
                                chain.name
                            }
                        </h1>

                        <p className="tool-subtitle">
                            Manage this
                            workflow and its
                            prompt steps.
                        </p>
                    </div>


                    <div className="chain-detail-actions">
                        <span
                            className={
                                chain.is_active
                                    ? "status-pill status-active"
                                    : "status-pill status-inactive"
                            }
                        >
                            {chain.is_active
                                ? "Active"
                                : "Inactive"}
                        </span>

                        <SignOutButton />
                    </div>
                </header>

                <div className="chain-toolbar">
                    <Link
                        href={`/chains/${chain.id}/run`}
                        className="tool-primary-button"
                    >
                        Run Chain
                    </Link>

                    <Link
                        href={`/chains/${chain.id}/media`}
                        className="tool-secondary-button"
                    >
                        Generated Media
                    </Link>
                </div>


                {/* ==================================================
                    CHAIN SETTINGS
                   ================================================== */}

                <section className="tool-card">
                    <div className="tool-section-heading">
                        <div>
                            <p className="tool-eyebrow">
                                Configuration
                            </p>

                            <h2>
                                Chain Settings
                            </h2>
                        </div>
                    </div>


                    <form
                        action={
                            updatePromptChain
                        }
                        className="tool-form"
                    >
                        <input
                            type="hidden"
                            name="chain_id"
                            value={
                                chain.id
                            }
                        />


                        <div className="tool-field">
                            <label
                                htmlFor="name"
                            >
                                Name
                            </label>

                            <input
                                id="name"
                                name="name"
                                defaultValue={
                                    chain.name
                                }
                                required
                            />
                        </div>


                        <div className="tool-field">
                            <label
                                htmlFor="slug"
                            >
                                Slug
                            </label>

                            <input
                                id="slug"
                                name="slug"
                                defaultValue={
                                    chain.slug
                                }
                                pattern="[a-z0-9-]+"
                                required
                            />
                        </div>


                        <div className="tool-field">
                            <label
                                htmlFor="description"
                            >
                                Description
                            </label>

                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                defaultValue={
                                    chain.description ??
                                    ""
                                }
                            />
                        </div>


                        <label className="tool-checkbox">
                            <input
                                type="checkbox"
                                name="is_active"
                                defaultChecked={
                                    chain.is_active
                                }
                            />

                            <span>
                                Active
                            </span>
                        </label>


                        <button
                            type="submit"
                            className="tool-primary-button"
                        >
                            Save Changes
                        </button>
                    </form>
                </section>


                {/* ==================================================
                    PROMPT STEPS
                   ================================================== */}

                <section className="tool-card">
                    <div className="tool-section-heading">
                        <div>
                            <p className="tool-eyebrow">
                                Workflow
                            </p>

                            <h2>
                                Prompt Steps
                            </h2>
                        </div>

                        <span className="tool-count">
                            {
                                totalSteps
                            }{" "}
                            {totalSteps ===
                            1
                                ? "step"
                                : "steps"}
                        </span>
                    </div>


                    <p className="tool-muted step-intro">
                        Steps run from top
                        to bottom. The output
                        from one step will be
                        passed into the next
                        step when we add the
                        chain runner.
                    </p>


                    {/* Existing steps */}

                    {steps &&
                    steps.length >
                    0 ? (
                        <div className="prompt-step-list">
                            {steps.map(
                                (
                                    step,
                                    index
                                ) => {
                                    const isFirst =
                                        index ===
                                        0;

                                    const isLast =
                                        index ===
                                        steps.length -
                                        1;


                                    return (
                                        <article
                                            key={
                                                step.id
                                            }
                                            className="prompt-step-card"
                                        >
                                            <div className="prompt-step-header">
                                                <div className="prompt-step-number">
                                                    STEP{" "}
                                                    {
                                                        step.step_order
                                                    }
                                                </div>

                                                <div className="prompt-step-reorder">
                                                    <form
                                                        action={
                                                            movePromptStepUp
                                                        }
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="chain_id"
                                                            value={
                                                                chain.id
                                                            }
                                                        />

                                                        <input
                                                            type="hidden"
                                                            name="step_id"
                                                            value={
                                                                step.id
                                                            }
                                                        />

                                                        <button
                                                            type="submit"
                                                            className="step-order-button"
                                                            disabled={
                                                                isFirst
                                                            }
                                                            title="Move step up"
                                                        >
                                                            ↑ Move Up
                                                        </button>
                                                    </form>


                                                    <form
                                                        action={
                                                            movePromptStepDown
                                                        }
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="chain_id"
                                                            value={
                                                                chain.id
                                                            }
                                                        />

                                                        <input
                                                            type="hidden"
                                                            name="step_id"
                                                            value={
                                                                step.id
                                                            }
                                                        />

                                                        <button
                                                            type="submit"
                                                            className="step-order-button"
                                                            disabled={
                                                                isLast
                                                            }
                                                            title="Move step down"
                                                        >
                                                            ↓ Move Down
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>


                                            {/* Edit step */}

                                            <form
                                                action={
                                                    updatePromptStep
                                                }
                                                className="tool-form"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="chain_id"
                                                    value={
                                                        chain.id
                                                    }
                                                />

                                                <input
                                                    type="hidden"
                                                    name="step_id"
                                                    value={
                                                        step.id
                                                    }
                                                />


                                                <div className="tool-field">
                                                    <label>
                                                        Step Name
                                                    </label>

                                                    <input
                                                        name="name"
                                                        defaultValue={
                                                            step.name
                                                        }
                                                        required
                                                    />
                                                </div>


                                                <div className="tool-field">
                                                    <label>
                                                        Prompt
                                                    </label>

                                                    <textarea
                                                        name="prompt_text"
                                                        rows={5}
                                                        defaultValue={
                                                            step.prompt_text
                                                        }
                                                        required
                                                    />
                                                </div>


                                                <div className="step-action-row">
                                                    <button
                                                        type="submit"
                                                        className="tool-secondary-button"
                                                    >
                                                        Save Step
                                                    </button>
                                                </div>
                                            </form>


                                            {/* Delete step */}

                                            <form
                                                action={
                                                    deletePromptStep
                                                }
                                                className="step-delete-form"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="chain_id"
                                                    value={
                                                        chain.id
                                                    }
                                                />

                                                <input
                                                    type="hidden"
                                                    name="step_id"
                                                    value={
                                                        step.id
                                                    }
                                                />

                                                <button
                                                    type="submit"
                                                    className="step-delete-button"
                                                >
                                                    Delete Step
                                                </button>
                                            </form>
                                        </article>
                                    );
                                }
                            )}
                        </div>
                    ) : (
                        <div className="tool-empty">
                            <h3>
                                No steps yet
                            </h3>

                            <p>
                                Add the first
                                prompt step below.
                            </p>
                        </div>
                    )}


                    {/* Add step */}

                    <div className="add-step-section">
                        <div className="tool-section-heading">
                            <div>
                                <p className="tool-eyebrow">
                                    Add to workflow
                                </p>

                                <h3>
                                    New Prompt Step
                                </h3>
                            </div>

                            <span className="tool-count">
                                Next: Step{" "}
                                {
                                    totalSteps +
                                    1
                                }
                            </span>
                        </div>


                        <form
                            action={
                                createPromptStep
                            }
                            className="tool-form"
                        >
                            <input
                                type="hidden"
                                name="chain_id"
                                value={
                                    chain.id
                                }
                            />


                            <div className="tool-field">
                                <label
                                    htmlFor="new-step-name"
                                >
                                    Step Name
                                </label>

                                <input
                                    id="new-step-name"
                                    name="name"
                                    placeholder="Example: Describe Image"
                                    required
                                />
                            </div>


                            <div className="tool-field">
                                <label
                                    htmlFor="new-step-prompt"
                                >
                                    Prompt
                                </label>

                                <textarea
                                    id="new-step-prompt"
                                    name="prompt_text"
                                    rows={5}
                                    placeholder="Example: Carefully describe the uploaded image in clear text."
                                    required
                                />

                                <p className="tool-helper">
                                    For later steps,
                                    write the prompt
                                    assuming the output
                                    from the previous
                                    step will also be
                                    provided.
                                </p>
                            </div>


                            <button
                                type="submit"
                                className="tool-primary-button"
                            >
                                + Add Step
                            </button>
                        </form>
                    </div>
                </section>


                {/* ==================================================
                    DELETE CHAIN
                   ================================================== */}

                <section className="danger-zone">
                    <div>
                        <h2>
                            Delete Prompt Chain
                        </h2>

                        <p>
                            Deletion is blocked
                            if this chain is
                            actively used in
                            Prompt Mix or already
                            has generation
                            history.
                        </p>
                    </div>

                    <form
                        action={
                            deletePromptChain
                        }
                    >
                        <input
                            type="hidden"
                            name="chain_id"
                            value={
                                chain.id
                            }
                        />

                        <button
                            type="submit"
                            className="tool-danger-button"
                        >
                            Delete Chain
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}

