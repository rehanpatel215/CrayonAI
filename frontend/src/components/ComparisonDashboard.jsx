import React, { useMemo } from 'react';
import { X, BarChart3, Activity, PieChart as PieIcon, Layers, Clock, Ruler, ArrowLeft } from 'lucide-react';
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

  const COLORS = ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#5f6368'];

  return (
    <div className="dashboard-container liquid-bg">
      <header className="dashboard-header glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="back-btn glass" onClick={onClose} title="Back to Map">
            <ArrowLeft size={20} />
          </button>
          <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 10px' }}></div>
          <BarChart3 color="var(--accent-blue)" size={28} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Performance Insights</h1>
        </div>
        <button className="close-btn" onClick={onClose} style={{ color: 'var(--text-dim)' }}><X size={28} /></button>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" vertical={false} />
                  <XAxis dataKey="name" stroke="#5f6368" fontSize={12} />
                  <YAxis stroke="#5f6368" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ background: 'white', border: '1px solid #dadce0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'var(--accent-blue)', fontWeight: 600 }}
                  />
                  <Bar dataKey="exec_time" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="metric-card glass">
            <h3><Layers size={18} /> Search Efficiency</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'white', border: '1px solid #dadce0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="metric-card glass">
            <h3><Activity size={18} /> Robustness Radar</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#e8eaed" />
                  <PolarAngleAxis dataKey="name" stroke="#5f6368" fontSize={10} />
                  <PolarRadiusAxis stroke="#e8eaed" fontSize={10} />
                  <Radar name="Efficiency %" dataKey="efficiency" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #dadce0', borderRadius: '12px' }} />
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
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(stats).map(key => (
                <tr key={key}>
                  <td><strong style={{ color: 'var(--accent-blue)' }}>{key.toUpperCase()}</strong></td>
                  <td>{stats[key].distance} km</td>
                  <td>{stats[key].time} min</td>
                  <td>{stats[key].exec_time} ms</td>
                  <td>{stats[key].nodes_explored}</td>
                  <td>{(stats[key].memory_est / 1024).toFixed(1)} KB</td>
                  <td>
                    <span style={{ 
                      color: stats[key].efficiency > 90 ? 'var(--accent-green)' : 'var(--accent-yellow)',
                      fontWeight: 700,
                      background: stats[key].efficiency > 90 ? 'rgba(52, 168, 83, 0.1)' : 'rgba(251, 188, 4, 0.1)',
                      padding: '4px 12px',
                      borderRadius: '50px'
                    }}>
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
