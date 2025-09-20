import { useState, useEffect } from 'react';
import './App.css';

//A helper function to format seconds into HH:MM
function formatTime(totalSeconds) {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function App() {
  const [totalTime, setTotalTime] = useState(0);
  const [topSites, setTopSites] = useState([]);

  useEffect(() => {
    const updateDashboard = () => {
      chrome.storage.local.get('usageData', (result) => {
        if (result.usageData) {
          const usageData = result.usageData;

          // 1. Calculate the total time spent
          const totalSeconds = Object.values(usageData).reduce((sum, site) => sum + site.timeSpent, 0);
          setTotalTime(totalSeconds);

          // 2. Find the top 3 sites
          const sortedSites = Object.entries(usageData)
            .sort(([, a], [, b]) => b.timeSpent - a.timeSpent) // Sort by timeSpent, descending
            .slice(0, 3); // Take only the first 3

          setTopSites(sortedSites);
        }
      });
    };

    updateDashboard(); // Initial update
    const intervalId = setInterval(updateDashboard, 3000); // Update every 3 seconds
    return () => clearInterval(intervalId);
  }, []);

   const openOptionsPage=() => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
   }
  return (
    <div className="app-container">
      <div className="header">
        <h1>Digital Focus Guard</h1>
      </div>
      <div className="total-time-card">
        <p>Total Time Today</p>
        <h2>{formatTime(totalTime)}</h2>
      </div>
      <div className="top-sites-list">
       <div> <h3>Top Sites</h3><button>block</button></div>
        {topSites.length > 0 ? (
          <ul>
            {topSites.map(([domain, data]) => (
              <li key={domain} className="site-item">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  alt={`${domain} favicon`}
                  className="favicon"
                />
                <div className="site-info">
                  <span className="domain-name">{domain}</span>
                  <span className="site-stats">
                    {formatTime(data.timeSpent)}  |  Visits: {data.visitCount}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-data">Start browsing to see your stats!</p>
        )}
      </div>
      <div className='buttons'>
        <button className="block">block</button>
      <button className="full-report-button" onClick={openOptionsPage}>View</button>
      </div>
    </div>
  );
}

export default App;