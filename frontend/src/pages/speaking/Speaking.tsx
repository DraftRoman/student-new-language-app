import { useNavigate } from 'react-router-dom';

import PronunciationExercise from './PronunciationExercise';

// Standalone host for the speaking exercise. Until a lesson "exercise block"
// container exists (story S5.2), this page seeds one sample target so the
// flow is reachable and testable end-to-end.
const SAMPLE = {
  exerciseId:   'sample-1',
  expectedText: 'Hello, how are you?',
  courseLang:   'en',
  taskType:     'sentence' as const,
};

export default function Speaking() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 bg-[var(--bg-base)]">
      <PronunciationExercise
        exerciseId={SAMPLE.exerciseId}
        expectedText={SAMPLE.expectedText}
        courseLang={SAMPLE.courseLang}
        taskType={SAMPLE.taskType}
        onSkip={() => navigate('/dashboard')}
      />
    </div>
  );
}
