import SignOutButton from "@/app/sign-out-button";
import Link from "next/link";

import {
  requireSuperadmin,
} from "@/lib/require-superadmin";

import {
  createPromptChain,
} from "@/app/chains/actions";


export const dynamic =
    "force-dynamic";


export default async function HomePage() {
  const {
    admin,
    profile,
  } =
      await requireSuperadmin();


  const {
    data: promptChains,
    error,
  } =
      await admin
          .from(
              "prompt_chains"
          )
          .select(
              "id, name, slug, description, is_active, created_at"
          )
          .order(
              "created_at",
              {
                ascending:
                    false,
              }
          );


  if (error) {
    throw new Error(
        `Could not load prompt chains: ${error.message}`
    );
  }


  return (
      <main className="tool-page">
        <div className="tool-container">

          {/* Header */}

          <header className="tool-header">
            <div>
              <p className="tool-eyebrow">
                Morningside Caption Club
              </p>

              <h1>
                Prompt Chain Tool
              </h1>

              <p className="tool-subtitle">
                Create, manage,
                and test multi-step
                AI prompt workflows.
              </p>
            </div>

            <div className="tool-user-area">
              <div className="tool-user">
                Signed in as{" "}

                <strong>
                  @
                  {profile.username ??
                      "admin"}
                </strong>
              </div>

              <SignOutButton />
            </div>

          </header>


          {/* Create chain */}

          <section className="tool-card">
            <div className="tool-section-heading">
              <div>
                <p className="tool-eyebrow">
                  New workflow
                </p>

                <h2>
                  Create Prompt Chain
                </h2>
              </div>
            </div>

            <form
                action={
                  createPromptChain
                }
                className="tool-form"
            >
              <div className="tool-field">
                <label
                    htmlFor="name"
                >
                  Name
                </label>

                <input
                    id="name"
                    name="name"
                    placeholder="Experimental Caption Chain"
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
                    placeholder="experimental-caption"
                    pattern="[a-z0-9-]+"
                    title="Use lowercase letters, numbers, and hyphens only."
                    required
                />

                <p className="tool-helper">
                  Use lowercase
                  letters, numbers,
                  and hyphens only.
                </p>
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
                    placeholder="Describe what this prompt chain is designed to do..."
                    rows={4}
                />
              </div>


              <label className="tool-checkbox">
                <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked
                />

                <span>
                                Active
                            </span>
              </label>


              <button
                  type="submit"
                  className="tool-primary-button"
              >
                + Create Chain
              </button>
            </form>
          </section>


          {/* Existing chains */}

          <section className="tool-section">
            <div className="tool-section-heading">
              <div>
                <p className="tool-eyebrow">
                  Existing workflows
                </p>

                <h2>
                  Prompt Chains
                </h2>
              </div>

              <span className="tool-count">
                            {
                                promptChains
                                    ?.length ??
                                0
                            }{" "}
                total
                        </span>
            </div>


            {!promptChains ||
            promptChains.length ===
            0 ? (
                <div className="tool-empty">
                  <h3>
                    No prompt chains yet
                  </h3>

                  <p>
                    Create your first
                    prompt chain using
                    the form above.
                  </p>
                </div>
            ) : (
                <div className="chain-grid">
                  {promptChains.map(
                      (
                          chain
                      ) => (
                          <article
                              key={
                                chain.id
                              }
                              className="chain-card"
                          >
                            <div className="chain-card-top">
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

                              <span className="chain-slug">
                                                /
                                {
                                  chain.slug
                                }
                                            </span>
                            </div>

                            <h3>
                              {
                                chain.name
                              }
                            </h3>

                            <p>
                              {chain.description ||
                                  "No description provided."}
                            </p>

                            <Link
                                href={`/chains/${chain.id}`}
                                className="tool-secondary-button"
                            >
                              Open Chain →
                            </Link>
                          </article>
                      )
                  )}
                </div>
            )}
          </section>
        </div>
      </main>
  );
}

