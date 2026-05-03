import React from 'react';
import { X, Check, Timer, Map as MapIcon, Layers } from 'lucide-react';

const ComparisonPanel = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="comparison-overlay glass">
      <div className="comparison-content">
        <div className="comparison-header">
          <h2>Algorithm Comparative Analysis</h2>
          <button className="close-btn" onClick={onClose}><X /></button>
        </div>

        <div className="comparison-grid">
          {Object.entries(data).map(([algo, metrics]) => (
            <div key={algo} className="comparison-card">
              <div className="card-header">
                <Layers size={20} color="#58a6ff" />
                <h3>{algo.toUpperCase()}</h3>
              </div>
              <div className="card-stats">
                <div className="stat">
                  <MapIcon size={16} />
                  <span>Distance: <strong>{metrics.distance} km</strong></span>
                </div>
                <div className="stat">
                  <Timer size={16} />
                  <span>Time: <strong>{metrics.time} min</strong></span>
                </div>
                <div className="stat">
                  <Check size={16} />
                  <span>Nodes: <strong>{metrics.nodesExplored}</strong></span>
                </div>
                <div className="stat execution-time">
                  <Timer size={16} color="#00ff88" />
                  <span>Execution: <strong>{metrics.algoTime}s</strong></span>
                </div>
              </div>
              <div className="efficiency-bar">
                <div 
                  className="bar-fill" 
                  style={{ width: `${Math.min(100, (metrics.nodesExplored / 1000) * 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="comparison-footer">
          <p>Insight: Dijkstra explores more nodes to guarantee the absolute shortest path, while A* uses heuristics to optimize search.</p>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPanel;
