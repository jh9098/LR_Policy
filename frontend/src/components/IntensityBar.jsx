// frontend/src/components/IntensityBar.jsx
// 진보/보수 시각에서 주장 강도를 시각화하기 위한 바 컴포넌트.
// intensity 값이 -1이면 "자료 없음"으로 해석하고 회색으로 표시한다.

import PropTypes from 'prop-types';

function IntensityBar({ intensity }) {
  const clamped = typeof intensity === 'number' ? Math.max(-1, Math.min(100, intensity)) : -1;
  const isUnknown = clamped < 0;
  const width = isUnknown ? '0%' : `${clamped}%`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>강도 지표</span>
        <span>{isUnknown ? '자료 없음' : `${clamped} / 100`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${isUnknown ? 'bg-slate-400/50 dark:bg-slate-500/50' : 'bg-indigo-500 dark:bg-indigo-400'}`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

IntensityBar.propTypes = {
  intensity: PropTypes.number
};

IntensityBar.defaultProps = {
  intensity: -1
};

export default IntensityBar;
