import React from 'react';
import { Navigation, Trash2, MapPin, Settings2, PlayCircle, StopCircle, BarChart3 } from 'lucide-react';
import LocationInput from './LocationInput';
import CustomSelect from './CustomSelect';

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
  onRegionChange,
  isSimulating,
  setIsSimulating,
  trafficEvents
}) => {
  const handleRegionKey = (e) => {
    if (e.key === 'Enter') onRegionChange();
  };

  return (
    <aside className="sidebar dynamic-island glass">
      <div className="island-group address-group">
        <LocationInput
          placeholder="Origin"
          value={sourceCity}
          onChange={setSourceCity}
          icon={MapPin}
          iconColor="var(--accent-red)"
        />
        <div className="island-divider"></div>
        <LocationInput
          placeholder="Destination"
          value={destCity}
          onChange={setDestCity}
          icon={MapPin}
          iconColor="var(--accent-green)"
        />
      </div>

      <div className="island-divider-vertical"></div>

      <div className="island-group action-group">
        <button className="btn-primary-island" onClick={onNavigate}>
          Calculate
        </button>
        <button 
          className={`btn-sim-island ${isSimulating ? 'active' : ''}`}
          onClick={() => setIsSimulating(!isSimulating)}
          title={isSimulating ? 'Stop Simulation' : 'Run Simulation'}
        >
          {isSimulating ? <StopCircle size={18} /> : <PlayCircle size={18} />}
        </button>
        <button className="btn-ghost-island" onClick={onCompare} title="Performance Analysis">
          <BarChart3 size={18} />
        </button>
        <button className="btn-secondary-island" onClick={onClear} title="Reset All">
          <Trash2 size={18} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
