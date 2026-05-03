import networkx as nx
import osmnx as ox
import os
import pickle
import time

class GraphEngine:
    def __init__(self):
        self.graph = None
        self.current_location = "Manhattan, New York, USA"
        self.data_dir = 'data'
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

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

        return self.graph

    def get_route(self, start_coords, end_coords, algorithm='dijkstra', preference='length'):
        """
        Find top 2 routes between two coordinates.
        """
        if self.graph is None:
            return None

        # Find nearest nodes
        start_node = ox.distance.nearest_nodes(self.graph, X=start_coords['lng'], Y=start_coords['lat'])
        end_node = ox.distance.nearest_nodes(self.graph, X=end_coords['lng'], Y=end_coords['lat'])

        weight = preference 

        start_time = time.time()
        
        try:
            # 1. Find the primary path
            if algorithm == 'dijkstra':
                primary_path, explored_nodes, explored_edges = self._dijkstra_with_exploration(start_node, end_node)
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

            # 2. Find an alternative path
            alternative_path = []
            d2 = 0
            try:
                # Penalize primary edges
                for i in range(len(primary_path) - 1):
                    u, v = primary_path[i], primary_path[i+1]
                    for key in self.graph[u][v]:
                        self.graph[u][v][key]['temp_weight'] = self.graph[u][v][key].get(weight, 1) * 2.5
                
                alternative_path = nx.shortest_path(self.graph, start_node, end_node, weight='temp_weight')
                
                # Calculate alternative distance manually
                for i in range(len(alternative_path) - 1):
                    u, v = alternative_path[i], alternative_path[i+1]
                    d2 += self.graph.get_edge_data(u, v)[0].get('length', 0)
                
                # Clean up temp weights
                for i in range(len(primary_path) - 1):
                    u, v = primary_path[i], primary_path[i+1]
                    for key in self.graph[u][v]:
                        if 'temp_weight' in self.graph[u][v][key]:
                            del self.graph[u][v][key]['temp_weight']
            except:
                alternative_path = []

            exec_time = time.time() - start_time

            paths = [
                {
                    "coords": [{"lat": self.graph.nodes[n]['y'], "lng": self.graph.nodes[n]['x']} for n in primary_path],
                    "distance": round(d1 / 1000, 2),
                    "time": round(t1 / 60, 1)
                }
            ]
            
            if alternative_path and alternative_path != primary_path:
                paths.append({
                    "coords": [{"lat": self.graph.nodes[n]['y'], "lng": self.graph.nodes[n]['x']} for n in alternative_path],
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
                "graph_data": {
                    "nodes": list(vis_nodes.values()),
                    "links": vis_links
                }
            }
        except Exception as e:
            print(f"Pathfinding error: {e}")
            return None

    def _dijkstra_with_exploration(self, start, end):
        import heapq
        distances = {start: 0}
        pq = [(0, start, [start])]
        explored_nodes = []
        explored_edges = []
        visited = set()
        
        while pq:
            (dist, current, path) = heapq.heappop(pq)
            if current in visited: continue
            visited.add(current)
            explored_nodes.append(current)
            
            if current == end:
                return path, explored_nodes, explored_edges
            
            for neighbor in self.graph.neighbors(current):
                if neighbor in visited: continue
                explored_edges.append({"from": current, "to": neighbor})
                weight = self.graph.get_edge_data(current, neighbor)[0].get('length', 1)
                new_dist = dist + weight
                if new_dist < distances.get(neighbor, float('inf')):
                    distances[neighbor] = new_dist
                    heapq.heappush(pq, (new_dist, neighbor, path + [neighbor]))
        return [], explored_nodes, explored_edges

    def _astar_with_exploration(self, start, end, weight_attr):
        import heapq
        g_score = {start: 0}
        f_score = {start: self._dist_heuristic(start, end)}
        pq = [(f_score[start], start, [start])]
        explored_nodes = []
        explored_edges = []
        visited = set()
        
        while pq:
            (current_f, current, path) = heapq.heappop(pq)
            if current in visited: continue
            visited.add(current)
            explored_nodes.append(current)
            
            if current == end:
                return path, explored_nodes, explored_edges
            
            for neighbor in self.graph.neighbors(current):
                if neighbor in visited: continue
                explored_edges.append({"from": current, "to": neighbor})
                edge_weight = self.graph.get_edge_data(current, neighbor)[0].get(weight_attr, 1)
                tentative_g_score = g_score[current] + edge_weight
                if tentative_g_score < g_score.get(neighbor, float('inf')):
                    g_score[neighbor] = tentative_g_score
                    h_score = self._dist_heuristic(neighbor, end)
                    f_score[neighbor] = tentative_g_score + h_score
                    heapq.heappush(pq, (f_score[neighbor], neighbor, path + [neighbor]))
        return [], explored_nodes, explored_edges

    def _greedy_with_exploration(self, start, end):
        import heapq
        pq = [(self._dist_heuristic(start, end), start, [start])]
        explored_nodes = []
        explored_edges = []
        visited = set()
        while pq:
            (_, current, path) = heapq.heappop(pq)
            if current in visited: continue
            visited.add(current)
            explored_nodes.append(current)
            if current == end:
                return path, explored_nodes, explored_edges
            for neighbor in self.graph.neighbors(current):
                if neighbor not in visited:
                    explored_edges.append({"from": current, "to": neighbor})
                    heapq.heappush(pq, (self._dist_heuristic(neighbor, end), neighbor, path + [neighbor]))
        return [], explored_nodes, explored_edges

    def _dist_heuristic(self, u, v):
        """
        Heuristic function for A* (Great Circle distance in METERS).
        Previously, this was in degrees, which made A* behave like Dijkstra.
        """
        u_data = self.graph.nodes[u]
        v_data = self.graph.nodes[v]
        
        # Dynamic adjustment for latitude to stay accurate globally
        avg_lat = (u_data['y'] + v_data['y']) / 2
        import math
        cos_lat = math.cos(math.radians(avg_lat))
        
        dy = (u_data['y'] - v_data['y']) * 111000
        dx = (u_data['x'] - v_data['x']) * 111000 * cos_lat
        
        return math.sqrt(dx**2 + dy**2)

    def update_traffic(self, congestion_level):
        """
        Modify travel_time weights dynamically to simulate traffic.
        """
        if self.graph is None:
            return
            
        import random
        
        for u, v, k, data in self.graph.edges(data=True, keys=True):
            speed = data.get('speed_kph', 40)
            base_time = (data.get('length', 0) / (speed / 3.6))
            traffic_factor = 1.0 + (random.random() * congestion_level * 5.0)
            data['travel_time'] = base_time * traffic_factor

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
