// §5.4: user-facing copy is externalized so a future i18n pass (e.g.
// react-i18next) can swap this module for a translated dictionary without
// touching the components. Keys are flat and namespaced by step.
export const COPY = {
    gate: {
        eyebrow: "Let's find your level",
        title: "Have you studied this language before?",
        subtitle: "We'll tailor where you start. Beginners go straight to A1.",
        yes: "Yes, a bit or more",
        no: "No — I'm starting from scratch",
    },
    test: {
        eyebrow: (level) => `Level ${level}`,
        vocabHeading: "Match the words",
        vocabHelp: "Tap the English word, then its translation.",
        pageOf: (cur, total) => `Page ${cur} of ${total}`,
        sentenceHeading: "Build the sentence",
        sentenceHelp: "Tap words to place them in order.",
        nextPage: "Next page →",
        submitLevel: "Check level →",
        submitting: "Scoring…",
        resetSentence: "Clear",
    },
    confirm: {
        eyebrowDefault: "Nice job",
        eyebrowCeiling: "Top of the ladder!",
        title: (level) => `We recommend ${level}`,
        overrideAvailable: (next) => `Feeling confident? You can start one level higher at ${next}.`,
        overrideDisabled: "This is the highest level — there's nowhere higher to go.",
        chooseRecommended: (level) => `Start at ${level} (recommended)`,
        chooseOverride: (level) => `Start at ${level} instead`,
        confirmCta: "Start learning →",
        confirming: "Saving…",
    },
    errors: {
        generic: "Something went wrong. Please try again.",
    },
};
