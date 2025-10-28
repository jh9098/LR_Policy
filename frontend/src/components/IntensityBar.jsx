// frontend/src/components/IntensityBar.jsx
import PropTypes from 'prop-types';

function clampValue(value) {
  // 시각화 안정성을 위해 0~100 범위로 자른다.
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

const COLOR_CLASS_MAP = {
  // Tailwind 정적 분석을 통과하기 위해 사용 가능한 색상을 사전에 명시한다.
  indigo: 'bg-indigo-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  rose: 'bg-rose-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500'
};

function IntensityBar({ value, label, color }) {
  const safeValue = clampValue(value);
  const barColorClass = COLOR_CLASS_MAP[color] ?? COLOR_CLASS_MAP.indigo;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums">{safeValue}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-out ${barColorClass}`}
          style={{ width: `${safeValue}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        수치는 해당 프레임의 주장 강도를 정성적으로 평가한 값입니다. (참고용)
      </p>
    </div>
  );
}

IntensityBar.propTypes = {
  value: PropTypes.number.isRequired,
  label: PropTypes.string,
  color: PropTypes.oneOf(Object.keys(COLOR_CLASS_MAP))
};

IntensityBar.defaultProps = {
  label: '프레임 강도',
  color: 'indigo'
};

export default IntensityBar;
