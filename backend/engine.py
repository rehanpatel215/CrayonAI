import networkx as nx
import osmnx as ox
import os
import pickle
import time
import random

class GraphEngine:
    def __init__(self):
        self.graph = None
        self.current_location = "Manhattan, New York, USA"
        self.data_dir = 'data'
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
        self.edge_traffic = {} # Key: (u, v), Value: state
        self.traffic_events = [] # List of strings
        self.traffic_multipliers = {
            'green': 1.0,
            'orange': 2.5,
            'red': 6.0,
            'blocked': 9999.0
        }

    def geocode_address(self, address):
        """
        Convert a string address/place name into coordinates.
        Uses a more robust fallback strategy to avoid local bias.
        """
        # Attempt 1: Direct search (Global) - Usually more reliable for specific landmarks
        try:
            location = ox.geocoder.geocode(address)
            return {"lat": location[0], "lng": location[1]}
        except Exception as e:
            print(f"Global geocode failed for {address}, trying with region hint...")
            
            # Attempt 2: Search with Region Context
            try:
                search_query = f"{address}, {self.current_location}"
                location = ox.geocoder.geocode(search_query)
                return {"lat": location[0], "lng": location[1]}
            except:
                return None

    def load_graph(self, location="Manhattan, New York, USA", network_type='drive'):
        """
        Load a graph from OSMnx or from a local pickle cache.
        """
        self.current_location = location
        clean_name = location.replace(',', '').replace(' ', '_').lower()
        # Radius is fixed at 30km for now as per user request
        radius = 30000 
        cache_filename = f"{clean_name}_{network_type}_{radius}m.pkl"
        cache_path = os.path.join(self.data_dir, cache_filename)

        if os.path.exists(cache_path):
            print(f"Loading graph from cache: {cache_path}")
            with open(cache_path, 'rb') as f:
                self.graph = pickle.load(f)
        else:
            print(f"Fetching 30km area graph for: {location}")
            try:
                # Primary attempt: Address-based radius search (guarantees the 30km coverage)
                # We use 30,000 meters as requested.
                self.graph = ox.graph_from_address(location, dist=30000, network_type=network_type, simplify=True)
            except Exception as e:
                print(f"Radius search failed ({e}), falling back to place-based search...")
                # Secondary attempt: Place-based search (e.g. if it's a city name)
                self.graph = ox.graph_from_place(location, network_type=network_type, simplify=True)
            
            # Post-processing with error handling
            try:
                self.graph = ox.add_edge_speeds(self.graph)
                self.graph = ox.add_edge_travel_times(self.graph)
            except Exception as e:
                print(f"Warning: Could not add speeds/times ({e}). Using default values.")
            
            # Save to cache
            with open(cache_path, 'wb') as f:
                pickle.dump(self.graph, f)
            print(f"Graph saved to cache: {cache_path}")

        # Initial Traffic Seeding
        self._seed_traffic()
        return self.graph

    def _seed_traffic(self):
        """Seed ~20% of edges with random traffic (orange/green)."""
        if self.graph is None: return
        import random
        edges = list(self.graph.edges(keys=False))
        num_to_seed = int(len(edges) * 0.2)
        seeded_edges = random.sample(edges, num_to_seed)
        
        self.edge_traffic = {}
        for u, v in edges:
            self.edge_traffic[(u, v)] = 'green'
            
        for u, v in seeded_edges:
            self.edge_traffic[(u, v)] = random.choice(['green', 'orange'])
        
        self._refresh_travel_times()

    def _refresh_travel_times(self):
        """Update all edge travel_time attributes based on current traffic state."""
        for u, v, k, data in self.graph.edges(data=True, keys=True):
            state = self.edge_traffic.get((u, v), 'green')
            mult = self.traffic_multipliers.get(state, 1.0)
            speed = data.get('speed_kph', 40)
            base_time = (data.get('length', 0) / (speed / 3.6))
            data['travel_time'] = base_time * mult

    def get_route(self, start_coords, end_coords, algorithm='dijkstra', preference='length'):
        """
        Find top 2 routes between two coordinates.
        """
        if self.graph is None:
            return None

        # Find nearest nodes
        start_node = ox.distance.nearest_nodes(self.graph, X=start_coords['lng'], Y=start_coords['lat'])
        end_node = ox.distance.nearest_nodes(self.graph, X=end_coords['lng'], Y=end_coords['lat'])

        # Ensure weights are up-to-date with latest simulation state
        self._refresh_travel_times()

        # Map 'time' or 'travel_time' to the correct edge attribute
        weight = 'travel_time' if preference in ['time', 'travel_time'] else 'length'

        start_time = time.time()
        
        try:
            # 1. Find the primary path
            if algorithm == 'dijkstra':
                primary_path, explored_nodes, explored_edges = self._dijkstra_with_exploration(start_node, end_node, weight)
            elif algorithm == 'astar':
                primary_path, explored_nodes, explored_edges = self._astar_with_exploration(start_node, end_node, weight)
            elif algorithm == 'greedy':
                primary_path, explored_nodes, explored_edges = self._greedy_with_exploration(start_node, end_node)
            else:
                primary_path = nx.shortest_path(self.graph, start_node, end_node, weight=weight)
                explored_nodes, explored_edges = [], []

            # Calculate primary distance and time manually for maximum reliability
            d1 = 0
            t1 = 0
            for i in range(len(primary_path) - 1):
                u, v = primary_path[i], primary_path[i+1]
                edge_data = self.graph.get_edge_data(u, v)[0]
                d1 += edge_data.get('length', 0)
                t1 += edge_data.get('travel_time', edge_data.get('length', 0) / 11.11)

            # 2. Find an alternative path (RESTRICTED to explored subgraph)
            alternative_path = []
            d2 = 0
            if explored_nodes:
                try:
                    # Create a subgraph containing only the nodes explored by the algorithm
                    explored_subgraph = self.graph.subgraph(explored_nodes).copy()
                    
                    # Penalize primary edges within the subgraph
                    for i in range(len(primary_path) - 1):
                        u, v = primary_path[i], primary_path[i+1]
                        if explored_subgraph.has_edge(u, v):
                            for key in explored_subgraph[u][v]:
                                explored_subgraph[u][v][key]['temp_weight'] = explored_subgraph[u][v][key].get(weight, 1) * 2.5
                    
                    # Search for alternative ONLY in the explored space
                    alternative_path = nx.shortest_path(explored_subgraph, start_node, end_node, weight='temp_weight')
                    
                    # Calculate alternative distance manually
                    for i in range(len(alternative_path) - 1):
                        u, v = alternative_path[i], alternative_path[i+1]
                        d2 += self.graph.get_edge_data(u, v)[0].get('length', 0)
                except:
                    alternative_path = []
            else:
                # Fallback for when no exploration data is available
                alternative_path = []

            exec_time = time.time() - start_time

            paths = [
                {
                    "segments": self._group_path_segments(primary_path),
                    "distance": round(d1 / 1000, 2),
                    "time": round(t1 / 60, 1)
                }
            ]
            
            if alternative_path and alternative_path != primary_path:
                paths.append({
                    "segments": self._group_path_segments(alternative_path),
                    "distance": round(d2 / 1000, 2)
                })

            # Prepare data for the full-screen Graph Visualization
            # Format: { nodes: [], links: [] }
            # Color code: 1=Primary(Blue), 2=Alt(Yellow), 3=Discarded(Red)
            
            vis_nodes = {}
            for n in explored_nodes:
                type = 3 # Default: Discarded
                if n in primary_path: type = 1
                elif alternative_path and n in alternative_path: type = 2
                
                vis_nodes[n] = {
                    "id": n,
                    "label": "Node",
                    "type": type,
                    "lat": self.graph.nodes[n]['y'],
                    "lng": self.graph.nodes[n]['x']
                }
            
            vis_links = []
            for edge in explored_edges:
                u, v = edge['from'], edge['to']
                # Determine edge type
                e_type = 3
                # Check if this edge is part of primary path
                is_p = False
                for i in range(len(primary_path)-1):
                    if (u == primary_path[i] and v == primary_path[i+1]) or (v == primary_path[i] and u == primary_path[i+1]):
                        is_p = True; break
                if is_p: e_type = 1
                elif alternative_path:
                    is_a = False
                    for i in range(len(alternative_path)-1):
                        if (u == alternative_path[i] and v == alternative_path[i+1]) or (v == alternative_path[i] and u == alternative_path[i+1]):
                            is_a = True; break
                    if is_a: e_type = 2
                
                vis_links.append({"source": u, "target": v, "type": e_type})

            return {
                "paths": paths,
                "nodes_explored": len(explored_nodes),
                "explored": [{"lat": self.graph.nodes[n]['y'], "lng": self.graph.nodes[n]['x']} for n in explored_nodes],
                "algo_time": round(exec_time, 4),
                "start_node_coords": {"lat": self.graph.nodes[start_node]['y'], "lng": self.graph.nodes[start_node]['x']},
                "end_node_coords": {"lat": self.graph.nodes[end_node]['y'], "lng": self.graph.nodes[end_node]['x']},
                "graph_data": {
                    "nodes": list(vis_nodes.values()),
                    "links": vis_links
                }
            }
        except Exception as e:
            print(f"Pathfinding error: {e}")
            return None

    def compare_all_algorithms(self, start_coords, end_coords, preference='length'):
        """
        Runs all implemented algorithms and returns comparative statistics.
        """
        if self.graph is None: return None

        start_node = ox.distance.nearest_nodes(self.graph, X=start_coords['lng'], Y=start_coords['lat'])
        end_node = ox.distance.nearest_nodes(self.graph, X=end_coords['lng'], Y=end_coords['lat'])
        
        weight_attr = 'travel_time' if preference in ['time', 'travel_time'] else 'length'
        self._refresh_travel_times()

        algorithms = {
            'dijkstra': self._dijkstra_with_exploration,
            'astar': self._astar_with_exploration,
            'greedy': self._greedy_with_exploration,
            'bfs': self._bfs_with_exploration,
            'dfs': self._dfs_with_exploration
        }

        results = {}
        for name, func in algorithms.items():
            try:
                start_time = time.time()
                # Run the algorithm
                if name in ['dijkstra', 'astar']:
                    path, explored, edges = func(start_node, end_node, weight_attr)
                else:
                    path, explored, edges = func(start_node, end_node)
                
                exec_time = (time.time() - start_time) * 1000 # in ms
                
                if not path:
                    continue

                # Metrics calculation
                d = 0
                t = 0
                base_t = 0
                for i in range(len(path) - 1):
                    u, v = path[i], path[i+1]
                    data = self.graph.get_edge_data(u, v)[0]
                    l = data.get('length', 0)
                    d += l
                    t += data.get('travel_time', l / 11.11)
                    speed = data.get('speed_kph', 40)
                    base_t += l / (speed / 3.6)

                efficiency = (base_t / t * 100) if t > 0 else 100

                results[name] = {
                    "path": path,
                    "distance": round(d / 1000, 2),
                    "time": round(t / 60, 2),
                    "exec_time": round(exec_time, 2),
                    "nodes_explored": len(explored),
                    "memory_est": len(explored) * 128, # Estimate in bytes
                    "efficiency": round(efficiency, 1)
                }
            except Exception as e:
                print(f"Comparison error for {name}: {e}")
        
        return results

    def _bfs_with_exploration(self, start, end, max_explored=10000):
        from collections import deque
        queue = deque([start])
        visited = {start}
        predecessors = {start: None}
        explored_nodes = []
        explored_edges = []
        
        while queue:
            if len(explored_nodes) >= max_explored:
                break
            current = queue.popleft()
            explored_nodes.append(current)
            if current == end:
                # Reconstruct path
                path = []
                temp = end
                while temp is not None:
                    path.append(temp)
                    temp = predecessors[temp]
                return path[::-1], explored_nodes, explored_edges
            
            for neighbor in self.graph.neighbors(current):
                if neighbor not in visited:
                    visited.add(neighbor)
                    predecessors[neighbor] = current
                    explored_edges.append({"from": current, "to": neighbor})
                    queue.append(neighbor)
        return [], explored_nodes, explored_edges

    def _dfs_with_exploration(self, start, end, max_explored=10000):
        stack = [start]
        visited = {start}
        predecessors = {start: None}
        explored_nodes = []
        explored_edges = []
        
        while stack:
            if len(explored_nodes) >= max_explored:
                break
            current = stack.pop()
            if current in explored_nodes: continue
            explored_nodes.append(current)
            
            if current == end:
                # Reconstruct path
                path = []
                temp = end
                while temp is not None:
                    path.append(temp)
                    temp = predecessors[temp]
                return path[::-1], explored_nodes, explored_edges
            
            for neighbor in self.graph.neighbors(current):
                if neighbor not in visited:
                    visited.add(neighbor)
                    predecessors[neighbor] = current
                    explored_edges.append({"from": current, "to": neighbor})
                    stack.append(neighbor)
        return [], explored_nodes, explored_edges

    def _dijkstra_with_exploration(self, start, end, weight_attr):
        import heapq
        distances = {start: 0}
        predecessors = {start: None}
        pq = [(0, start)]
        explored_nodes = []
        explored_edges = []
        visited = set()
        
        while pq:
            (dist, current) = heapq.heappop(pq)
            if current in visited: continue
            visited.add(current)
            explored_nodes.append(current)
            
            if current == end:
                path = []
                temp = end
                while temp is not None:
                    path.append(temp)
                    temp = predecessors[temp]
                return path[::-1], explored_nodes, explored_edges
            
            for neighbor in self.graph.neighbors(current):
                if neighbor in visited: continue
                explored_edges.append({"from": current, "to": neighbor})
                # Safe weight lookup with fallback
                edge_data = self.graph.get_edge_data(current, neighbor)[0]
                weight = edge_data.get(weight_attr)
                if weight is None:
                    if weight_attr == 'travel_time':
                        speed = edge_data.get('speed_kph', 40)
                        weight = edge_data.get('length', 0) / (speed / 3.6)
                    else:
                        weight = edge_data.get('length', 1)
                
                new_dist = dist + weight
                if new_dist < distances.get(neighbor, float('inf')):
                    distances[neighbor] = new_dist
                    predecessors[neighbor] = current
                    heapq.heappush(pq, (new_dist, neighbor))
        return [], explored_nodes, explored_edges

    def _astar_with_exploration(self, start, end, weight_attr):
        import heapq
        g_score = {start: 0}
        predecessors = {start: None}
        f_score = {start: self._dist_heuristic(start, end, weight_attr)}
        pq = [(f_score[start], start)]
        explored_nodes = []
        explored_edges = []
        visited = set()
        
        while pq:
            (current_f, current) = heapq.heappop(pq)
            if current in visited: continue
            visited.add(current)
            explored_nodes.append(current)
            
            if current == end:
                path = []
                temp = end
                while temp is not None:
                    path.append(temp)
                    temp = predecessors[temp]
                return path[::-1], explored_nodes, explored_edges
            
            for neighbor in self.graph.neighbors(current):
                if neighbor in visited: continue
                explored_edges.append({"from": current, "to": neighbor})
                edge_data = self.graph.get_edge_data(current, neighbor)[0]
                edge_weight = edge_data.get(weight_attr)
                if edge_weight is None:
                    if weight_attr == 'travel_time':
                        speed = edge_data.get('speed_kph', 40)
                        edge_weight = edge_data.get('length', 0) / (speed / 3.6)
                    else:
                        edge_weight = edge_data.get('length', 1)

                tentative_g_score = g_score[current] + edge_weight
                if tentative_g_score < g_score.get(neighbor, float('inf')):
                    g_score[neighbor] = tentative_g_score
                    predecessors[neighbor] = current
                    h_score = self._dist_heuristic(neighbor, end, weight_attr)
                    f_score[neighbor] = tentative_g_score + h_score
                    heapq.heappush(pq, (f_score[neighbor], neighbor))
        return [], explored_nodes, explored_edges

    def _greedy_with_exploration(self, start, end):
        import heapq
        pq = [(self._dist_heuristic(start, end), start)]
        predecessors = {start: None}
        explored_nodes = []
        explored_edges = []
        visited = set()
        while pq:
            (_, current) = heapq.heappop(pq)
            if current in visited: continue
            visited.add(current)
            explored_nodes.append(current)
            if current == end:
                path = []
                temp = end
                while temp is not None:
                    path.append(temp)
                    temp = predecessors[temp]
                return path[::-1], explored_nodes, explored_edges
            for neighbor in self.graph.neighbors(current):
                if neighbor not in visited:
                    predecessors[neighbor] = current
                    explored_edges.append({"from": current, "to": neighbor})
                    heapq.heappush(pq, (self._dist_heuristic(neighbor, end), neighbor))
        return [], explored_nodes, explored_edges

    def _dist_heuristic(self, u, v, weight_attr='length'):
        """
        Heuristic function for A* (Great Circle distance).
        Returns meters for 'length', and estimated seconds for 'travel_time'.
        """
        u_data = self.graph.nodes[u]
        v_data = self.graph.nodes[v]
        
        # Dynamic adjustment for latitude to stay accurate globally
        avg_lat = (u_data['y'] + v_data['y']) / 2
        import math
        cos_lat = math.cos(math.radians(avg_lat))
        
        dy = (u_data['y'] - v_data['y']) * 111000
        dx = (u_data['x'] - v_data['x']) * 111000 * cos_lat
        
        dist_meters = math.sqrt(dx**2 + dy**2)
        
        if weight_attr == 'travel_time':
            # Use a high speed (e.g. 100km/h = 27.7 m/s) to ensure heuristic is admissible
            return dist_meters / 27.7
        
        return dist_meters

    def update_traffic(self, congestion_level):
        """
        Legacy method updated to work with new simulation state.
        Higher level = more random red/orange edges.
        """
        if self.graph is None: return
        import random
        edges = list(self.edge_traffic.keys())
        num_to_impact = int(len(edges) * congestion_level * 0.5)
        impacted = random.sample(edges, num_to_impact)
        for edge in impacted:
            self.edge_traffic[edge] = random.choice(['orange', 'red'])
        self._refresh_travel_times()

    def tick(self):
        """Advance the simulation by one step."""
        if self.graph is None: return
        import random
        
        edges = list(self.edge_traffic.keys())
        if not edges: return

        # 1. Randomly degrade/improve 5% of edges
        to_change = random.sample(edges, max(1, int(len(edges) * 0.05)))
        for edge in to_change:
            current = self.edge_traffic.get(edge, 'green')
            if current == 'green':
                if random.random() < 0.1: self.edge_traffic[edge] = 'orange'
            elif current == 'orange':
                if random.random() < 0.2: self.edge_traffic[edge] = 'red'
                elif random.random() < 0.2: self.edge_traffic[edge] = 'green'
            elif current == 'red':
                if random.random() < 0.3: self.edge_traffic[edge] = 'orange'
        
        # 2. Spread congestion
        self.spread_congestion()
        
        # 3. Random Accident (5% chance per tick)
        if random.random() < 0.05:
            edge = random.choice(edges)
            self.add_accident(edge)
            
        # 4. Refresh travel times
        self._refresh_travel_times()
        
        # 5. Cap events
        if len(self.traffic_events) > 20:
            self.traffic_events = self.traffic_events[-20:]

    def add_accident(self, edge):
        """Mark an edge as red/blocked and log it."""
        import random
        u, v = edge
        state = random.choice(['red', 'blocked'])
        self.edge_traffic[edge] = state
        msg = f"🚨 {state.capitalize()} at {u} -> {v}"
        self.traffic_events.append(msg)

    def spread_congestion(self):
        """Spill-over effect with probability decay."""
        import random
        new_states = {}
        for (u, v), state in self.edge_traffic.items():
            if state == 'red':
                # Neighbors of red have 30% chance to become orange
                for neighbor in self.graph.neighbors(v):
                    if (v, neighbor) in self.edge_traffic and self.edge_traffic[(v, neighbor)] == 'green':
                        if random.random() < 0.3:
                            new_states[(v, neighbor)] = 'orange'
            elif state == 'orange':
                # Neighbors of orange have 10% chance to become orange
                for neighbor in self.graph.neighbors(v):
                    if (v, neighbor) in self.edge_traffic and self.edge_traffic[(v, neighbor)] == 'green':
                        if random.random() < 0.1:
                            new_states[(v, neighbor)] = 'orange'
        
        self.edge_traffic.update(new_states)

    def _group_path_segments(self, path):
        """Group consecutive edges with the same traffic state into segments."""
        if not path: return []
        
        segments = []
        current_segment = {
            "coords": [{"lat": self.graph.nodes[path[0]]['y'], "lng": self.graph.nodes[path[0]]['x']}],
            "state": None
        }
        
        for i in range(len(path) - 1):
            u, v = path[i], path[i+1]
            state = self.edge_traffic.get((u, v), 'green')
            
            if current_segment["state"] is None:
                current_segment["state"] = state
                
            if state == current_segment["state"]:
                current_segment["coords"].append({"lat": self.graph.nodes[v]['y'], "lng": self.graph.nodes[v]['x']})
            else:
                segments.append(current_segment)
                current_segment = {
                    "coords": [
                        {"lat": self.graph.nodes[u]['y'], "lng": self.graph.nodes[u]['x']},
                        {"lat": self.graph.nodes[v]['y'], "lng": self.graph.nodes[v]['x']}
                    ],
                    "state": state
                }
        
        segments.append(current_segment)
        return segments

    def get_graph_json(self):
        """
        Convert nodes and edges to a JSON-serializable format for the frontend.
        """
        if self.graph is None:
            return {"nodes": [], "edges": []}
        
        nodes = []
        for node, data in self.graph.nodes(data=True):
            nodes.append({
                "id": node,
                "lat": data.get('y'),
                "lng": data.get('x')
            })
            
        edges = []
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "weight": data.get('length', 0)
            })
            
        return {"nodes": nodes, "edges": edges}
