import React, { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Polyline, useMapEvents, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const getTrafficColor = (state) => {
  switch (state) {
    case 'green': return '#2eb82e';
    case 'orange': return '#ff9933';
    case 'red': return '#ff3333';
    case 'blocked': return '#1a1a1a';
    default: return '#58a6ff'; // Primary blue fallback
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
        if (start && end && !routes.length) {
            // Fit bounds to start/end markers only before path is found
            const bounds = L.latLngBounds([[start.lat, start.lng], [end.lat, end.lng]]);
            map.fitBounds(bounds, { padding: [100, 100] });
        } else if (center && !start && !end) {
            // Center map on region change
            map.setView(center, map.getZoom());
        }
    }, [center, start, end, routes, map]);

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
        preferCanvas={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapEvents onMapClick={onMapClick} />
        <MapViewHandler center={center} start={start} end={end} routes={routes} />

        {/* Render Explored Nodes */}
        {exploredNodes && exploredNodes.map((node, idx) => (
          <CircleMarker 
            key={idx}
            center={[node.lat, node.lng]}
            radius={1.5}
            pathOptions={{ 
              color: '#ffcc00', 
              fillColor: '#ffcc00', 
              fillOpacity: 0.6, 
              stroke: false,
              className: 'explored-node-marker' 
            }}
          />
        ))}

        {start && (
          <Marker position={[start.lat, start.lng]}>
          </Marker>
        )}

        {end && (
          <Marker position={[end.lat, end.lng]}>
          </Marker>
        )}

        {/* Render Multiple Routes */}
        {routes && routes.map((route, index) => {
          if (route.segments) {
            return route.segments.map((segment, sIdx) => (
              <Polyline 
                key={`${index}-${sIdx}`}
                positions={segment.coords.map(p => [p.lat, p.lng])}
                pathOptions={{ 
                  color: index === 0 ? getTrafficColor(segment.state) : '#ffcc00', 
                  weight: index === 0 ? 6 : 4, 
                  opacity: index === 0 ? 0.9 : 0.7,
                  dashArray: index === 0 ? null : (segment.state === 'blocked' ? "5, 5" : null) 
                }}
              />
            ));
          }
          return (
            <Polyline 
              key={index}
              positions={route.coords.map(p => [p.lat, p.lng])}
              pathOptions={{ 
                color: index === 0 ? '#58a6ff' : '#ffcc00', 
                weight: index === 0 ? 6 : 4, 
                opacity: index === 0 ? 0.9 : 0.7,
                dashArray: index === 0 ? null : "10, 10" 
              }}
            />
          );
        })}
      </LeafletMap>
    </div>
  );
};

export default MapContainer;
