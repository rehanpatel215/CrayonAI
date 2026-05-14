# 🖍️ CrayonAI: Smart Route Planner & AI Search Space Visualizer

CrayonAI is a high-performance, visually immersive pathfinding application that uses real-world geospatial data to optimize travel routes across any city on Earth. It goes beyond simple navigation — it visualizes the *internal decision-making process* of five AI pathfinding algorithms in real time, with dynamic traffic simulation and a Gemini AI-powered analyst.

---

## 🚀 Features

### 🗺️ Real-World Navigation
- Fetches live road network data via **OSMnx** / OpenStreetMap (30km city radius)
- Intelligent **pickle-based caching** so cities load instantly after the first download
- **Geocoding support** — search any landmark or address globally with natural language

### 🤖 Five Pathfinding Algorithms
| Algorithm | Strategy | Explored Nodes | Optimality |
|---|---|---|---|
| **Dijkstra** | Uniform cost search | Broad | ✅ Optimal |
| **A\*** | Cost + Heuristic `f(n)=g(n)+h(n)` | Narrow beam | ✅ Optimal |
| **Greedy Best-First** | Heuristic only | Directed | ❌ Not guaranteed |
| **BFS** | Layer-by-layer expansion | Very broad | ✅ Unweighted |
| **DFS** | Deep-dive traversal | Unpredictable | ❌ Not guaranteed |

### 🎨 Search Space Visualization
A full-screen, SVG-based graph visualizer showing how each algorithm explored the road network:
- 🔵 **Primary Path** — optimal route found
- 🟡 **Alternative Path** — penalized secondary route via explored subgraph
- 🔴 **Discarded Search Space** — every node and edge the algorithm tried and rejected
- Rendered as a single consolidated `<path>` element for maximum DOM performance

### 🚦 Dynamic Traffic Simulation
- Per-edge traffic states: `green`, `orange`, `red`, `blocked`
- Automatic congestion **spread** with probability decay to adjacent edges
- Random **accident events** per simulation tick with event log
- Simulation loop auto-rerouts every 2 seconds using current traffic state
- All algorithms respect live `travel_time` weights during simulation

### 📊 Algorithm Comparison Dashboard
- Side-by-side metrics: distance, travel time, nodes explored, execution time (ms), memory estimate, efficiency %
- **Gemini 2.5 Flash AI analyst** provides written insight on algorithm performance and trade-offs
- Animated, interactive **Recharts** bar and area charts

### ⚡ Performance Optimizations (this session)
- `GraphVisualizer` rewritten from O(N×M) to **O(1) node lookups** using a `Map`
- Thousands of `<line>` SVG elements replaced with a **single consolidated `<path>`**
- `MapContainer` replaced individual `CircleMarker` components with a **custom Leaflet LayerGroup** bypassing React's render cycle entirely
- All path drawing and node exploration use **`requestAnimationFrame` batching** — no more `setTimeout` loops blocking the UI thread
- Simulation loop fixed with a `useRef` abort flag preventing **stale closure memory leaks**
- Added `animAbortRef` to cancel in-flight animations on clear/re-navigate
- Disabled expensive `::before/::after` pseudo-element animations on header tiles (12 composited layers removed)
- Removed unused `framer-motion` dependency (~35KB bundle savings)
- Cleaned up conflicting CSS `stroke-dasharray` animations fighting Leaflet's SVG renderer

### 🎯 Heuristic Precision (A\* & Greedy)
- A\* now uses a properly tight `h(n)` for both `length` and `travel_time` preferences
- `explored_edges` only populated when a node gets a **better g-score** (not on every neighbour peek), eliminating visual noise
- Greedy search now correctly accepts and applies `weight_attr` — respects "Fastest" goal consistently
- All three cost-based algorithms (Dijkstra, A\*, Greedy) unified to use the same edge weight logic

### 🖥️ Premium UI
- Floating glassmorphism header tiles with backdrop blur
- 1-second pause between exploration and path drawing so users can see both phases clearly
- Status messages guide users through each phase: `Exploring... → Search Complete → Drawing Path...`
- Animated typing cursor in AI analyst panel (pure CSS, no dependency)

