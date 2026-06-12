export declare const COPY: {
    gate: {
        eyebrow: string;
        title: string;
        subtitle: string;
        yes: string;
        no: string;
    };
    test: {
        eyebrow: (level: string) => string;
        vocabHeading: string;
        vocabHelp: string;
        pageOf: (cur: number, total: number) => string;
        sentenceHeading: string;
        sentenceHelp: string;
        nextPage: string;
        submitLevel: string;
        submitting: string;
        resetSentence: string;
    };
    confirm: {
        eyebrowDefault: string;
        eyebrowCeiling: string;
        title: (level: string) => string;
        overrideAvailable: (next: string) => string;
        overrideDisabled: string;
        chooseRecommended: (level: string) => string;
        chooseOverride: (level: string) => string;
        confirmCta: string;
        confirming: string;
    };
    errors: {
        generic: string;
    };
};
