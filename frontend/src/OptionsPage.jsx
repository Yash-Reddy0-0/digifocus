import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
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

function DayWiseChart({ dailyData, onBarClick }) {
  const chartData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

    let totalMinutes = 0;
    if (dailyData[dateStr]) {
      totalMinutes = Math.round(Object.values(dailyData[dateStr]).reduce((sum, site) => sum + site.timeSpent, 0) / 60);
    }
    chartData.push({ name: dayName, 'Time (minutes)': totalMinutes, fullDate: dateStr });
  }

  const formatYAxis = (tickItem) => `${Math.round(tickItem / 60)}h`;
  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      onBarClick(data.activePayload[0].payload.fullDate);
    }
  };

  return (
    <div className="card day-wise-chart">
      <h3>Last 7 Days Activity</h3>
      <ResponsiveContainer width="50%" height={300}>
        <BarChart data={chartData} onClick={handleBarClick}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={formatYAxis} domain={[0, 1440]} ticks={[0, 360, 720, 1080, 1440]} />
          <Tooltip formatter={(value) => `${value} minutes`} />
          <Bar dataKey="Time (minutes)" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

//violation log component
function ViolationLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    chrome.storage.local.get('violationLogs', (result) => {
      setLogs(result.violationLogs || []);
    });
  }, []);

  if (logs.length === 0) {
    return null; // Don't show the card if there are no logs
  }

  return (
    <div className="card violation-log">
      <h3>Violation Logs</h3>
      <ul className="scrollable-list">
        {logs.map((log, index) => (
          <li key={index} className="log-item">
            <span className="domain-name">{log.domain}</span>
            <span className="log-details">
              {/* Format the timestamp into a readable date and time */}
              {new Date(log.timestamp).toLocaleString()}
            </span>
            <span className="log-type">{log.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Component 1: Timed Blocks Manager ---
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

  const activeBlocks = Object.entries(timedBlocklist).filter(([, endTime]) => endTime > Date.now());

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
            <li key={domain}>
              <div className="site-info">
                <span className="domain-name">{domain}</span>
                <span className="site-stats">Time left: {formatTime(timeLeft)}</span>
              </div>
              <button onClick={() => handleCancelBlock(domain)} className="cancel-btn">
                Cancel
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --- Component 2: The Blocklist Manager ---
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
      const durationMinutes = (hours * 60) + minutes;
      if (durationMinutes <= 0) {
        alert("Please set a duration greater than 0.");
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
    const updatedList = permanentBlocklist.filter(site => site !== siteToRemove);
    chrome.storage.local.set({ permanentBlocklist: updatedList }, () => {
      setPermanentBlocklist(updatedList);
    });
  };

  return (
    <div className="card blocklist-manager">
      <h3>Block a Site</h3>
      <div className="add-site-form">
        <input type="text" value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="e.g., youtube.com" />
      </div>
      <div className="block-type-selector">
        <label><input type="radio" name="blockType" value="always" checked={blockType === 'always'} onChange={() => setBlockType('always')} /> Always</label>
        <label><input type="radio" name="blockType" value="timed" checked={blockType === 'timed'} onChange={() => setBlockType('timed')} /> Set Timer</label>
      </div>
      {blockType === 'timed' && (
        <div className="timed-inputs">
          <input type="number" min="0" value={hours} onChange={(e) => setHours(Number(e.target.value))} /> H
          <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /> M
        </div>
      )}
      <button className="add-site-button" onClick={handleAddSite}>Add to Blocklist</button>
      <hr className="divider" />
      <h4>Permanently Blocked Sites</h4>
      <ul className="blocked-sites-list">
        {permanentBlocklist.map(site => (
          <li key={site}>
            <span>{site}</span>
            <button onClick={() => handleRemoveSite(site)} className="remove-btn">&times;</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Component 3: The Main Report Dashboard ---
// function FullReport() {
//   const [fullUsage, setFullUsage] = useState([]);

//   useEffect(() => {
//     const updateFullReport = () => {
//       chrome.storage.local.get('usageData', (result) => {
//         if (result.usageData) {
//           const sortedData = Object.entries(result.usageData).sort(([, a], [, b]) => b.timeSpent - a.timeSpent);
//           setFullUsage(sortedData);
//         }
//       });
//     };
//     updateFullReport();
//     const intervalId = setInterval(updateFullReport, 3000);
//     return () => clearInterval(intervalId);
//   }, []);

//   return (
//     <div className="dashboard-container">
//       <div className="sites-visited-card">
//         <h3>Sites Visited Today</h3>
//         <ul className="scrollable-list">
//           {fullUsage.map(([domain, data]) => (
//             <li key={domain} className="site-item">
//               <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt={`${domain} favicon`} className="favicon" />
//               <div className="site-info">
//                 <span className="domain-name">{domain}</span>
//                 <span className="site-stats">{formatTime(data.timeSpent)} | Visits: {data.visitCount}</span>
//               </div>
//             </li>
//           ))}
//         </ul>
//       </div>
//       <div className="main-content">
//         <TimedBlocksManager />
//         <BlocklistManager />
//         <ViolationLog />
//       </div>
//     </div>
//   );
// }
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

  return (
    <div className="dashboard-container">
      <div className="sites-visited-card">
        <h3>Sites Visited on {selectedDate}</h3>
        <ul className="scrollable-list">
          {sortedData.length > 0 ? (
            sortedData.map(([domain, data]) => (
                <li key={domain} className="site-item">
                <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt={`${domain} favicon`} className="favicon" />
                <div className="site-info">
                  <span className="domain-name">{domain}</span>
                  <span className="site-stats">{formatTime(data.timeSpent)} | Visits: {data.visitCount}</span>
                </div>
              </li>
            ))
          ) : (
            <p className="no-data">No browsing data for this day.</p>
          )}
        </ul>
      </div>
      <div className="main-content">
        <DayWiseChart dailyData={allUsageData} onBarClick={setSelectedDate} />
        <TimedBlocksManager />
        <BlocklistManager />
        <ViolationLog />
      </div>
    </div>
  );
}


// --- Component 4: The Main OptionsPage with PIN Logic ---
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

  if (isAuthenticated) {
    return <FullReport />;
  }

  return (
    <div className="pin-container">
      <div className="pin-card">
        <h2>{hasPin ? 'Enter Your PIN' : 'Set a PIN to Continue'}</h2>
        <p>Your data is protected. A PIN is required to access the main dashboard.</p>
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="pin-input" maxLength="4" onKeyPress={(event) => { if (event.key === 'Enter') handlePinSubmit(); }} />
        {error && <p className="pin-error">{error}</p>}
        <button onClick={handlePinSubmit} className="pin-button">{hasPin ? 'Unlock' : 'Set PIN'}</button>
      </div>
    </div>
  );
}

export default OptionsPage;