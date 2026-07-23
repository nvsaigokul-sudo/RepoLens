interface Node {
  id: string;
  label: string;
  type: string;
}

interface Edge {
  from: string;
  to: string;
}

interface ArchitectureDiagramProps {
  diagramData: {
    nodes: Node[];
    edges: Edge[];
  } | null;
}

export default function ArchitectureDiagram({ diagramData }: ArchitectureDiagramProps) {
  if (!diagramData || !diagramData.nodes || diagramData.nodes.length === 0) {
    return (
      <div className="git-card flex-center" style={{ minHeight: '200px', flexDirection: 'column', color: 'var(--text-muted)' }}>
        <span>No architecture data available for this repository.</span>
      </div>
    );
  }

  const { nodes, edges } = diagramData;

  // Compute node coordinates based on type
  const width = 800;
  const height = 300;

  const nodePositions: { [id: string]: { x: number; y: number } } = {};
  
  // Count types to distribute Y positions
  const dbCacheNodes = nodes.filter(n => n.type === 'DATABASE' || n.type === 'CACHE');
  
  nodes.forEach(node => {
    switch (node.type) {
      case 'FRONTEND':
        nodePositions[node.id] = { x: 100, y: 150 };
        break;
      case 'BACKEND':
        nodePositions[node.id] = { x: 300, y: 150 };
        break;
      case 'CACHE':
        if (dbCacheNodes.length > 1) {
          nodePositions[node.id] = { x: 500, y: 80 };
        } else {
          nodePositions[node.id] = { x: 500, y: 150 };
        }
        break;
      case 'DATABASE':
        if (dbCacheNodes.length > 1) {
          nodePositions[node.id] = { x: 500, y: 220 };
        } else {
          nodePositions[node.id] = { x: 500, y: 150 };
        }
        break;
      case 'INFRA':
        nodePositions[node.id] = { x: 700, y: 150 };
        break;
      default:
        nodePositions[node.id] = { x: 400, y: 150 };
    }
  });

  const getNodeStyles = (type: string) => {
    switch (type) {
      case 'FRONTEND':
        return { fill: 'url(#gradient-teal)', stroke: '#00f2fe', shadow: 'rgba(0, 242, 254, 0.3)' };
      case 'BACKEND':
        return { fill: 'url(#gradient-indigo)', stroke: '#4facfe', shadow: 'rgba(79, 172, 254, 0.3)' };
      case 'CACHE':
        return { fill: 'url(#gradient-amber)', stroke: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.3)' };
      case 'DATABASE':
        return { fill: 'url(#gradient-purple)', stroke: '#a855f7', shadow: 'rgba(168, 85, 247, 0.3)' };
      default:
        return { fill: 'url(#gradient-slate)', stroke: '#64748b', shadow: 'rgba(100, 116, 139, 0.3)' };
    }
  };

  const nodeWidth = 140;
  const nodeHeight = 60;

  return (
    <div className="git-card" style={{ overflowX: 'auto', padding: '20px' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: '700px' }}>
        <defs>
          {/* Gradients */}
          <linearGradient id="gradient-teal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="gradient-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="gradient-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#581c87" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          <linearGradient id="gradient-slate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Markers */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(255, 255, 255, 0.4)" />
          </marker>
        </defs>

        {/* Draw Edges */}
        {edges && Array.isArray(edges) && edges.map((edge, idx) => {
          const fromPos = nodePositions[edge.from];
          const toPos = nodePositions[edge.to];

          if (!fromPos || !toPos) return null;

          const startX = fromPos.x + nodeWidth / 2;
          const startY = fromPos.y;
          const endX = toPos.x - nodeWidth / 2;
          const endY = toPos.y;

          // Compute control points for a curved path
          const cpX1 = startX + (endX - startX) / 2;
          const cpY1 = startY;
          const cpX2 = startX + (endX - startX) / 2;
          const cpY2 = endY;

          const pathD = `M ${startX} ${startY} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${endX} ${endY}`;

          return (
            <path
              key={idx}
              d={pathD}
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="2"
              markerEnd="url(#arrow)"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Draw Nodes */}
        {nodes.map(node => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

          const styles = getNodeStyles(node.type);
          const x = pos.x - nodeWidth / 2;
          const y = pos.y - nodeHeight / 2;

          return (
            <g key={node.id} style={{ cursor: 'pointer' }}>
              {/* Outer Glow */}
              <rect
                x={x - 2}
                y={y - 2}
                width={nodeWidth + 4}
                height={nodeHeight + 4}
                rx="10"
                ry="10"
                fill="none"
                stroke={styles.stroke}
                strokeWidth="2"
                opacity="0.6"
                style={{ filter: `drop-shadow(0px 0px 8px ${styles.shadow})` }}
              />

              {/* Node Card */}
              <rect
                x={x}
                y={y}
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                ry="8"
                fill={styles.fill}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />

              {/* Node Type Label */}
              <text
                x={pos.x}
                y={pos.y - 8}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="rgba(255, 255, 255, 0.5)"
                letterSpacing="0.05em"
              >
                {node.type}
              </text>

              {/* Node Tech Name */}
              <text
                x={pos.x}
                y={pos.y + 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#ffffff"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
