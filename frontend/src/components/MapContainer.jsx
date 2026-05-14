import React, { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Polyline, useMapEvents, useMap, CircleMarker, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getTrafficColor = (state) => {
  switch (state) {
    case 'green': return '#34a853';
    case 'orange': return '#fbbc04';
    case 'red': return '#ea4335';
    case 'blocked': return '#202124';
    default: return '#4285f4'; // Primary blue fallback
  }
};

const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

// Component to handle map view updates and auto-fit bounds
const MapViewHandler = ({ center, start, end, routes }) => {
    const map = useMap();
    
    useEffect(() => {
        if (start && end) {
            const bounds = L.latLngBounds([[start.lat, start.lng], [end.lat, end.lng]]);
            map.fitBounds(bounds, { 
                padding: [120, 120], 
                duration: 1.2, 
                animate: true 
            });
        } else if (center) {
            map.flyTo(center, 13, { duration: 1.5 });
        }
    }, [start, end, center, map]); 

    return null;
};

// Optimized layer for explored nodes to avoid React component overhead
const ExploredNodesLayer = ({ nodes }) => {
  const map = useMap();
  const layerRef = React.useRef(null);

  useEffect(() => {
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      if (layerRef.current) {
        layerRef.current.remove();
      }
    };
  }, [map]);

  useEffect(() => {
    if (!layerRef.current) return;
    
    layerRef.current.clearLayers();
    
    // Only render if we have nodes, and batch them
    if (nodes && nodes.length > 0) {
      nodes.forEach(node => {
        L.circleMarker([node.lat, node.lng], {
          radius: 2,
          color: '#4285f4', // Use hex for direct Leaflet
          fillColor: '#4285f4',
          fillOpacity: 0.8,
          stroke: false,
          interactive: false // Significant performance boost
        }).addTo(layerRef.current);
      });
    }
  }, [nodes]);

  return null;
};

const MapContainer = ({ center, start, end, onMapClick, routes, exploredNodes }) => {
  const defaultCenter = [40.7128, -74.0060]; // Manhattan

  return (
    <div className="map-wrapper">
      <LeafletMap 
        center={center || [40.7128, -74.0060]} 
        zoom={13} 
        scrollWheelZoom={true}
        zoomControl={false} 
        preferCanvas={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <ZoomControl position="bottomright" />
        
        <MapEvents onMapClick={onMapClick} />
        <MapViewHandler center={center} start={start} end={end} routes={routes} />

        {/* Optimized Explored Nodes Layer */}
        <ExploredNodesLayer nodes={exploredNodes} />

        {start && (
          <Marker position={[start.lat, start.lng]} icon={greenIcon}>
          </Marker>
        )}

        {end && (
          <Marker position={[end.lat, end.lng]} icon={redIcon}>
          </Marker>
        )}

        {/* Render Multiple Routes */}
        {routes && routes.map((route, index) => {
          const routeKey = route.id || index;
          if (route.segments) {
            return route.segments.map((segment, sIdx) => (
              <Polyline 
                key={`${routeKey}-${sIdx}`}
                positions={segment.coords.map(p => [p.lat, p.lng])}
                pathOptions={{ 
                  color: index === 0 ? getTrafficColor(segment.state) : '#ffcc00', 
                  weight: index === 0 ? 8 : 5, 
                  opacity: index === 0 ? 0.95 : 0.7,
                  dashArray: index === 0 ? null : (segment.state === 'blocked' ? "5, 5" : null),
                  className: index === 0 ? 'route-path-primary' : 'route-path-alt'
                }}
              />
            ));
          }
          return (
            <Polyline 
              key={routeKey}
              positions={route.coords.map(p => [p.lat, p.lng])}
              pathOptions={{ 
                color: index === 0 ? '#4285f4' : '#ffcc00', 
                weight: index === 0 ? 8 : 5, 
                opacity: index === 0 ? 0.95 : 0.7,
                dashArray: index === 0 ? null : "10, 10",
                className: index === 0 ? 'route-path-primary' : 'route-path-alt'
              }}
            />
          );
        })}
      </LeafletMap>
    </div>
  );
};


export default MapContainer;
