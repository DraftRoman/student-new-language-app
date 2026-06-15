// UI copy for the speaking exercise, externalized for a future i18n pass
// (story S7.3: UI language is separate from the recognition / course language).
// Status is conveyed by text + icon, never color alone (S7.2).

export const COPY = {
  eyebrow:    'Say it out loud',
  prompt:     'Pronounce this:',

  record:     '● Record',
  stop:       '■ Stop',
  recording:  'Recording… tap stop when you’re done',
  requesting: 'Allow microphone access to continue…',
  processing: 'Checking your pronunciation…',

  rerecord:   'Re-record',
  submit:     'Check pronunciation',
  retry:      'Try again',
  skip:       'Skip for now',

  result: {
    heading:      'Your result',
    youSaid:      'We heard:',
    target:       'Target:',
    match:        (pct: number) => `${pct}% match`,
    excellent:    { icon: '🎉', label: 'Excellent!' },
    passed:       { icon: '👍', label: 'Passed' },
    retry:        { icon: '🔁', label: 'Keep practising' },
    unclear:      'We couldn’t hear you clearly — give it another go.',
  },

  status: {
    granted:   'announced for screen readers',
  },

  // Accessible labels / live-region announcements (S7.1).
  a11y: {
    recordBtn:        'Start recording your pronunciation',
    stopBtn:          'Stop recording',
    recordingState:   'Recording in progress',
    processingState:  'Checking your pronunciation, please wait',
    playback:         'Play back your recording',
  },

  errors: {
    micDenied:   'Microphone access is blocked. Enable it in your browser settings, or skip this exercise.',
    unsupported: 'Your browser doesn’t support voice recording. Try a different browser, or skip this exercise.',
    timeout:     'That took too long. Please try again.',
    tooLarge:    'Your recording is too long. Keep it short and try again.',
    network:     'You appear to be offline. Reconnect and try again.',
    generic:     'Something went wrong. Please try again.',
  },
} as const;
