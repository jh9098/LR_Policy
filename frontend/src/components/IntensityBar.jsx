// frontend/src/components/IntensityBar.jsx
// 주장 강도 지표 바 (접근성/ARIA 강화 + 라벨 커스터마이즈)
import PropTypes from 'prop-types';

function IntensityBar({ intensity, label }) {
  // -1: 자료 없음, [0,100]: 유효 값
  const clamped = typeof intensity === 'number' ? Math.max(-1, Math.min(100, intensity)) : -1;
  const isUnknown = clamped < 0;
  const width = isUnknown ? '0%' : `${clamped}%`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{isUnknown ? '자료 없음' : `${clamped} / 100`}</span>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isUnknown ? undefined : clamped}
        aria-valuetext={isUnknown ? '자료 없음' : `${clamped}점`}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className={`h-full rounded-full transition-all ${isUnknown ? 'bg-slate-400/50 dark:bg-slate-500/50' : 'bg-indigo-500 dark:bg-indigo-400'}`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

IntensityBar.propTypes = {
  intensity: PropTypes.number,
  label: PropTypes.string
};

IntensityBar.defaultProps = {
  intensity: -1,
  label: '강도 지표'
};

export default IntensityBar;
