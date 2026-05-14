import React from 'react';
import { Navigation, Settings2 } from 'lucide-react';
import CustomSelect from './CustomSelect';

const LogoTile = ({ regionCity, setRegionCity, onRegionChange, algorithm, setAlgorithm, preference, setPreference, isSimulating }) => {
  const handleRegionKey = (e) => {
    if (e.key === 'Enter') onRegionChange();
  };

  return (
    <div className="logo-tile glass side-panel">
      <div className="logo-section">
        <Navigation size={24} color="var(--accent-blue)" strokeWidth={3} />
        <h2>Crayon</h2>
      </div>

      <div className="panel-section">
        <span className="control-label">Active Region</span>
        <input 
          type="text" 
          placeholder="e.g. London" 
          value={regionCity}
          onChange={(e) => setRegionCity(e.target.value)}
          onKeyDown={handleRegionKey}
          className="city-input compact"
        />
      </div>

      <div className="panel-divider"></div>

      <div className="panel-section">
        <CustomSelect 
          label="Routing Algorithm"
          value={algorithm}
          onChange={setAlgorithm}
          options={[
            { value: 'dijkstra', label: 'Dijkstra' },
            { value: 'astar', label: 'A* Intelligence' },
            { value: 'greedy', label: 'Greedy Search' }
          ]}
        />
      </div>

      <div className="panel-section">
        <CustomSelect 
          label="Optimization Goal"
          value={preference}
          onChange={setPreference}
          disabled={isSimulating}
          options={[
            { value: 'length', label: 'Shortest Distance' },
            { value: 'travel_time', label: 'Fastest ETA' }
          ]}
        />
      </div>
    </div>
  );
};

export default LogoTile;
