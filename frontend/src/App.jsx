import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, MessageSquare, Users, FileText, Image as ImageIcon, Link, Calendar, BarChart3, Clock, Flame, Activity, Brain, Timer, Moon, Sun, Ruler, Zap, Download } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import './index.css';
import Shuffle from './Shuffle';
import SoftAurora from './SoftAurora';
import { TypeAnimation } from 'react-type-animation';
import BorderGlow from './BorderGlow';
import ChatPanel from './ChatPanel';
import analyzerLogo from './assets/analyzer_logo.png';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const COLORS = ['#3b82f6', '#0ea5e9', '#10b981', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#facc15'];

export default function App() {
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('Overall');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // PDF Export Handler
  const handleExportPDF = async () => {
    if (!session || exportingPDF) return;
    setExportingPDF(true);
    try {
      const res = await axios.get(`${API_BASE}/export-pdf/${session}`, {
        params: { selected_user: selectedUser },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `WhatsApp_Analysis_${selectedUser.replace(/ /g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate PDF. Please try again.');
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      setSession(res.data.session_id);
      setUsers(res.data.users);
      setSelectedUser('Overall');
    } catch (err) {
      alert("Error parsing file. Please ensure it's a valid WhatsApp .txt file.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/analysis/${session}`, {
          params: { selected_user: selectedUser }
        });
        setData(res.data);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [session, selectedUser]);

  return (
    <div className="app-layout">
      {/* Dynamic Aurora Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, pointerEvents: 'none', opacity: 0.8 }}>
        <SoftAurora
          speed={0.6}
          scale={1.5}
          brightness={1}
          color1="#f7f7f7"
          color2="#53f38b"
          noiseFrequency={2.5}
          noiseAmplitude={1}
          bandHeight={0.5}
          bandSpread={1}
          octaveDecay={0.1}
          layerOffset={0}
          colorSpeed={1}
          enableMouseInteraction={true}
          mouseInfluence={0.25}
        />
      </div>

      {/* Sidebar Overlay */}
      <aside className="sidebar">
        <div className="brand">
          <img src={analyzerLogo} alt="Nurexa Chat Analyzer" className="brand-logo" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <label className="dropdown-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Upload Chat File (.txt)</label>
            <label className="btn-primary">
              <UploadCloud size={20} />
              <span>{session ? 'Analyze New File' : 'Upload File'}</span>
              <input type="file" accept=".txt" hidden onChange={handleFileUpload} />
            </label>
            <p className="subtitle" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>Ensure file is exported without media.</p>
          </div>

          <AnimatePresence>
            {session && users.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="dropdown-container">
                <label className="dropdown-label">Choose User for Analysis</label>
                <select
                  className="dropdown"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  {users.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PDF Export Button */}
          <AnimatePresence>
            {session && data && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '1.5rem' }}>
                <button
                  className="btn-export"
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                >
                  <Download size={18} />
                  {exportingPDF ? 'Generating PDF...' : 'Export as PDF'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <main className="main-content">

        {loading && !data && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <UploadCloud size={64} color="var(--primary)" />
            </motion.div>
            <h2 className="section-title" style={{ marginTop: '1.5rem' }}>Decoding Messages...</h2>
          </div>
        )}

        {!session && !loading && (
          <div className="hero-container">
            <h1 className="hero-title-main">WhatsApp Explorer,</h1>
            <h2 className="hero-title-creative">Uncovering the Data.</h2>
            <div className="hero-typewriter">
              <TypeAnimation
                sequence={[
                  'Visualizing conversation patterns.',
                  2000,
                  'Extracting linguistic metrics.',
                  2000,
                  'Generating dynamic heatmaps.',
                  2000,
                  'Uncovering hidden insights.',
                  2000
                ]}
                wrapper="span"
                speed={50}
                repeat={Infinity}
              />
            </div>

            <div className="hero-buttons">
              <label className="btn-primary" style={{ cursor: 'pointer', margin: 0, paddingLeft: '2.5rem', paddingRight: '2.5rem' }}>
                <UploadCloud size={20} />
                <span>Initialize Chat Log</span>
                <input type="file" accept=".txt" hidden onChange={handleFileUpload} />
              </label>
            </div>

          </div>
        )}

        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            <Shuffle
              text="Chat Analysis Dashboard"
              className="dashboard-title"
              tag="h1"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              respectReducedMotion={true}
              loop={false}
              loopDelay={0}
            />

            {/* 1. TOP STATISTICS */}
            <div className="grid-metrics">
              <MetricCard icon={<MessageSquare />} label="Total Messages" value={data.top_stats.total_messages} color="#3b82f6" />
              <MetricCard icon={<FileText />} label="Total Words" value={data.top_stats.total_words} color="#10b981" />
              <MetricCard icon={<ImageIcon />} label="Media Shared" value={data.top_stats.media_shared} color="#f43f5e" />
              <MetricCard icon={<Link />} label="Links Shared" value={data.top_stats.links_shared} color="#facc15" />
              <MetricCard icon={<Calendar />} label="Active Days" value={data.top_stats.active_days} color="#8b5cf6" />
            </div>

            {/* 2. MESSAGE TIMELINES (MONTHLY & DAILY) */}
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={28} color="var(--primary)" /> Message Timeline
            </h2>

            {/* Monthly Timeline */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="title">Monthly Timeline</h3>
                <Clock size={20} color="var(--text-muted)" />
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline.monthly}>
                    <defs>
                      <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--primary-border)" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                    <Area type="monotone" dataKey="message" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMonthly)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Timeline */}
            <div className="card" style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="title">Daily Timeline</h3>
                <BarChart3 size={20} color="var(--text-muted)" />
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeline.daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--primary-border)" />
                    <XAxis dataKey="only_date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                    <Line type="bundle" dataKey="message" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3 & 4. OVERALL CONDITIONAL ANALYTICS (MOST ACTIVE USER & WHO MESSAGES FIRST) */}
            {selectedUser === 'Overall' && data.most_active_users && (
              <>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={28} color="var(--accent)" /> Most Active Users
                </h2>
                <div className="grid-charts" style={{ marginBottom: '2.5rem' }}>
                  {/* Busiest User Bar Chart */}
                  <div className="card">
                    <h3 className="title">Message Breakdown</h3>
                    <div style={{ height: 350, marginTop: '1.5rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.most_active_users.bar} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="user" type="category" width={110} tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'var(--bg-main)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                            <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }} />
                            {data.most_active_users.bar.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Busiest User Pie Chart */}
                  <div className="card">
                    <h3 className="title">Activity Percentage</h3>
                    <div style={{ height: 350 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.most_active_users.pie}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={3}
                            dataKey="percent"
                            nameKey="user"
                            label={({ name, percent }) => `${name} (${percent}%)`}
                          >
                            {data.most_active_users.pie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(value) => `${value}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Who Messages First */}
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MessageSquare size={28} color="#ec4899" /> Conversation Initialization
                </h2>
                <div className="card" style={{ marginBottom: '2.5rem' }}>
                  <h3 className="title">Who Messages First</h3>
                  <div style={{ height: 320, marginTop: '1.5rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.first_message}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--primary-border)" />
                        <XAxis dataKey="user" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: 'var(--bg-main)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                        <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={80}>
                          <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                          {data.first_message.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* 5. USER ACTIVITY (Weekly and Monthly Bar Charts) */}
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={28} color="var(--primary)" /> User Activity
            </h2>
            <div className="grid-charts" style={{ marginBottom: '2.5rem' }}>

              <div className="card">
                <h3 className="title" style={{ marginBottom: '1.5rem' }}>Weekly Activity</h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.activity.weekly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--primary-border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={40} />
                      <Tooltip cursor={{ fill: 'var(--bg-main)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3 className="title" style={{ marginBottom: '1.5rem' }}>Monthly Activity</h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.activity.monthly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--primary-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={40} />
                      <Tooltip cursor={{ fill: 'var(--bg-main)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 6. WEEKLY ACTIVITY HEATMAP (Full Width with Legend) */}
            <div className="card" style={{ marginBottom: '2.5rem' }}>
              <h3 className="title" style={{ marginBottom: '2rem' }}>Weekly Activity Heatmap</h3>

              {/* Time X-Axis header */}
              <div style={{ display: 'flex', marginLeft: '90px', marginBottom: '0.5rem' }}>
                {data.activity.heatmap.periods.map((period, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', transform: 'rotate(-45deg)' }}>
                    {period}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '2rem' }}>
                {/* Heatmap Grid */}
                <div className="heatmap-wrapper" style={{ flex: 1 }}>
                  {data.activity.heatmap.days.map((day, rowIndex) => (
                    <div key={day} className="heatmap-row" style={{ marginTop: '2px' }}>
                      <div style={{ width: '90px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                        {day}
                      </div>
                      {data.activity.heatmap.data[rowIndex].map((val, cellIndex) => {
                        const maxVal = Math.max(...data.activity.heatmap.data.flat(), 1);
                        const opacity = Math.max(0.05, val / maxVal);
                        const intensityColor = `rgba(16, 185, 129, ${opacity})`; // Match green from reference
                        return (
                          <div
                            key={`${day}-${cellIndex}`}
                            className="heatmap-cell"
                            style={{ backgroundColor: val > 0 ? intensityColor : 'var(--bg-main)' }}
                            title={`${data.activity.heatmap.periods[cellIndex]}: ${val} msgs`}
                          >
                            <span style={{ opacity: 0 }}>{val}</span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

                {/* Heatmap Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '50px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>Color</span>
                  <div style={{
                    flex: 1,
                    width: '16px',
                    background: 'linear-gradient(to top, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 1))',
                    borderRadius: '4px'
                  }}></div>
                  <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>High</span>
                </div>
              </div>
            </div>

            {/* 7. WORD CLOUD (Large) */}
            <div className="card" style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="title">Word Cloud Visualization</h3>
                <Flame size={20} color="var(--accent)" />
              </div>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                <img
                  src={`${API_BASE}/wordcloud/${session}?selected_user=${encodeURIComponent(selectedUser)}`}
                  alt="Word Cloud"
                  style={{ width: '100%', minHeight: '400px', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }}
                  loading="lazy"
                />
              </div>
            </div>

            {/* 8. MOST COMMON WORD & EMOJI ANALYSIS (Side by Side) */}
            <div className="grid-charts">
              {/* Most Common Words */}
              <div className="card">
                <h3 className="title">Most Common Words</h3>
                <div style={{ height: 500, marginTop: '1.5rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.most_common_words} layout="vertical" margin={{ left: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="word" type="category" width={80} tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false}
                        tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '..' : value}
                      />
                      <Tooltip cursor={{ fill: 'var(--bg-main)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Emoji Analysis */}
              <div className="card">
                <h3 className="title">Emoji Distribution</h3>
                <div style={{ height: 500, marginTop: '1.5rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.emojis}
                        cx="50%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="emoji"
                        labelLine={true}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.emojis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                9. SENTIMENT ANALYSIS
            ═══════════════════════════════════════════════════════ */}
            {data.sentiment && data.sentiment.breakdown.length > 0 && (
              <>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Brain size={28} color="#8b5cf6" /> Sentiment Analysis
                </h2>

                {/* Score + Tags Row */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <div className="sentiment-summary-row">
                    <div className="sentiment-score-card">
                      <div className="sentiment-score-value">
                        {data.sentiment.overall_score > 0 ? '+' : ''}{data.sentiment.overall_score}
                      </div>
                      <div className="sentiment-score-label">Overall Score</div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {data.sentiment.primary_sentiment}
                      </div>
                    </div>
                    <div className="sentiment-tags">
                      {data.sentiment.breakdown.map((s, i) => (
                        <motion.div
                          key={s.sentiment}
                          className="sentiment-pill"
                          data-sentiment={s.sentiment}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          {s.sentiment}
                          <span className="pill-percent">{s.percent}%</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sentiment Breakdown Donut */}
                <div className="grid-charts" style={{ marginBottom: '1.5rem' }}>
                  <div className="card">
                    <h3 className="title">Sentiment Distribution</h3>
                    <div style={{ height: 380, marginTop: '1rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.sentiment.breakdown.slice(0, 8)}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={130}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="sentiment"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {data.sentiment.breakdown.slice(0, 8).map((entry, index) => (
                              <Cell key={`sent-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Monthly Sentiment Trend */}
                  <div className="card">
                    <h3 className="title">Sentiment Trend Over Time</h3>
                    <div style={{ height: 380, marginTop: '1rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.sentiment.monthly_trend}>
                          <defs>
                            <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorNeu" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#64748b" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--primary-border)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                          <Legend />
                          <Area type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPos)" name="Positive" />
                          <Area type="monotone" dataKey="negative" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorNeg)" name="Negative" />
                          <Area type="monotone" dataKey="neutral" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorNeu)" name="Neutral" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════
                10. RESPONSE TIME ANALYSIS
            ═══════════════════════════════════════════════════════ */}
            {data.response_time && data.response_time.per_user.length > 0 && (
              <>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Timer size={28} color="#0ea5e9" /> Response Time Analysis
                </h2>
                <div className="card" style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 className="title">Average Response Time per User</h3>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>⚡ Fastest: <strong style={{ color: '#10b981' }}>{data.response_time.fastest_user}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>🐢 Slowest: <strong style={{ color: '#f43f5e' }}>{data.response_time.slowest_user}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>📊 Avg: <strong>{data.response_time.overall_avg_minutes} min</strong></span>
                    </div>
                  </div>
                  <div style={{ height: Math.max(250, data.response_time.per_user.length * 50) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.response_time.per_user} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit=" min" />
                        <YAxis dataKey="user" type="category" width={120} tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'var(--bg-main)' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                          formatter={(value) => [`${value} min`, 'Avg Response Time']}
                        />
                        <Bar dataKey="avg_minutes" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="avg_minutes" position="right" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }} formatter={(v) => `${v} min`} />
                          {data.response_time.per_user.map((entry, index) => (
                            <Cell key={`rt-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════
                11. NIGHT OWL vs EARLY BIRD
            ═══════════════════════════════════════════════════════ */}
            {data.night_owl_early_bird && data.night_owl_early_bird.per_user.length > 0 && (
              <>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Moon size={28} color="#6366f1" /> Night Owl vs Early Bird
                </h2>
                <div className="card" style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 className="title">Messaging Time Distribution</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {Object.entries(data.night_owl_early_bird.classification).map(([user, type]) => (
                        <span
                          key={user}
                          className={`user-badge ${type.includes('Night') ? 'night-owl' : 'early-bird'}`}
                        >
                          {type} {user}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: Math.max(300, data.night_owl_early_bird.per_user.length * 55) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.night_owl_early_bird.per_user} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="user" type="category" width={120} tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'var(--bg-main)' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                        />
                        <Legend />
                        <Bar dataKey="Morning" stackId="time" fill="#fbbf24" name="🌅 Morning (6-12)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Afternoon" stackId="time" fill="#f97316" name="☀️ Afternoon (12-18)" />
                        <Bar dataKey="Evening" stackId="time" fill="#8b5cf6" name="🌆 Evening (18-22)" />
                        <Bar dataKey="Night" stackId="time" fill="#312e81" name="🌙 Night (22-6)" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════
                12. AVERAGE MESSAGE LENGTH
            ═══════════════════════════════════════════════════════ */}
            {data.avg_message_length && data.avg_message_length.length > 0 && (
              <>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Ruler size={28} color="#10b981" /> Average Message Length
                </h2>
                <div className="card" style={{ marginBottom: '2.5rem' }}>
                  <h3 className="title">Words per Message by User</h3>
                  <div style={{ height: Math.max(250, data.avg_message_length.length * 50), marginTop: '1.5rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.avg_message_length} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit=" words" />
                        <YAxis dataKey="user" type="category" width={120} tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'var(--bg-main)' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                          formatter={(value) => [`${value} words`, 'Avg Length']}
                        />
                        <Bar dataKey="avg_words" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="avg_words" position="right" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }} formatter={(v) => `${v} words`} />
                          {data.avg_message_length.map((entry, index) => (
                            <Cell key={`aml-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════
                13. ACTIVITY STREAK
            ═══════════════════════════════════════════════════════ */}
            {data.activity_streak && (
              <>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={28} color="#f43f5e" /> Activity Streak
                </h2>
                <div className="card" style={{ marginBottom: '2.5rem' }}>
                  <div className="streak-cards">
                    <motion.div
                      className="streak-card fire"
                      whileHover={{ scale: 1.03 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="streak-value" style={{ color: '#f43f5e' }}>🔥 {data.activity_streak.longest_streak}</div>
                      <div className="streak-label">Longest Streak (Days)</div>
                    </motion.div>
                    <motion.div
                      className="streak-card"
                      whileHover={{ scale: 1.03 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      style={{ background: 'linear-gradient(135deg, #eff6ff20, #3b82f620)' }}
                    >
                      <div className="streak-value" style={{ color: '#3b82f6' }}>📅 {data.activity_streak.current_streak}</div>
                      <div className="streak-label">Current Streak (Days)</div>
                    </motion.div>
                    <motion.div
                      className="streak-card"
                      whileHover={{ scale: 1.03 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      style={{ background: 'linear-gradient(135deg, #ecfdf520, #10b98120)' }}
                    >
                      <div className="streak-value" style={{ color: '#10b981' }}>✅ {data.activity_streak.total_active_days}</div>
                      <div className="streak-label">Total Active Days</div>
                    </motion.div>
                  </div>
                </div>
              </>
            )}

          </motion.div>
        )}

        {/* AI Chatbot FAB + Panel */}
        {session && data && (
          <ChatPanel sessionId={session} selectedUser={selectedUser} />
        )}
      </main>
    </div>
  );
}

// Subcomponent for Metric Cards
function MetricCard({ icon, label, value, color }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ display: 'flex', flex: 1, height: '100%' }}
    >
      <BorderGlow
        edgeSensitivity={49}
        glowColor="40 80 80"
        backgroundColor="rgba(255, 255, 255, 0.65)"
        borderRadius={24}
        glowRadius={30}
        glowIntensity={1.5}
        coneSpread={25}
        animated={false}
        colors={[color, color, color]}
        className="metric-card-wrapper"
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '1.5rem 2rem',
            borderRadius: '24px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            cursor: 'default',
            zIndex: 1,
            height: '100%',
            width: '100%',
          }}
        >
          {/* Dynamic Animated Glow */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '140px',
              height: '140px',
              background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
              borderRadius: '50%',
              filter: 'blur(20px)',
              pointerEvents: 'none',
              zIndex: 0
            }} 
          />

          {/* Decorative side accent line */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            height: '60%',
            width: '4px',
            background: color,
            borderRadius: '0 4px 4px 0',
            opacity: 0.8
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <p style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                {label}
              </p>
              <p style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                fontFamily: 'Outfit, sans-serif',
                lineHeight: '1.1',
                color: 'var(--text-main)',
                margin: 0,
                letterSpacing: '-0.02em',
                background: `linear-gradient(135deg, var(--text-main) 0%, ${color} 150%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            </div>

            <div style={{
              width: 48, 
              height: 48, 
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
              border: `1px solid ${color}30`,
              display: 'flex',
              alignItems: 'center', 
              justifyContent: 'center', 
              color: color,
              boxShadow: `0 4px 12px ${color}15`,
            }}>
              {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
            </div>
          </div>
        </div>
      </BorderGlow>
    </motion.div>
  );
}
