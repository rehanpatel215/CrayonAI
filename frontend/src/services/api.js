const API_BASE_URL = 'http://localhost:5000/api';

/**
 * API SERVICE
 * 
 * WHAT TO DO HERE:
 * 1. Define functions to call Flask endpoints:
 *    - fetchGraph(): Gets the map nodes/edges.
 *    - calculateRoute(start, end, algorithm): Gets the path from backend.
 *    - updateTraffic(factor): Notifies backend of traffic changes.
 */

export const fetchRoute = async (start, end, algorithm, preference = 'length') => {
  try {
    const response = await fetch(`${API_BASE_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end, algorithm, preference }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
};

export const updateTraffic = async (level) => {
  try {
    const response = await fetch(`${API_BASE_URL}/traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error updating traffic:", error);
    return null;
  }
};

export const geocodePlace = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error geocoding place:", error);
    return null;
  }
};

export const loadCity = async (city) => {
  try {
    const response = await fetch(`${API_BASE_URL}/load_city`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error loading city:", error);
    return null;
  }
};