---

## 🛠️ Tech Stack

### Backend
| Package | Role |
|---|---|
| **Python / Flask** | REST API layer |
| **OSMnx** | OpenStreetMap road network download & caching |
| **NetworkX** | Graph data structures and shortest path utilities |
| **Google Generative AI** | Gemini 2.5 Flash for AI route analysis |
| **python-dotenv** | Environment variable management |

### Frontend
| Package | Role |
|---|---|
| **React 19 / Vite** | Component-based UI with HMR |
| **Leaflet / React-Leaflet** | Interactive map rendering |
| **Recharts** | Algorithm comparison charts |
| **Lucide React** | Iconography |
| **Vanilla CSS** | Custom glassmorphic design system |

---

## 📦 Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/rehanpatel215/CrayonAI.git
cd CrayonAI
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```env
GEMINI_API_KEY=your_api_key_here
```

Start the server:
```bash
python app.py
```
> The backend pre-loads a **30km Manhattan road network** on startup (~10–30s on first run, instant from cache after).

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🖥️ Usage

1. **Set a Region** — Type a city name in the region tile and click load. The backend downloads a 30km road network around that city.
2. **Select Points** — Click the map to place your **Start** and **End** markers, or type location names into the input boxes.
3. **Choose Algorithm & Goal** — Select Dijkstra, A\*, Greedy, BFS, or DFS; then pick **Shortest** (distance) or **Fastest** (travel time with live traffic).
4. **Navigate** — Click **Go** to watch the algorithm explore the road network and draw the optimal path with a smooth animation.
5. **Visualize Search Space** — Click **"View Graph"** to open the full-screen SVG visualizer showing every decision the algorithm made.
6. **Compare All** — Open the **Dashboard** to run all 5 algorithms simultaneously and get an AI-generated performance analysis from Gemini.
7. **Simulate Traffic** — Toggle **Simulation** to watch the road network degrade in real-time with accidents, congestion spread, and automatic rerouting.

---

## 📂 Project Structure

```text
CrayonAI/
├── backend/
│   ├── app.py            # Flask API: /route, /compare, /geocode, /simulate_tick, etc.
│   ├── engine.py         # GraphEngine: OSMnx loading, all 5 algorithms, traffic simulation
│   ├── requirements.txt  # Python dependencies
│   └── .env              # GEMINI_API_KEY (not committed)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapContainer.jsx       # Leaflet map with optimized explored-nodes layer
│   │   │   ├── GraphVisualizer.jsx    # SVG search space visualizer (O(1) lookups)
│   │   │   ├── ComparisonDashboard.jsx # Algorithm comparison + Recharts
│   │   │   ├── AIAnalystPanel.jsx     # Gemini AI typewriter analysis panel
│   │   │   ├── Sidebar.jsx            # Traffic simulation controls & event log
│   │   │   ├── LocationInput.jsx      # Geocoding input with autocomplete
│   │   │   ├── CustomSelect.jsx       # Algorithm/goal dropdown
│   │   │   └── FloatingTile.jsx       # Glassmorphism tile wrapper
│   │   ├── services/
│   │   │   └── api.js                 # All backend API calls centralized here
│   │   ├── App.jsx                    # Main app state, rAF animation loops
│   │   ├── App.css                    # Glassmorphism design system
│   │   └── index.css                  # Global resets and theme variables
│   └── package.json
├── data/                  # Cached city graphs (.pkl) — gitignored
├── cache/                 # OSMnx tile cache — gitignored
├── .gitignore
└── README.md
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/load_city` | Download & cache a new city graph |
| `POST` | `/api/geocode` | Convert an address string to lat/lng |
| `POST` | `/api/route` | Run pathfinding and return routes + explored nodes |
| `POST` | `/api/compare` | Run all 5 algorithms and get Gemini AI analysis |
| `GET` | `/api/traffic_state` | Get all current edge traffic states |
| `POST` | `/api/simulate_tick` | Advance simulation one step (degrade/recover edges) |

---

## 📄 License

MIT License — free to use, modify, and distribute.
