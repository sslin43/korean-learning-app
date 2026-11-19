import { MAX_RECORDING_DURATION_MS } from '../../hooks/useAudioRecorder';

interface AudioVisualizerProps {
  levelsHistory: number[];
  elapsedMs: number;
}

function formatSeconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const secs = String(totalSeconds).padStart(2, '0');
  return `00:${secs}`;
}

export function AudioVisualizer({ levelsHistory, elapsedMs }: AudioVisualizerProps) {
  return (
    <div className="audio-visualizer" role="status" aria-live="polite">
      <div className="audio-visualizer__status">
        <span className="audio-visualizer__dot" aria-hidden="true" />
        <span>錄音中，請念出韓文句子…</span>
      </div>

      <div className="audio-visualizer__bars" aria-hidden="true">
        {levelsHistory.map((level, index) => (
          <span
            key={index}
            className="audio-visualizer__bar"
            style={{ height: `${Math.round(level * 100)}%` }}
          />
        ))}
      </div>

      <span className="audio-visualizer__timer">
        {formatSeconds(elapsedMs)} / {formatSeconds(MAX_RECORDING_DURATION_MS)}
      </span>
    </div>
  );
}
