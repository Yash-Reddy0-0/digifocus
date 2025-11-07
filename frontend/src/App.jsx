import { useState, useEffect } from 'react';
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

function App() {
  const [usageData, setUsageData] = useState({});
  const [currentSite, setCurrentSite] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blockType, setBlockType] = useState('timed');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);

  // State for the new session modal
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionHours, setSessionHours] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [permanentBlocklist, setPermanentBlocklist] = useState([]);

  useEffect(() => {
    const updateData = () => {
      // Get the currently active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          try {
            const domain = new URL(tabs[0].url).hostname.replace(/^www\./, '');
            setCurrentSite(domain);
          } catch (e) {}
        }
      });
      // Get all usage data from storage
      chrome.storage.local.get(['usageData', 'permanentBlocklist'], (result) => {
        if (result.usageData) {
          setUsageData(result.usageData);
        }
        // Fetch the permanent blocklist to use for the focus session
        if (result.permanentBlocklist) {
          setPermanentBlocklist(result.permanentBlocklist);
        }
      });
    };

    updateData();
    const intervalId = setInterval(updateData, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // Calculate stats from the fetched data
  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = usageData[today] || {};

  const totalTime = Object.values(todayUsage).reduce((sum, site) => sum + site.timeSpent, 0);
  const topSites = Object.entries(todayUsage)
    .sort(([, a], [, b]) => b.timeSpent - a.timeSpent)
    .slice(0, 3);
  const currentSiteData = todayUsage[currentSite] || { timeSpent: 0, visitCount: 0 };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleBlockSite = () => {
    if (!currentSite) return;
    if (blockType === 'always') {
      chrome.runtime.sendMessage({ action: 'addPermanentBlock', domain: currentSite }, (response) => {
        if (response.success) {
          alert(`${currentSite} has been permanently blocked.`);
          window.close();
        }
      });
    } else {
      const durationMinutes = (hours * 60) + minutes;
      if (durationMinutes <= 0) return;
      chrome.runtime.sendMessage({ action: 'blockSite', domain: currentSite, durationMinutes: durationMinutes }, (response) => {
        if (response.success) {
          alert(`${currentSite} has been blocked for ${durationMinutes} minutes.`);
          window.close();
        }
      });
    }
  };

  // Handler for starting the focus session
  const handleStartFocusSession = () => {
    const durationMinutes = (sessionHours * 60) + sessionMinutes;
    if (durationMinutes <= 0) {
      alert("Please set a duration greater than 0.");
      return;
    }
    if (permanentBlocklist.length === 0) {
      alert("Your permanent blocklist is empty. Add sites to your blocklist from the dashboard to start a session.");
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: 'startFocusSession',
        domains: permanentBlocklist,
        durationMinutes: durationMinutes
      },
      (response) => {
        if (response.success) {
          alert(`Focus session started for ${durationMinutes} minutes. ${permanentBlocklist.length} sites are now temporarily blocked.`);
          window.close(); // Close the popup
        }
      }
    );
  };

  return (
    <div className="app-container dashboard-view">
      {/* Header */}
      <div className="header">
        <div className="header-icon">🎯</div>
        <h1>Digital Focus Guard</h1>
      </div>

      {/* Total Time Card */}
      <div className="total-time-card">
        <p>Today's Focus Time</p>
        <h2>{formatTime(totalTime)}</h2>
      </div>

      {/* Current Site Details */}
      {currentSite && (
        <div className="current-site-card">
          <h4>Currently Active</h4>
          <div className="current-site-content">
            {/* --- START FIX 1 --- */}
            {/* Removed className, using only style */}
            <img 
              src={`https://www.google.com/s2/favicons?domain=${currentSite}&sz=40`} 
              alt="favicon" 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '8px',
                flexShrink: 0 
              }}
            />
            {/* --- END FIX 1 --- */}
            <div className="site-info">
              <span className="domain-name">{currentSite}</span>
              <span className="site-stats">
                {formatTime(currentSiteData.timeSpent)} • {currentSiteData.visitCount} visits
              </span>
            </div>
            <button
              className="icon-button"
              onClick={() => setIsModalOpen(true)}
              title="Block this site"
            >
              🚫
            </button>
          </div>
        </div>
      )}

      {/* Top Sites */}
      <div className="top-sites-list">
        <h3>Top Sites Today</h3>
        <ul>
          {topSites.length > 0 ? (
            topSites.map(([domain, data], index) => (
              <li key={domain} className="site-item">
                {/* --- START FIX 2 --- */}
                {/* Removed className, using only style */}
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
                  alt="favicon" 
                  style={{ 
                    width: '32px', 
                    height: '32px',
                    borderRadius: '6px',
                    flexShrink: 0
                  }}
                />
                {/* --- END FIX 2 --- */}
                <div className="site-info">
                  <span className="domain-name">{domain}</span>
                  <span className="site-stats">
                    {formatTime(data.timeSpent)} • {data.visitCount} visits
                  </span>
                </div>
              </li>
            ))
          ) : (
            <li style={{ textAlign: 'center', padding: '20px', opacity: 0.7 }}>
              No browsing data yet today
            </li>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <button
        className="focus-mode-button"
        onClick={() => setIsSessionModalOpen(true)}
      >
        <span>🚀</span> Start Focus Session
      </button>

      <button className="full-report-button" onClick={openOptionsPage}>
        View Full Dashboard →
      </button>

      {/* Modal for Blocking Current Site */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Block Site</h3>
            <div className="current-site-display">{currentSite || "None"}</div>

            <div className="block-type-selector">
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

            <button
              className="add-site-button"
              onClick={handleBlockSite}
              disabled={!currentSite}
            >
              Confirm Block
            </button>
            <button
              className="close-modal-button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modal for Starting Focus Session */}
      {isSessionModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Start Focus Session</h3>
            <p style={{ fontSize: '13px', color: '#666', margin: '-8px 0 16px' }}>
              This will block all {permanentBlocklist.length} sites from your permanent blocklist for a set duration.
            </p>

            <div className="timed-inputs">
              <input
                type="number"
                min="0"
                value={sessionHours}
                onChange={(e) => setSessionHours(Number(e.target.value))}
                placeholder="Hours"
              />
              <input
                type="number"
                min="0"
                max="59"
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(Number(e.target.value))}
                placeholder="Minutes"
              />
            </div>

            <button
              className="add-site-button"
              onClick={handleStartFocusSession}
              disabled={permanentBlocklist.length === 0}
            >
              Start Session
            </button>
            <button
              className="close-modal-button"
              onClick={() => setIsSessionModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;