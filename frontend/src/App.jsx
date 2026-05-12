import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MapContainer from './components/MapContainer';
import ComparisonPanel from './components/ComparisonPanel';
import GraphVisualizer from './components/GraphVisualizer';
import ComparisonDashboard from './components/ComparisonDashboard';
import { fetchRoute, updateTraffic, geocodePlace, loadCity, fetchTrafficState, simulateTick } from './services/api';
import './App.css';

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

  // Recursive simulation loop
  useEffect(() => {
    let timeoutId;
    
    const runTick = async () => {
      if (!isSimulating) return;

      const data = await simulateTick();
      if (data && data.events) {
        // Events are already capped on backend, but we ensure frontend state is fresh
        setTrafficEvents(data.events.slice(-20)); 
      }

      // If we have a route, re-fetch it to account for new traffic
      // We always use 'travel_time' during simulation as requested
      if (start && end) {
        try {
          const routeData = await fetchRoute(start, end, algorithm, 'travel_time');
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
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSimulating, start, end, algorithm]); // Dependencies for re-fetching

  const handleRegionChange = async () => {
    // ... rest of handleRegionChange
    if (!regionCity) return;
    setStatusMessage(`Loading 30km Area: ${regionCity} (May take 1-2 mins)...`);
    const data = await loadCity(regionCity);
    if (data && !data.error) {
      handleClear();
      
      // Geocode city center to reposition map
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
    setStatusMessage('Finding Best Routes...');
    const { finalStart, finalEnd } = await resolveLocations();

    if (!finalStart || !finalEnd) {
      setStatusMessage('');
      alert("Please provide both start and destination");
      return;
    }

    setExploredNodes([]);
    setRoutes([]);
    
    try {
      const data = await fetchRoute(finalStart, finalEnd, algorithm, preference);
      
      if (data && !data.error) {
        const allExplored = data.explored || [];
        
        // Optimized animation loop
        if (allExplored.length > 0) {
          const batchSize = Math.max(5, Math.floor(allExplored.length / 30));
          for (let i = 0; i < allExplored.length; i += batchSize) {
            const batch = allExplored.slice(i, i + batchSize);
            setExploredNodes(prev => [...prev, ...batch]);
            await new Promise(r => setTimeout(r, 20));
          }
        }
        
        // Finalize paths and metrics
        setMetrics({
          distance: data.paths[0]?.distance || 0,
          altDistance: data.paths[1]?.distance || null,
          time: data.paths[0]?.time || 0,
          nodes_explored: data.nodes_explored,
          algo_time: data.algo_time
        });
        
        // Snap markers to actual road nodes
        if (data.start_node_coords) setStart(data.start_node_coords);
        if (data.end_node_coords) setEnd(data.end_node_coords);
        
        // Pause for 1 second after exploration before drawing paths
        await new Promise(r => setTimeout(r, 1000));

        // Staggered path drawing animation
        const finalPaths = data.paths || [];
        const animatedPaths = finalPaths.map(p => ({ ...p, segments: p.segments.map(s => ({ ...s, coords: [] })) }));
        setRoutes(animatedPaths);

        for (let pIdx = 0; pIdx < finalPaths.length; pIdx++) {
          const fullPath = finalPaths[pIdx];
          for (let sIdx = 0; sIdx < fullPath.segments.length; sIdx++) {
            const fullSegment = fullPath.segments[sIdx];
            const coords = fullSegment.coords;
            const step = Math.max(1, Math.floor(coords.length / 10));
            
            for (let i = 0; i <= coords.length; i += step) {
              const currentCoords = coords.slice(0, Math.min(i + step, coords.length));
              setRoutes(prev => {
                const newRoutes = [...prev];
                newRoutes[pIdx].segments[sIdx].coords = currentCoords;
                return newRoutes;
              });
              await new Promise(r => setTimeout(r, 10));
            }
          }
        }

        setVisualizerData(data.graph_data);
        setStatusMessage('Success!');
        
        setTimeout(() => {
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
    }
  };

  const handleCompare = async () => {
    const { finalStart, finalEnd } = await resolveLocations();
    if (!finalStart || !finalEnd) {
      alert("Select start and end points first!");
      return;
    }

    setIsComparingAll(true);
    try {
      const response = await fetch('http://localhost:5000/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: finalStart, end: finalEnd, preference })
      });
      const data = await response.json();
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
      <Sidebar 
        algorithm={algorithm} 
        setAlgorithm={setAlgorithm}
        preference={preference}
        setPreference={setPreference}
        sourceCity={sourceCity}
        setSourceCity={setSourceCity}
        destCity={destCity}
        setDestCity={setDestCity}
        regionCity={regionCity}
        setRegionCity={setRegionCity}
        onNavigate={handleNavigate}
        onClear={handleClear}
        onCompare={handleCompare}
        onRegionChange={handleRegionChange}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        trafficEvents={trafficEvents}
      />
      
      <main className="app-content">
        {loading && <div className="loading-overlay">Performing Comparison...</div>}
        
        {statusMessage && (
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

        {isComparingAll && (
          <div className="loading-dashboard">
            <div className="spinner"></div>
            <h2>Running Comparative Analysis...</h2>
            <p>Evaluating 5 different algorithms under current traffic conditions</p>
          </div>
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
