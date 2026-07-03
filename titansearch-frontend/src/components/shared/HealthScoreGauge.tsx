import React from 'react';

interface HealthScoreGaugeProps {
  overallScore: number;
  breakdown: {
    documentationScore: number;
    commitActivityScore: number;
    issuesScore: number;
    popularityScore: number;
    maturityScore: number;
  };
}

export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ overallScore, breakdown }) => {
  // Circular gauge setup
  const radius = 60;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  // Determine color based on score range
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#10B981]'; // Emerald/Green
    if (score >= 50) return 'text-[#F59E0B]'; // Amber/Yellow
    return 'text-[#EF4444]'; // Red
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-[#10B981]';
    if (score >= 50) return 'bg-[#F59E0B]';
    return 'bg-[#EF4444]';
  };

  return (
    <div className="bg-[#151D30] rounded-xl border border-[#23304E] p-6 flex flex-col md:flex-row items-center gap-8">
      {/* Circular Radial Gauge */}
      <div className="relative flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          {/* Background track circle */}
          <circle
            stroke="#23304E"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Animated score ring */}
          <circle
            className="transition-all duration-1000 ease-out"
            stroke={overallScore >= 80 ? '#10B981' : overallScore >= 50 ? '#F59E0B' : '#EF4444'}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
        </svg>
        {/* Core Value Label */}
        <div className="absolute text-center">
          <span className={`text-3xl font-extrabold tracking-tight ${getScoreColor(overallScore)}`}>
            {overallScore}
          </span>
          <span className="block text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
            Health
          </span>
        </div>
      </div>

      {/* Sub-metric Progress Bars */}
      <div className="flex-1 w-full space-y-4">
        {/* Documentation */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-[#94A3B8]">Documentation</span>
            <span className={getScoreColor(breakdown.documentationScore)}>{breakdown.documentationScore}%</span>
          </div>
          <div className="w-full bg-[#23304E] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${getScoreBgColor(breakdown.documentationScore)}`}
              style={{ width: `${breakdown.documentationScore}%` }}
            ></div>
          </div>
        </div>

        {/* Commit Activity */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-[#94A3B8]">Recent Activity (90 Days)</span>
            <span className={getScoreColor(breakdown.commitActivityScore)}>{breakdown.commitActivityScore}%</span>
          </div>
          <div className="w-full bg-[#23304E] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${getScoreBgColor(breakdown.commitActivityScore)}`}
              style={{ width: `${breakdown.commitActivityScore}%` }}
            ></div>
          </div>
        </div>

        {/* Issues Health */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-[#94A3B8]">Open Issues Ratio</span>
            <span className={getScoreColor(breakdown.issuesScore)}>{breakdown.issuesScore}%</span>
          </div>
          <div className="w-full bg-[#23304E] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${getScoreBgColor(breakdown.issuesScore)}`}
              style={{ width: `${breakdown.issuesScore}%` }}
            ></div>
          </div>
        </div>

        {/* Popularity */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-[#94A3B8]">Popularity & Adoption</span>
            <span className={getScoreColor(breakdown.popularityScore)}>{breakdown.popularityScore}%</span>
          </div>
          <div className="w-full bg-[#23304E] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${getScoreBgColor(breakdown.popularityScore)}`}
              style={{ width: `${breakdown.popularityScore}%` }}
            ></div>
          </div>
        </div>

        {/* Maturity */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-[#94A3B8]">Maturity & Obsolescence</span>
            <span className={getScoreColor(breakdown.maturityScore)}>{breakdown.maturityScore}%</span>
          </div>
          <div className="w-full bg-[#23304E] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${getScoreBgColor(breakdown.maturityScore)}`}
              style={{ width: `${breakdown.maturityScore}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
