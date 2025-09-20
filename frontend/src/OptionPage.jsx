import { useState, useEffect } from 'react';
import './App.css'; // We can reuse the same CSS

function formatTime(totalSeconds) {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function OptionsPage() {
  const [fullUsage, setFullUsage] = useState([]);

  useEffect(() => {
    const updateFullReport = () => {
      chrome.storage.local.get('usageData', (result) => {
        if (result.usageData) {
          const sortedData = Object.entries(result.usageData)
            .sort(([, a], [, b]) => b.timeSpent - a.timeSpent);
          setFullUsage(sortedData);
        }
      });
    };

    updateFullReport();
    const intervalId = setInterval(updateFullReport, 3000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="app-container" style={{ width: '100%', maxWidth: '600px', margin: '20px auto' }}>
      <div className="header">
        <h1>Full Daily Report</h1>
      </div>
      <div className="top-sites-list">
        {fullUsage.length > 0 ? (
          <ul>
            {fullUsage.map(([domain, data]) => (
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
          <p className="no-data">No browsing data yet.</p>
        )}
      </div>
    </div>
  );
}

export default OptionsPage;