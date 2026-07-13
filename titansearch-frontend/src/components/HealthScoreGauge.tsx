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

export default function HealthScoreGauge({ overallScore, breakdown }: HealthScoreGaugeProps) {
  // SVG circle configurations
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return 'var(--color-success)';
    if (score >= 50) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const scoreColor = getColor(overallScore);

  return (
    <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', alignItems: 'center' }}>
      
      {/* Radial Gauge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: radius * 2, height: radius * 2 }}>
          <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              stroke="rgba(255, 255, 255, 0.05)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={scoreColor}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {overallScore}
            </span>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginTop: '-2px' }}>
              HEALTH
            </span>
          </div>
        </div>
        
        <span style={{
          marginTop: '15px',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: scoreColor,
          background: `rgba(${scoreColor === 'var(--color-success)' ? '16,185,129' : scoreColor === 'var(--color-warning)' ? '245,158,11' : '239,68,68'}, 0.1)`,
          padding: '4px 12px',
          borderRadius: '12px',
          border: `1px solid rgba(${scoreColor === 'var(--color-success)' ? '16,185,129' : scoreColor === 'var(--color-warning)' ? '245,158,11' : '239,68,68'}, 0.2)`
        }}>
          {overallScore >= 80 ? 'Excellent Quality' : overallScore >= 50 ? 'Moderate Health' : 'Critical Issues'}
        </span>
      </div>

      {/* Sub-Metrics Progress Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { label: 'Documentation', value: breakdown.documentationScore, desc: 'README & License presence' },
          { label: 'Commit Activity', value: breakdown.commitActivityScore, desc: '90-day frequency' },
          { label: 'Issues Health', value: breakdown.issuesScore, desc: 'Open issues density' },
          { label: 'Popularity', value: breakdown.popularityScore, desc: 'Stars & Forks index' },
          { label: 'Maturity', value: breakdown.maturityScore, desc: 'Repository age' }
        ].map((item, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px' }}>({item.desc})</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: getColor(item.value) }}>{item.value}/100</span>
            </div>
            
            {/* Custom Track and Progress bar */}
            <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', width: '100%', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: getColor(item.value),
                width: `${item.value}%`,
                borderRadius: '3px',
                transition: 'width 0.5s ease-in-out'
              }} />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
