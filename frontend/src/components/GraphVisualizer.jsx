import React, { useMemo } from 'react';
import { X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const GraphVisualizer = ({ data, onClose }) => {
  if (!data) return null;

  // Colors: 1=Blue (Primary), 2=Yellow (Alt), 3=Red (Discarded)
  const colors = {
    1: "#58a6ff",
    2: "#ffcc00",
    3: "rgba(248, 81, 73, 0.4)"
  };

  const nodeColors = {
    1: "#58a6ff",
    2: "#ffcc00",
    3: "#f85149"
  };

  // Find min/max for scaling
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    data.nodes.forEach(n => {
      if (n.lng < minX) minX = n.lng;
      if (n.lng > maxX) maxX = n.lng;
      if (n.lat < minY) minY = n.lat;
      if (n.lat > maxY) maxY = n.lat;
    });
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }, [data]);

  const scale = (val, min, total, size) => {
    return ((val - min) / total) * size;
  };

  const PADDING = 50;
  const VIEW_WIDTH = 1000;
  const VIEW_HEIGHT = 800;

  return (
    <div className="visualizer-page">
      <div className="visualizer-header glass">
        <div className="header-left">
          <Maximize size={20} color="#58a6ff" />
          <h2>Search Space Analysis</h2>
        </div>
        <div className="header-legend">
          <span className="legend-item"><div className="dot blue"></div> Primary Path</span>
          <span className="legend-item"><div className="dot yellow"></div> Alternative Path</span>
          <span className="legend-item"><div className="dot red"></div> Discarded Routes</span>
        </div>
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
      </div>

      <div className="graph-container glass">
        <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="graph-svg">
          {/* Render Discarded Edges First */}
          {data.links.filter(l => l.type === 3).map((link, i) => {
            const source = data.nodes.find(n => n.id === link.source);
            const target = data.nodes.find(n => n.id === link.target);
            if (!source || !target) return null;
            return (
              <line
                key={`d-${i}`}
                x1={scale(source.lng, bounds.minX, bounds.width, VIEW_WIDTH - 2*PADDING) + PADDING}
                y1={VIEW_HEIGHT - (scale(source.lat, bounds.minY, bounds.height, VIEW_HEIGHT - 2*PADDING) + PADDING)}
                x2={scale(target.lng, bounds.minX, bounds.width, VIEW_WIDTH - 2*PADDING) + PADDING}
                y2={VIEW_HEIGHT - (scale(target.lat, bounds.minY, bounds.height, VIEW_HEIGHT - 2*PADDING) + PADDING)}
                stroke={colors[3]}
                strokeWidth="1"
              />
            );
          })}

          {/* Render Primary and Alt Edges on top */}
          {data.links.filter(l => l.type !== 3).map((link, i) => {
            const source = data.nodes.find(n => n.id === link.source);
            const target = data.nodes.find(n => n.id === link.target);
            if (!source || !target) return null;
            return (
              <line
                key={`p-${i}`}
                x1={scale(source.lng, bounds.minX, bounds.width, VIEW_WIDTH - 2*PADDING) + PADDING}
                y1={VIEW_HEIGHT - (scale(source.lat, bounds.minY, bounds.height, VIEW_HEIGHT - 2*PADDING) + PADDING)}
                x2={scale(target.lng, bounds.minX, bounds.width, VIEW_WIDTH - 2*PADDING) + PADDING}
                y2={VIEW_HEIGHT - (scale(target.lat, bounds.minY, bounds.height, VIEW_HEIGHT - 2*PADDING) + PADDING)}
                stroke={colors[link.type]}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}

          {/* Render Nodes */}
          {data.nodes.map((node, i) => (
            <circle
              key={i}
              cx={scale(node.lng, bounds.minX, bounds.width, VIEW_WIDTH - 2*PADDING) + PADDING}
              cy={VIEW_HEIGHT - (scale(node.lat, bounds.minY, bounds.height, VIEW_HEIGHT - 2*PADDING) + PADDING)}
              r={node.type !== 3 ? 5 : 2}
              fill={nodeColors[node.type]}
              className={node.type !== 3 ? "node-active" : "node-discarded"}
            >
              <title>Node {node.id}</title>
            </circle>
          ))}
        </svg>
      </div>
      
      <div className="visualizer-footer glass">
        <p>This graph represents the internal decision-making process of the {data.nodes.length} nodes analyzed during the search.</p>
      </div>
    </div>
  );
};

export default GraphVisualizer;
