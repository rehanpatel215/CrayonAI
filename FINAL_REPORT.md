# Project Report: Smart Route Planner (AI Navigation System)

## 1. Objective
To develop an AI-powered navigation system that visually demonstrates optimal route selection using various pathfinding algorithms (Dijkstra, A*, Greedy) while accounting for dynamic environmental factors like traffic.

## 2. Technical Stack
- **Backend**: Python (Flask), NetworkX (Graph Logic), OSMnx (OpenStreetMap Data).
- **Frontend**: React, Leaflet.js (Map Visualization), Lucide-React (Icons).
- **Styling**: Premium Dark-Mode Design with Glassmorphism and CSS Animations.

## 3. Implemented Algorithms
- **Dijkstra’s Algorithm**: Guaranteed to find the shortest path by exploring nodes in order of their cumulative distance.
- **A* Search**: Optimized Dijkstra using a Haversine distance heuristic to guide the search towards the destination, significantly reducing the search space.
- **Greedy Best-First Search**: A heuristic search that prioritizes nodes solely based on their proximity to the goal. While faster, it may not always find the absolute shortest path.

## 4. Key Features
- **Real-time Map Interaction**: Users can click to set start and end points on a real-world map of Manhattan, NY.
- **Dynamic Traffic Simulation**: A density slider allows users to simulate road congestion, which dynamically updates edge weights and triggers real-time rerouting.
- **Search Visualization**: An animated "thinking" process shows the nodes being explored by each algorithm, highlighting their efficiency differences.
- **Comparative Analytics**: A dedicated analysis panel provides side-by-side metrics (Distance, Time, Nodes Explored) for all three algorithms.

## 5. Performance Analysis
| Algorithm | Optimization | Use Case |
|-----------|--------------|----------|
| Dijkstra  | Distance/Time| Guaranteed optimality in any graph. |
| A* Search | Efficiency   | Real-time navigation with known coordinates. |
| Greedy    | Speed        | Scenarios where a "good enough" path is needed instantly. |

## 6. Conclusion
The system successfully demonstrates the trade-offs between different AI search strategies. The integration of real-world data and dynamic traffic simulation provides a robust platform for understanding modern navigation systems.
