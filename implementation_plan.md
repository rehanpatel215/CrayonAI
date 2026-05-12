# Implementation Plan - Smart Route Planner (AI Navigation System)

This project aims to build an interactive AI-powered navigation system that visualizes pathfinding algorithms on a real-world or synthetic graph. The system will demonstrate how different algorithms (Dijkstra, A*, Greedy) select optimal routes based on distance, traffic, and user preferences.

## User Review Required

> [!IMPORTANT]
> **Data Source**: Should we use real-world map data (via OSMnx/OpenStreetMap) or a custom synthetic grid/graph for the demonstration? Real-world data is more impressive but requires an internet connection for fetching.
> **Visualization**: We will use Leaflet.js for map-based visualization. If you prefer a pure graph (nodes and edges without a map background), please let us know.

## Proposed Architecture

### 1. Backend (Logic & Algorithms)
- **Framework**: Python (**Flask**).
- **Core Library**: `NetworkX` for graph manipulation and pathfinding.
- **Data Source**: `OSMnx` to fetch real-world road networks.
- **Algorithms**:
    - **Dijkstra’s Algorithm**: Guaranteed shortest path based on edge weights.
    - **A* Search**: Heuristic-based search for faster convergence.
    - **Greedy Technique**: Simple heuristic search (often faster but not always optimal).
    - **Binary Search**: Used internally for efficient data lookups (e.g., finding the nearest node to a coordinate).

### 2. Frontend (Visualization & Interaction)
- **Framework**: React + Vite.
- **Styling**: Vanilla CSS with a focus on "Premium Aesthetics" (Dark mode, glassmorphism, glowing paths).
- **Map Library**: `Leaflet.js` with `React-Leaflet`.
- **Interactions**:
    - Select Start and End points by clicking on the map.
    - Toggle traffic conditions (randomly weight edges).
    - Switch between algorithms in real-time.
    - Animated path drawing to show how the algorithm "thinks".

---

## Proposed Changes

### [Component] Backend - Flask API

#### [NEW] `backend/app.py`
- Main Flask application file.
- Endpoints: `/api/graph`, `/api/route`, `/api/traffic-update`.

#### [NEW] `backend/engine.py`
- Core algorithm implementations (Dijkstra, A*, Greedy).
- Graph management logic using NetworkX.

### [Component] Frontend - React UI

#### [NEW] `src/App.jsx`
- Root component with state management for routes and settings.

#### [NEW] `src/components/MapContainer.jsx`
- Wrapper for React-Leaflet.
- Renders TileLayer, Markers, and Animated Polylines.

#### [NEW] `src/components/ControlPanel.jsx`
- Sidebar for user inputs, algorithm selection, and metrics display.

#### [MODIFY] `src/index.css`
- Global styles for the "Premium" look.

---

## Detailed Implementation Phases

### Phase 1: Foundation & Scaffolding
- **Step 1.1**: Initialize Vite React project and Flask backend directory.
- **Step 1.2**: Configure CORS in Flask to allow requests from the Vite dev server.
- **Step 1.3**: Install dependencies: `flask`, `flask-cors`, `networkx`, `osmnx`, `geopy` (Backend) and `leaflet`, `react-leaflet`, `lucide-react` (Frontend).

### Phase 2: Graph Data Acquisition & Processing
- **Step 2.1**: Implement OSMnx script to download and cache map data for a chosen city/area.
- **Step 2.2**: Convert the OSMnx graph into a NetworkX graph with pre-calculated weights (length).
- **Step 2.3**: Create a "Graph Discovery" endpoint to send node/edge data to the frontend.

### Phase 3: Pathfinding Engine Development
- **Step 3.1**: Implement Dijkstra’s algorithm (standard).
- **Step 3.2**: Implement A* algorithm with a Haversine distance heuristic.
- **Step 3.3**: Implement Greedy Best-First search.
- **Step 3.4**: Create a common API response format containing coordinates, distance, and time.

### Phase 4: Frontend Map & Interaction
- **Step 4.1**: Setup Leaflet with a Dark Mode tile provider (e.g., CartoDB Dark Matter).
- **Step 4.2**: Implement click-to-place markers for "Origin" and "Destination".
- **Step 4.3**: Connect frontend to Flask `/api/route` endpoint.

### Phase 5: Dynamic Traffic Simulation
- **Step 5.1**: Logic to "perturb" edge weights randomly to simulate congestion.
- **Step 5.2**: Add a "Traffic Density" slider in the frontend.
- **Step 5.3**: Implement auto-rerouting when the traffic slider is adjusted.

### Phase 6: Premium UI/UX & Animations
- **Step 6.1**: Create glowing "neon" paths using SVG filters or CSS shadow effects.
- **Step 6.2**: Add transition animations for the sidebar and metric panels.
- **Step 6.3**: Implement "Step-by-step" visualization mode (optional but highly appreciated).

### Phase 7: Analytics & Reporting
- **Step 7.1**: Build a comparative chart showing execution time and total distance for each algorithm.
- **Step 7.2**: Final bug fixes and performance optimization.
- **Step 7.3**: Prepare project documentation/report template.

---

## Verification Plan

### Automated Tests
- Python unit tests for each pathfinding algorithm.
- Integration tests for API endpoints.

### Manual Verification
1.  **Correctness**: Verify that Dijkstra finds the absolute shortest path compared to Greedy.
2.  **Traffic Impact**: Confirm that changing traffic conditions actually results in a different route.
3.  **Visual Stability**: Ensure markers don't "drift" when zooming or panning the map.

### Automated Tests
- Python unit tests for algorithm correctness.
- API endpoint testing using `pytest`.

### Manual Verification
1.  **Visual Check**: Verify that the map loads and displays the road network correctly.
2.  **Algorithm Selection**: Switch between Dijkstra and A* to see the difference in "nodes explored" (if visualized) and path found.
3.  **Dynamic Traffic**: Toggle traffic and observe if the path reroutes to avoid "congested" (higher weight) edges.
4.  **Responsive Design**: Ensure the sidebar and map layout work across different screen sizes.
