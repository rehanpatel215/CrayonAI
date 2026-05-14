import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MapContainer from './components/MapContainer';
import ComparisonPanel from './components/ComparisonPanel';
import GraphVisualizer from './components/GraphVisualizer';
import ComparisonDashboard from './components/ComparisonDashboard';
import { fetchRoute, updateTraffic, geocodePlace, loadCity, fetchTrafficState, simulateTick, compareRoutes } from './services/api';
import './App.css';
import FloatingTile from './components/FloatingTile';
import LocationInput from './components/LocationInput';
import CustomSelect from './components/CustomSelect';
import { Navigation, MapPin, StopCircle, PlayCircle, BarChart3, Trash2, Pencil } from 'lucide-react';

function App() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [sourceCity, setSourceCity] = useState('');
  const [destCity, setDestCity] = useState('');
  const [regionCity, setRegionCity] = useState('Manhattan, NY');
  const [algorithm, setAlgorithm] = useState('dijkstra');
  const [preference, setPreference] = useState('length');
  const [routes, setRoutes] = useState([]);
  const [exploredNodes, setExploredNodes] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Manhattan
  const [showVisualizerPrompt, setShowVisualizerPrompt] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizerData, setVisualizerData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [trafficEvents, setTrafficEvents] = useState([]);
  const [currentView, setCurrentView] = useState('map'); // 'map' or 'dashboard'
  const [dashboardData, setDashboardData] = useState(null);
  const [isComparingAll, setIsComparingAll] = useState(false);

  // Refs for simulation and animation aborts
  const simAbortRef = React.useRef(false);
  const animAbortRef = React.useRef(false);
  const startRef = React.useRef(start);
  const endRef = React.useRef(end);
  const algoRef = React.useRef(algorithm);

  React.useEffect(() => { startRef.current = start; }, [start]);
  React.useEffect(() => { endRef.current = end; }, [end]);
  React.useEffect(() => { algoRef.current = algorithm; }, [algorithm]);

  // Recursive simulation loop with abort protection
  useEffect(() => {
    simAbortRef.current = false;
    let timeoutId;
    
    const runTick = async () => {
      if (simAbortRef.current || !isSimulating) return;

      const data = await simulateTick();
      if (simAbortRef.current) return; 

      if (data && data.events) {
        setTrafficEvents(data.events.slice(-20)); 
      }

      const currentStart = startRef.current;
      const currentEnd = endRef.current;
      const currentAlgo = algoRef.current;

      // Only auto-update if not manually calculating a route
      if (currentStart && currentEnd && !isCalculating && !animAbortRef.current) {
        try {
          const routeData = await fetchRoute(currentStart, currentEnd, currentAlgo, 'travel_time');
          if (simAbortRef.current || isCalculating) return;
          if (routeData && !routeData.error) {
            setRoutes(routeData.paths || []);
          }
        } catch (err) {
          console.error("Simulation route fetch failed", err);
        }
      }


      timeoutId = setTimeout(runTick, 2000);
    };

    if (isSimulating) {
      setPreference('travel_time');
      runTick();
    }

    return () => {
      simAbortRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSimulating]); 

  const handleRegionChange = async () => {
    if (!regionCity) return;
    setStatusMessage(`Loading 30km Area: ${regionCity} (May take 1-2 mins)...`);
    const data = await loadCity(regionCity);
    if (data && !data.error) {
      handleClear();
      
      const center = await geocodePlace(regionCity);
      if (center) {
        setMapCenter([center.lat, center.lng]);
        setStatusMessage(`Success! Region Loaded: ${regionCity}`);
      } else {
        setStatusMessage(`Region Loaded, but could not re-center map.`);
      }
      setTimeout(() => setStatusMessage(''), 4000);
    } else {
      setStatusMessage(`Error: ${data?.error || 'Could not load region'}`);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const handleMapClick = (latlng) => {
    if (!start) {
      setStart(latlng);
    } else if (!end) {
      setEnd(latlng);
    } else {
      setStart(latlng);
      setEnd(null);
      setRoutes([]);
      setExploredNodes([]);
      setMetrics(null);
    }
  };

  const resolveLocations = async () => {
    let finalStart = start;
    let finalEnd = end;

    if (sourceCity) {
      const res = await geocodePlace(sourceCity);
      if (res && !res.error) {
        finalStart = res;
        setStart(res);
      }
    }

    if (destCity) {
      const res = await geocodePlace(destCity);
      if (res && !res.error) {
        finalEnd = res;
        setEnd(res);
      }
    }
    return { finalStart, finalEnd };
  };

  const handleNavigate = async () => {
    if (isCalculating || loading || isComparingAll) return;
    
    animAbortRef.current = false;
    setIsCalculating(true);
    setStatusMessage('Finding Best Routes...');
    const { finalStart, finalEnd } = await resolveLocations();

    if (!finalStart || !finalEnd) {
      setIsCalculating(false);
      setStatusMessage('');
      alert("Please provide both start and destination");
      return;
    }

    setExploredNodes([]);
    setRoutes([]);
    
    try {
      const data = await fetchRoute(finalStart, finalEnd, algorithm, preference);
      
      if (data && !data.error) {
        setIsCalculating(false);
        const allExplored = data.explored || [];
        
        // requestAnimationFrame based batching for Exploration
        if (allExplored.length > 0) {
          const batchSize = Math.max(100, Math.floor(allExplored.length / 50));
          let currentIdx = 0;
          
          const animateExploration = () => {
            if (animAbortRef.current) return;

            const nextBatch = allExplored.slice(currentIdx, currentIdx + batchSize);
            setExploredNodes(prev => [...prev, ...nextBatch]);
            currentIdx += batchSize;
            
            if (currentIdx < allExplored.length) {
              requestAnimationFrame(animateExploration);
            }
          };
          
          await new Promise(resolve => {
            const startAnim = () => {
              animateExploration();
              setTimeout(resolve, Math.min(2000, (allExplored.length / batchSize) * 16 + 50));
            };
            startAnim();
          });
        }
        
        if (animAbortRef.current) return;

        // Finalize metrics and snap markers (Recalculated dynamically)
        setMetrics({
          distance: data.paths[0]?.distance || 0,
          altDistance: data.paths[1]?.distance || null,
          time: data.paths[0]?.time || 0,
          nodes_explored: data.nodes_explored,
          algo_time: data.algo_time
        });
        
        if (data.start_node_coords) setStart(data.start_node_coords);
        if (data.end_node_coords) setEnd(data.end_node_coords);
        
        // Distinct pause after exploration so user can appreciate the search space
        setStatusMessage('Search Complete. Finalizing Route...');
        await new Promise(r => setTimeout(r, 1000));
        if (animAbortRef.current) return;
        setStatusMessage('Drawing Path...');


        // requestAnimationFrame based batching for Path Drawing
        const finalPaths = data.paths || [];
        const animatedPaths = JSON.parse(JSON.stringify(finalPaths)).map(p => ({ 
          ...p, 
          segments: p.segments.map(s => ({ ...s, coords: [] })) 
        }));
        setRoutes(animatedPaths);

        for (let pIdx = 0; pIdx < finalPaths.length; pIdx++) {
          if (animAbortRef.current) break;
          const fullPath = finalPaths[pIdx];
          for (let sIdx = 0; sIdx < fullPath.segments.length; sIdx++) {
            if (animAbortRef.current) break;
            const fullSegment = fullPath.segments[sIdx];
            const coords = fullSegment.coords;
            const step = Math.max(2, Math.floor(coords.length / 15));
            let currentCoordIdx = 0;

            await new Promise(resolve => {
              const drawSegment = () => {
                if (animAbortRef.current) {
                  resolve();
                  return;
                }

                currentCoordIdx = Math.min(currentCoordIdx + step, coords.length);
                const currentCoords = coords.slice(0, currentCoordIdx);
                
                setRoutes(prev => {
                  if (!prev[pIdx] || !prev[pIdx].segments || !prev[pIdx].segments[sIdx]) return prev;
                  
                  const newRoutes = [...prev];
                  const newPath = { ...newRoutes[pIdx] };
                  newPath.segments = [...newPath.segments];
                  newPath.segments[sIdx] = { ...newPath.segments[sIdx], coords: currentCoords };
                  newRoutes[pIdx] = newPath;
                  
                  return newRoutes;
                });

                if (currentCoordIdx < coords.length) {
                  requestAnimationFrame(drawSegment);
                } else {
                  resolve();
                }
              };
              requestAnimationFrame(drawSegment);
            });
          }
        }

        if (animAbortRef.current) return;
        setVisualizerData(data.graph_data);
        setStatusMessage('Success!');
        
        setTimeout(() => {
          if (animAbortRef.current) return;
          setStatusMessage('');
          setShowVisualizerPrompt(true);
        }, 3000);
      } else {
        setStatusMessage(`Error: ${data?.error || 'Pathfinding failed'}`);
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Network Error: Could not reach backend');
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCompare = async () => {
    if (isComparingAll || loading || isCalculating) return;

    animAbortRef.current = true; // Stop any ongoing animations
    const { finalStart, finalEnd } = await resolveLocations();

    if (!finalStart || !finalEnd) {
      alert("Select start and end points first!");
      return;
    }

    setIsComparingAll(true);
    try {
      const data = await compareRoutes(finalStart, finalEnd, preference);
      if (data && !data.error) {
        setDashboardData(data);
        setCurrentView('dashboard');
      } else {
        alert("Comparison failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Network error: Could not connect to comparison engine");
    } finally {
      setIsComparingAll(false);
    }
  };


  const handleClear = () => {
    animAbortRef.current = true;
    setStart(null);
    setEnd(null);
    setSourceCity('');
    setDestCity('');
    setRoutes([]);
    setExploredNodes([]);
    setMetrics(null);
    setStatusMessage('');
    setShowVisualizerPrompt(false);
    setVisualizerData(null);
  };


  return (
    <div className="app-container">
      {/* Top Header Row */}
      <div className="layout-top-header">
        <FloatingTile className="region-tile">
          <span className="control-label">Active Region</span>
          <input 
            type="text" 
            placeholder="Search Region" 
            value={regionCity}
            onChange={(e) => setRegionCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegionChange()}
            className="city-input compact"
          />
        </FloatingTile>

        <FloatingTile className="modular-journey-tile">
          <LocationInput
            placeholder="Origin"
            value={sourceCity}
            onChange={setSourceCity}
            icon={MapPin}
            iconColor="var(--accent-red)"
          />
          <div className="tile-divider-v"></div>
          <LocationInput
            placeholder="Destination"
            value={destCity}
            onChange={setDestCity}
            icon={MapPin}
            iconColor="var(--accent-green)"
          />
        </FloatingTile>

        <FloatingTile className="modular-logic-tile">
          <CustomSelect 
            label="Algorithm"
            value={algorithm}
            onChange={setAlgorithm}
            options={[
              { value: 'dijkstra', label: 'Dijkstra' },
              { value: 'astar', label: 'A* AI' },
              { value: 'greedy', label: 'Greedy' }
            ]}
          />
          <div className="tile-divider-v"></div>
          <CustomSelect 
            label="Goal"
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'length', label: 'Shortest' },
              { value: 'travel_time', label: 'Fastest' }
            ]}
          />
        </FloatingTile>

        <FloatingTile className="modular-action-tile">
          <button className="btn-primary-compact" onClick={handleNavigate}>
            Calculate
          </button>
          <div className="tile-divider-v"></div>
          <button className={`btn-text-glass ${isSimulating ? 'active' : ''}`} onClick={() => setIsSimulating(!isSimulating)}>
            {isSimulating ? <StopCircle size={16} /> : <PlayCircle size={16} />}
            <span>{isSimulating ? 'Stop' : 'Simulate'}</span>
          </button>
          <button className="btn-text-glass" onClick={handleCompare}>
            <BarChart3 size={16} />
            <span>Compare</span>
          </button>
          <button className="btn-secondary-red" onClick={handleClear} title="Reset All">
            <Trash2 size={16} />
          </button>
        </FloatingTile>
      </div>

      {/* Bottom Left: Brand Identity */}
      <div className="layout-bottom-left">
        <FloatingTile className="brand-tile">
          <div className="brand-logo-container">
            <svg width="32" height="32" viewBox="0 0 32 32" className="brand-logo-svg">
              <path 
                d="M4,24 Q12,12 20,24 T28,12" 
                fill="none" 
                stroke="var(--accent-blue)" 
                strokeWidth="3" 
                strokeLinecap="round"
                className="brand-road-path"
              />
              <g className="brand-crayon">
                <Pencil size={14} color="var(--accent-blue)" />
              </g>
            </svg>
          </div>
          <h2>CrayonAI</h2>
        </FloatingTile>
      </div>
      
      <main className="app-content">
        {(loading || isCalculating || isComparingAll) && (
          <div className="loading-dashboard-overlay">
            <div className="crayon-loader">
              <svg width="300" height="150" viewBox="-30 -30 260 160" className="crayon-loader-svg">
                {/* Multi-colored paths */}
                <path d="M20,50 Q60,20 100,50 T180,50" fill="none" strokeWidth="6" strokeDasharray="200" strokeDashoffset="200" className="draw-path path-blue" />
                <path d="M20,50 Q60,20 100,50 T180,50" fill="none" strokeWidth="6" strokeDasharray="200" strokeDashoffset="200" className="draw-path path-green" />
                <path d="M20,50 Q60,20 100,50 T180,50" fill="none" strokeWidth="6" strokeDasharray="200" strokeDashoffset="200" className="draw-path path-yellow" />
                <path d="M20,50 Q60,20 100,50 T180,50" fill="none" strokeWidth="6" strokeDasharray="200" strokeDashoffset="200" className="draw-path path-red" />
                
                <g className="crayon-icon">
                  <Pencil size={36} color="var(--accent-blue)" style={{ transform: 'rotate(-45deg)' }} />
                </g>
              </svg>
              <h2>CrayonAI <span className="highlight">
                {isComparingAll ? 'Analysis' : isCalculating ? 'Optimizing' : 'Loading'}
              </span></h2>
              <div className="loading-steps">
                <span>
                  {isComparingAll ? 'Evaluating Multi-Path Scenarios' : 
                   isCalculating ? 'Calculating Smartest Route' : 
                   'Fetching Live Traffic Data'}
                </span>
              </div>
            </div>
          </div>
        )}

        {statusMessage && !isCalculating && !loading && !isComparingAll && (
          <div className="status-toast glass">
            {statusMessage}
          </div>
        )}

        {showVisualizerPrompt && (
          <div className="visualizer-prompt-overlay">
            <div className="prompt-card glass">
              <h3>Search Space Analysis</h3>
              <p>Pathfinding complete! Would you like to view the internal AI search space and discarded routes?</p>
              <div className="prompt-actions">
                <button className="btn-primary" onClick={() => { setIsVisualizing(true); setShowVisualizerPrompt(false); }}>Yes, Visualize</button>
                <button className="btn-ghost" onClick={() => setShowVisualizerPrompt(false)}>No, Thanks</button>
              </div>
            </div>
          </div>
        )}

        {isVisualizing && (
          <GraphVisualizer 
            data={visualizerData} 
            onClose={() => setIsVisualizing(false)} 
          />
        )}

        {metrics && (
          <div className="result-stats glass">
            <div className="stat-row">
              <span><strong>Primary:</strong> {metrics.distance} km</span>
              {metrics.altDistance && <span><strong>Alt:</strong> {metrics.altDistance} km</span>}
            </div>
            <div className="stat-row">
              <span><strong>Time:</strong> {metrics.algo_time} sec</span>
              <span><strong>Nodes:</strong> {metrics.nodes_explored}</span>
            </div>
          </div>
        )}

        {comparisonData && (
          <ComparisonPanel 
            data={comparisonData} 
            onClose={() => setComparisonData(null)} 
          />
        )}

        {currentView === 'dashboard' && (
          <ComparisonDashboard 
            data={dashboardData} 
            onClose={() => setCurrentView('map')} 
          />
        )}

        <MapContainer 
          center={mapCenter}
          start={start} 
          end={end} 
          onMapClick={handleMapClick}
          routes={routes}
          exploredNodes={exploredNodes}
        />
      </main>
    </div>
  );
}

export default App;
