export default function SkeletonCard() {
  return (
    <div 
      style={{
        background: '#ffffff',
        border: '1px solid #d0d7de',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-block {
          background: linear-gradient(90deg, #f0f3f6 25%, #eaeef2 50%, #f0f3f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 4px;
        }
      `}} />
      
      {/* Header title */}
      <div className="shimmer-block" style={{ width: '45%', height: '20px' }} />
      
      {/* Description lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
        <div className="shimmer-block" style={{ width: '95%', height: '14px' }} />
        <div className="shimmer-block" style={{ width: '75%', height: '14px' }} />
      </div>
      
      {/* Topics */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        <div className="shimmer-block" style={{ width: '55px', height: '18px', borderRadius: '10px' }} />
        <div className="shimmer-block" style={{ width: '70px', height: '18px', borderRadius: '10px' }} />
        <div className="shimmer-block" style={{ width: '48px', height: '18px', borderRadius: '10px' }} />
      </div>
      
      {/* Footer widgets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f6f8fa' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="shimmer-block" style={{ width: '65px', height: '12px' }} />
          <div className="shimmer-block" style={{ width: '50px', height: '12px' }} />
        </div>
        <div className="shimmer-block" style={{ width: '90px', height: '30px', borderRadius: '6px' }} />
      </div>
    </div>
  );
}
