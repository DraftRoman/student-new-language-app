// Placement analytics — minimal sink so the §5.5 events ship with the
// feature even before a real SDK (Mixpanel / Segment / Amplitude) is wired
// in. The seven event names are exactly those listed in the story; do not
// rename without updating the analytics doc.
//
// Wiring later: replace `emit()` with a call into the SDK. The shapes here
// are stable, so a one-line swap is enough.
let sink = (name, payload) => {
    console.info(`[analytics] ${name}`, payload);
};
// Test seam: swap the sink in unit tests.
export function setAnalyticsSink(fn) {
    sink = fn;
}
export function track(name, payload) {
    try {
        sink(name, payload);
    }
    catch {
        // Analytics must never break the user flow.
    }
}
