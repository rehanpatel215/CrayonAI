# 📍 CrayonAI: Smart Route Planner & Search Space Visualizer

CrayonAI is a high-performance, visually immersive pathfinding application that leverages real-world geospatial data to optimize travel routes. It goes beyond simple navigation by visualizing the internal decision-making process of various AI pathfinding algorithms.

![CrayonAI Banner](https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=1200&auto=format&fit=crop)

## 🚀 Features

- **Real-World Map Data**: Utilizes `OSMnx` and OpenStreetMap to fetch high-fidelity road networks from any city in the world.
- **Algorithm Comparison**: compare performance between:
  - **Dijkstra's Algorithm**: Guarantees the shortest path.
  - **A* Search**: Uses heuristics for faster, optimized routing.
  - **Greedy Best-First Search**: Focuses solely on reaching the destination quickly.
- **Interactive Search Space Visualization**: A full-screen SVG-based graph visualization that shows:
  - 🔵 **Primary Path**: The calculated optimal route.
  - 🟡 **Alternative Path**: A penalized secondary route for comparison.
  - 🔴 **Discarded Search Space**: Every node and edge explored by the algorithm that was rejected.
- **Dynamic Traffic Simulation**: Simulate real-time traffic congestion and see how algorithms adapt.
- **Geocoding Support**: Search for locations globally using natural language.
- **Premium UI**: Dark-mode aesthetic with glassmorphism effects, smooth animations, and responsive panels.

## 🛠️ Tech Stack

### Backend
- **Python / Flask**: API layer.
- **OSMnx / NetworkX**: Road network modeling and graph theory.
- **Geopy**: Address geocoding.
- **Pickle**: Intelligent caching of city graphs (30km search radius).

### Frontend
- **React 19 / Vite**: Modern component-based UI.
- **Leaflet / React-Leaflet**: Map rendering and interaction.
- **Lucide React**: Premium iconography.
- **Vanilla CSS**: Custom glassmorphic design system.

## 📦 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/RouteMindAI.git
cd CrayonAI
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

## 🖥️ Usage

1. **Set Location**: Use the sidebar to geocode a city or specific landmark.
2. **Select Points**: Click on the map to set your **Start** and **End** markers.
3. **Choose Algorithm**: Select Dijkstra, A*, or Greedy from the comparison panel.
4. **Analyze**:
   - View execution time and distance metrics.
   - Click **"Visualize Search Space"** to see the raw graph analysis of how the AI explored the road network.
5. **Simulate Traffic**: Adjust the traffic slider to see travel time changes.

## 📂 Project Structure

```text
RouteMindAI/
├── backend/
│   ├── app.py           # Flask API Endpoints
│   ├── engine.py        # Pathfinding Logic & Graph Management
│   └── requirements.txt # Python Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/  # UI Components (Map, Visualizer, Sidebar)
│   │   ├── services/    # API Integration
│   │   └── App.jsx      # Main Application logic
│   └── package.json     # Node Dependencies
├── data/                # Cached city graphs (.pkl)
├── cache/               # OSMnx cache
└── .gitignore           # Git exclusion rules
```


