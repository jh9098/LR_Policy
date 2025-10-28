// frontend/src/components/IntensityBar.jsx
import PropTypes from 'prop-types';

function clampValue(value) {
  // 시각적 일관성을 위해 0~100 범위로 제한한다.
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

const AVAILABLE_CLASSES = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500'
];

function IntensityBar({ value, label, colorClass }) {
  const safeValue = clampValue(value);
  const safeColor = AVAILABLE_CLASSES.includes(colorClass) ? colorClass : 'bg-indigo-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums">{safeValue}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-out ${safeColor}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        주장 어조 강도(참고용) · 수치는 진영별 주장에 담긴 감정, 경고 수위, 단정적 표현 정도를 주관적으로 환산한 값입니다.
      </p>
    </div>
  );
}

IntensityBar.propTypes = {
  value: PropTypes.number.isRequired,
  label: PropTypes.string,
  colorClass: PropTypes.oneOf(AVAILABLE_CLASSES)
};

IntensityBar.defaultProps = {
  label: '주장 강도(참고용)',
  colorClass: 'bg-indigo-500'
};

export default IntensityBar;
