import React, { useMemo } from 'react';
import { X, BarChart3, Activity, PieChart as PieIcon, Layers, Clock, Ruler } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import AIAnalystPanel from './AIAnalystPanel';
import './ComparisonDashboard.css';

const ComparisonDashboard = ({ data, onClose }) => {
  if (!data) return null;

  const { stats, ai_analysis } = data;

  // Transform stats for Recharts
  const chartData = useMemo(() => {
    return Object.keys(stats).map(key => ({
      name: key.toUpperCase(),
      exec_time: stats[key].exec_time,
      nodes: stats[key].nodes_explored,
      distance: stats[key].distance,
      efficiency: stats[key].efficiency,
      memory: stats[key].memory_est / 1024 // in KB
    }));
  }, [stats]);

  // Pie chart data for search space
  const pieData = useMemo(() => {
    return Object.keys(stats).map(key => ({
      name: key.toUpperCase(),
      value: stats[key].nodes_explored
    }));
  }, [stats]);

  const COLORS = ['#58a6ff', '#2eb82e', '#ff9933', '#ff3333', '#ab7df8'];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BarChart3 color="#58a6ff" size={28} />
          <h1>Algorithm Performance Analytics</h1>
        </div>
        <button className="close-btn" onClick={onClose}><X size={32} /></button>
      </header>

      <main className="dashboard-content">
        <div className="ai-section">
          <AIAnalystPanel text={ai_analysis} />
        </div>

        <div className="metrics-grid">
          <div className="metric-card glass">
            <h3><Clock size={18} /> Execution Time (ms)</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="#8b949e" fontSize={12} />
                  <YAxis stroke="#8b949e" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#58a6ff' }}
                  />
                  <Bar dataKey="exec_time" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="metric-card glass">
            <h3><Layers size={18} /> Search Space (Nodes Explored)</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="metric-card glass">
            <h3><Activity size={18} /> Efficiency Radar</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="name" stroke="#8b949e" fontSize={10} />
                  <PolarRadiusAxis stroke="rgba(255,255,255,0.1)" fontSize={10} />
                  <Radar name="Efficiency %" dataKey="efficiency" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.3} />
                  <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stats-table-wrapper glass">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Distance (km)</th>
                <th>Travel Time (min)</th>
                <th>Exec Time (ms)</th>
                <th>Nodes Explored</th>
                <th>Memory Est (KB)</th>
                <th>Efficiency Score</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(stats).map(key => (
                <tr key={key}>
                  <td><strong>{key.toUpperCase()}</strong></td>
                  <td>{stats[key].distance} km</td>
                  <td>{stats[key].time} min</td>
                  <td>{stats[key].exec_time} ms</td>
                  <td>{stats[key].nodes_explored}</td>
                  <td>{(stats[key].memory_est / 1024).toFixed(1)} KB</td>
                  <td>
                    <span style={{ color: stats[key].efficiency > 90 ? '#2eb82e' : '#ff9933' }}>
                      {stats[key].efficiency}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default ComparisonDashboard;
