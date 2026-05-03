import React from 'react';
import { Navigation, Trash2 } from 'lucide-react';

const Sidebar = ({ 
  algorithm, 
  setAlgorithm, 
  preference, 
  setPreference,
  sourceCity,
  setSourceCity,
  destCity,
  setDestCity,
  regionCity,
  setRegionCity,
  onNavigate, 
  onClear,
  onCompare,
  onRegionChange
}) => {
  const handleRegionKey = (e) => {
    if (e.key === 'Enter') onRegionChange();
  };

  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <Navigation size={20} color="#58a6ff" />
        <input 
          type="text" 
          placeholder="Region (e.g. Paris)" 
          value={regionCity}
          onChange={(e) => setRegionCity(e.target.value)}
          onKeyDown={handleRegionKey}
          className="region-input"
        />
      </div>

      <div className="control-group">
        <input 
          type="text" 
          placeholder="e.g. Times Square" 
          value={sourceCity}
          onChange={(e) => setSourceCity(e.target.value)}
          className="city-input"
        />
        <input 
          type="text" 
          placeholder="e.g. Central Park" 
          value={destCity}
          onChange={(e) => setDestCity(e.target.value)}
          className="city-input"
        />
      </div>

      <div className="control-group">
        <select 
          value={algorithm} 
          onChange={(e) => setAlgorithm(e.target.value)}
          className="dropdown-select"
        >
          <option value="dijkstra">Dijkstra</option>
          <option value="astar">A*</option>
          <option value="greedy">Greedy</option>
        </select>

        <select 
          value={preference} 
          onChange={(e) => setPreference(e.target.value)}
          className="dropdown-select"
        >
          <option value="length">Shortest</option>
          <option value="travel_time">Fastest</option>
        </select>
      </div>

      <div className="action-buttons">
        <button className="btn-primary" onClick={onNavigate}>
          Start
        </button>
        <button className="btn-secondary" onClick={onClear}>
          <Trash2 size={16} />
        </button>
        <button className="btn-ghost" onClick={onCompare}>
          Compare
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
