import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import './App.css';

function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return '0m';
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// --- Component 1: Day-Wise Chart ---
function DayWiseChart({ dailyData, onBarClick, selectedDate }) {
  const chartData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

    let totalMinutes = 0;
    if (dailyData[dateStr]) {
      totalMinutes = Math.round(
        Object.values(dailyData[dateStr]).reduce((sum, site) => sum + site.timeSpent, 0) / 60
      );
    }
    chartData.push({ 
      name: dayName, 
      minutes: totalMinutes, 
      fullDate: dateStr 
    });
  }

  return (
    <div className="card day-wise-chart">
      <h3>7-Day Activity Overview</h3>
      <div className="chart-container">
        {chartData.map((day, index) => {
          const height = (day.minutes / 300) * 100; // 300 minutes = 5 hours max
          const isActive = day.fullDate === selectedDate;
          
          return (
            <div key={index} className="chart-bar">
              <div 
                className={`chart-bar-fill ${isActive ? 'active' : ''}`}
                style={{ height: `${Math.max(height, 10)}%` }}
                onClick={() => onBarClick(day.fullDate)}
                title={`${day.minutes} minutes`}
              />
              <div className={`chart-bar-label ${isActive ? 'active' : ''}`}>
                {day.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Component 2: Violation Log ---
function ViolationLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = () => {
      chrome.storage.local.get('violationLogs', (result) => {
        setLogs(result.violationLogs || []);
      });
    };
    
    fetchLogs();
    // Refresh every 3 seconds to catch new violations
    const intervalId = setInterval(fetchLogs, 3000);
    return () => clearInterval(intervalId);
  }, []);

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="card violation-log">
      <h3>⚠️ Recent Violations ({logs.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
        {logs.map((log, index) => (
          <div key={index} className="log-item">
            <div className="log-info">
              <div className="log-domain">{log.domain}</div>
              <div className="log-details">
                {new Date(log.timestamp).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                {log.type}
              </div>
            </div>
            <span className="log-badge">Blocked</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Component 3: Timed Blocks Manager ---
function TimedBlocksManager() {
  const [timedBlocklist, setTimedBlocklist] = useState({});

  useEffect(() => {
    const fetchTimedBlocks = () => {
      chrome.storage.local.get('tempBlocklist', (result) => {
        setTimedBlocklist(result.tempBlocklist || {});
      });
    };
    fetchTimedBlocks();
    const interval = setInterval(fetchTimedBlocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelBlock = (domain) => {
    chrome.runtime.sendMessage({ action: 'cancelTimedBlock', domain: domain });
  };

  const activeBlocks = Object.entries(timedBlocklist).filter(
    ([, endTime]) => endTime > Date.now()
  );

  if (activeBlocks.length === 0) {
    return null;
  }

  return (
    <div className="card timed-blocks-manager">
      <h3>Active Timed Blocks</h3>
      <ul className="timed-blocks-list">
        {activeBlocks.map(([domain, endTime]) => {
          const timeLeft = Math.round((endTime - Date.now()) / 1000);
          return (
            <li key={domain} className="timed-block-item">
              <div className="timed-block-info">
                <div className="timed-block-domain">{domain}</div>
                <div className="timed-block-time">
                  Time left: {formatTime(timeLeft)}
                </div>
              </div>
              <button 
                onClick={() => handleCancelBlock(domain)} 
                className="cancel-btn"
              >
                Cancel
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --- Component 4: Blocklist Manager ---
function BlocklistManager() {
  const [permanentBlocklist, setPermanentBlocklist] = useState([]);
  const [newSite, setNewSite] = useState('');
  const [blockType, setBlockType] = useState('always');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    chrome.storage.local.get('permanentBlocklist', (result) => {
      if (result.permanentBlocklist) {
        setPermanentBlocklist(result.permanentBlocklist);
      }
    });
  }, []);

  const handleAddSite = () => {
    const siteToAdd = newSite.trim();
    if (!siteToAdd) return;

    if (blockType === 'always') {
      if (!permanentBlocklist.includes(siteToAdd)) {
        const updatedList = [...permanentBlocklist, siteToAdd];
        chrome.storage.local.set({ permanentBlocklist: updatedList }, () => {
          setPermanentBlocklist(updatedList);
          setNewSite('');
        });
      }
    } else {
      const durationMinutes = hours * 60 + minutes;
      if (durationMinutes <= 0) {
        alert('Please set a duration greater than 0.');
        return;
      }
      chrome.runtime.sendMessage(
        { action: 'blockSite', domain: siteToAdd, durationMinutes: durationMinutes },
        (response) => {
          if (response.success) {
            alert(`${siteToAdd} has been blocked for ${durationMinutes} minutes.`);
            setNewSite('');
          }
        }
      );
    }
  };

  const handleRemoveSite = (siteToRemove) => {
    const updatedList = permanentBlocklist.filter((site) => site !== siteToRemove);
    chrome.storage.local.set({ permanentBlocklist: updatedList }, () => {
      setPermanentBlocklist(updatedList);
    });
  };

  return (
    <div className="card blocklist-manager">
      <h3>Block a Site</h3>
      <div className="add-site-form">
        <input
          type="text"
          value={newSite}
          onChange={(e) => setNewSite(e.target.value)}
          placeholder="Enter domain (e.g., youtube.com)"
        />
      </div>
      <div className="block-type-selector">
        <label>
          <input
            type="radio"
            name="blockType"
            value="always"
            checked={blockType === 'always'}
            onChange={() => setBlockType('always')}
          />
          Block Always
        </label>
        <label>
          <input
            type="radio"
            name="blockType"
            value="timed"
            checked={blockType === 'timed'}
            onChange={() => setBlockType('timed')}
          />
          Set Timer
        </label>
      </div>
      {blockType === 'timed' && (
        <div className="timed-inputs">
          <input
            type="number"
            min="0"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            placeholder="Hours"
          />
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            placeholder="Minutes"
          />
        </div>
      )}
      <button className="add-site-button" onClick={handleAddSite}>
        Add to Blocklist
      </button>
      <hr className="divider" />
      <h4>Blocked Sites ({permanentBlocklist.length})</h4>
      <ul className="blocked-sites-list">
        {permanentBlocklist.map((site) => (
          <li key={site}>
            <span>{site}</span>
            <button onClick={() => handleRemoveSite(site)} className="remove-btn">
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Component 5: Full Report Dashboard ---
function FullReport() {
  const [allUsageData, setAllUsageData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const updateFullReport = () => {
      chrome.storage.local.get('usageData', (result) => {
        if (result.usageData) {
          setAllUsageData(result.usageData);
        }
      });
    };
    updateFullReport();
    const intervalId = setInterval(updateFullReport, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const dailyUsage = allUsageData[selectedDate] || {};
  const sortedData = Object.entries(dailyUsage).sort(([, a], [, b]) => b.timeSpent - a.timeSpent);

  // Calculate total stats
  const totalTime = Object.values(dailyUsage).reduce((sum, site) => sum + site.timeSpent, 0);
  const totalSites = Object.keys(dailyUsage).length;
  const totalVisits = Object.values(dailyUsage).reduce((sum, site) => sum + site.visitCount, 0);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-left">
            <div className="dashboard-header-icon">🎯</div>
            <div className="dashboard-header-text">
              <h1>Digital Focus Guard</h1>
              <p>Your productivity companion</p>
            </div>
          </div>
          <div className="dashboard-header-right">
            <button className="settings-button">⚙️ Settings</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Left Sidebar */}
        <div className="dashboard-sidebar">
          {/* Stats Card */}
          <div className="stats-card">
            <div className="stats-card-label">Total on {selectedDate}</div>
            <div className="stats-card-value">{formatTime(totalTime)}</div>
            <div className="mini-stats">
              <div className="mini-stat">
                <div className="mini-stat-value">{totalSites}</div>
                <div className="mini-stat-label">Total Sites</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-value">{totalVisits}</div>
                <div className="mini-stat-label">Total Visits</div>
              </div>
            </div>
          </div>

          {/* Sites List */}
          <div className="sites-visited-card">
            <h3>Sites Visited on {selectedDate}</h3>
            <ul className="scrollable-list">
              {sortedData.length > 0 ? (
                sortedData.map(([domain, data]) => (
                  <li key={domain} className="site-item-dashboard">
                    <div className="site-icon-dashboard">🌐</div>
                    <div className="site-info">
                      <div className="domain-name">{domain}</div>
                      <div className="site-stats">
                        {formatTime(data.timeSpent)} • {data.visitCount} visits
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <p className="no-data">No browsing data for this day.</p>
              )}
            </ul>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          <DayWiseChart 
            dailyData={allUsageData} 
            onBarClick={setSelectedDate}
            selectedDate={selectedDate}
          />

          <div className="two-column-grid">
            <TimedBlocksManager />
            <BlocklistManager />
          </div>

          <ViolationLog />
        </div>
      </div>
    </div>
  );
}

// --- Component 6: PIN Authentication Screen ---
function OptionsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.local.get('userPin', (result) => {
      if (result.userPin) {
        setHasPin(true);
      }
    });
  }, []);

  const handlePinSubmit = () => {
    setError('');
    if (pin.trim() === '') {
      setError('PIN cannot be empty.');
      return;
    }
    if (hasPin) {
      chrome.storage.local.get('userPin', (result) => {
        const hashedPin = CryptoJS.SHA256(pin).toString();
        if (result.userPin === hashedPin) {
          setIsAuthenticated(true);
        } else {
          setError('Incorrect PIN. Please try again.');
        }
      });
    } else {
      const hashedPin = CryptoJS.SHA256(pin).toString();
      chrome.storage.local.set({ userPin: hashedPin }, () => {
        setIsAuthenticated(true);
      });
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handlePinSubmit();
    }
  };

  if (isAuthenticated) {
    return <FullReport />;
  }

  return (
    <div className="pin-container">
      <div className="pin-card">
        <div className="pin-icon">🔐</div>
        <h2>{hasPin ? 'Welcome Back' : 'Set Your PIN'}</h2>
        <p>
          {hasPin 
            ? 'Enter your PIN to access your dashboard' 
            : 'Create a 4-digit PIN to protect your data'}
        </p>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pin-input"
          maxLength="4"
          placeholder="••••"
        />
        {error && <p className="pin-error">{error}</p>}
        <button onClick={handlePinSubmit} className="pin-button">
          {hasPin ? 'Unlock Dashboard' : 'Set PIN'}
        </button>
      </div>
    </div>
  );
}

export default OptionsPage;