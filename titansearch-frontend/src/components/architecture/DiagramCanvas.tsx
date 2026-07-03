import React from 'react';

interface Node {
  id: string;
  label: string;
  layer: string;
  description: string;
}

interface Edge {
  from: string;
  to: string;
  type: string;
}

interface DiagramCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({ nodes, edges }) => {
  // Define layers for vertical layout ordering
  const layerOrder = ['CLIENT', 'PRESENTATION', 'BUSINESS', 'PERSISTENCE', 'CACHE', 'INFRASTRUCTURE'];

  // Width and height of SVG
  const width = 800;
  const height = 500;

  // Group nodes by layer
  const nodesByLayer: { [key: string]: Node[] } = {};
  layerOrder.forEach(layer => {
    nodesByLayer[layer] = nodes.filter(n => n.layer === layer || (layer === 'PERSISTENCE' && n.layer === 'CACHE'));
  });

  // Calculate coordinates for each node
  const nodePositions: { [id: string]: { x: number; y: number } } = {};

  layerOrder.forEach((layer, layerIdx) => {
    const layerNodes = nodesByLayer[layer];
    if (layerNodes.length === 0) return;

    // Y position based on layer index
    const y = 60 + layerIdx * 80;

    // X positions distributed evenly
    layerNodes.forEach((node, nodeIdx) => {
      const x = (width / (layerNodes.length + 1)) * (nodeIdx + 1);
      nodePositions[node.id] = { x, y };
    });
  });

  return (
    <div className="w-full overflow-x-auto bg-[#151D30] rounded-xl border border-[#23304E] p-6 relative">
      <div className="absolute top-4 left-6 flex items-center space-x-2 text-xs text-[#94A3B8]">
        <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse"></span>
        <span>Interactive Architecture Graph</span>
      </div>

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto max-w-4xl">
        <defs>
          {/* Arrow markers for edges */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
          </marker>
        </defs>

        {/* Draw Edges */}
        {edges.map((edge, idx) => {
          const fromPos = nodePositions[edge.from];
          const toPos = nodePositions[edge.to];

          if (!fromPos || !toPos) return null;

          return (
            <g key={`edge-${idx}`}>
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="#23304E"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="transition-colors hover:stroke-[#3B82F6]"
              />
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="#3B82F6"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
                className="opacity-70"
              />
              {/* Text label for edge relationship */}
              <text
                x={(fromPos.x + toPos.x) / 2}
                y={(fromPos.y + toPos.y) / 2 - 5}
                fill="#94A3B8"
                fontSize="9"
                textAnchor="middle"
                className="select-none font-medium"
              >
                {edge.type}
              </text>
            </g>
          );
        })}

        {/* Draw Nodes */}
        {nodes.map(node => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

          // Determine coloring based on node layer
          let colorClass = 'fill-[#151D30] stroke-[#23304E]';
          let textBgClass = 'fill-[#3B82F6]';

          if (node.layer === 'CLIENT') {
            colorClass = 'fill-[#151D30] stroke-[#60A5FA]';
            textBgClass = 'fill-[#60A5FA]';
          } else if (node.layer === 'PRESENTATION') {
            colorClass = 'fill-[#151D30] stroke-[#10B981]';
            textBgClass = 'fill-[#10B981]';
          } else if (node.layer === 'BUSINESS') {
            colorClass = 'fill-[#151D30] stroke-[#F59E0B]';
            textBgClass = 'fill-[#F59E0B]';
          } else if (node.layer === 'PERSISTENCE' || node.layer === 'CACHE') {
            colorClass = 'fill-[#151D30] stroke-[#EF4444]';
            textBgClass = 'fill-[#EF4444]';
          } else if (node.layer === 'INFRASTRUCTURE') {
            colorClass = 'fill-[#151D30] stroke-[#8B5CF6]';
            textBgClass = 'fill-[#8B5CF6]';
          }

          return (
            <g key={node.id} className="group cursor-pointer">
              {/* Node Card Box */}
              <rect
                x={pos.x - 70}
                y={pos.y - 25}
                width="140"
                height="50"
                rx="8"
                className={`${colorClass} stroke-2 transition-all group-hover:scale-105 transform origin-center shadow-lg`}
              />

              {/* Little side tag representing category */}
              <circle cx={pos.x - 55} cy={pos.y} r="4" className={textBgClass} />

              {/* Node Title */}
              <text
                x={pos.x + 10}
                y={pos.y + 4}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="11"
                className="font-semibold select-none group-hover:fill-[#3B82F6]"
              >
                {node.label}
              </text>

              {/* Hover Tooltip detailing node function */}
              <title>{`${node.label}\nLayer: ${node.layer}\nDescription: ${node.description}`}</title>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]"></span>
          <span className="text-[#94A3B8]">Client</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
          <span className="text-[#94A3B8]">Presentation</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
          <span className="text-[#94A3B8]">Business</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
          <span className="text-[#94A3B8]">Data/Cache</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span>
          <span className="text-[#94A3B8]">Infra</span>
        </div>
      </div>
    </div>
  );
};
