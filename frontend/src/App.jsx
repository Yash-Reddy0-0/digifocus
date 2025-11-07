// // import { useState, useEffect } from 'react';
// // import './App.css';

// // function formatTime(totalSeconds) {
// //   if (!totalSeconds || totalSeconds < 0) return '0m';
// //   if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
// //   const hours = Math.floor(totalSeconds / 3600);
// //   const minutes = Math.floor((totalSeconds % 3600) / 60);
// //   if (hours > 0) {
// //     return `${hours}h ${minutes}m`;
// //   }
// //   return `${minutes}m`;
// // }

// // function App() {
// //   const [totalTime, setTotalTime] = useState(0);
// //   const [topSites, setTopSites] = useState([]);
// //   const [currentSite, setCurrentSite] = useState('');
// //   const [isModalOpen, setIsModalOpen] = useState(false);
// //   const [blockType, setBlockType] = useState('timed');
// //   const [hours, setHours] = useState(0);
// //   const [minutes, setMinutes] = useState(30);

// //   useEffect(() => {
// //     // This fetches data for the main dashboard view
// //     const updateDashboard = () => {
// //       chrome.storage.local.get('usageData', (result) => {
// //         if (result.usageData) {
// //           const usageData = result.usageData;
// //           const totalSeconds = Object.values(usageData).reduce((sum, site) => sum + site.timeSpent, 0);
// //           setTotalTime(totalSeconds);
// //           const sortedSites = Object.entries(usageData)
// //             .sort(([, a], [, b]) => b.timeSpent - a.timeSpent)
// //             .slice(0, 3);
// //           setTopSites(sortedSites);
// //         }
// //       });
// //     };
// //     updateDashboard();
// //     const intervalId = setInterval(updateDashboard, 3000);
// //     return () => clearInterval(intervalId);
// //   }, []);

// //   useEffect(() => {
// //     // This gets the current site for the blocking modal
// //     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
// //       if (tabs[0] && tabs[0].url) {
// //         try {
// //           const domain = new URL(tabs[0].url).hostname;
// //           setCurrentSite(domain);
// //         } catch (e) {}
// //       }
// //     });
// //   }, []);

// //   const openOptionsPage = () => {
// //     chrome.runtime.openOptionsPage();
// //   };

// //   const handleBlockSite = () => {
// //     if (!currentSite) return;
// //     if (blockType === 'always') {
// //       chrome.runtime.sendMessage({ action: 'addPermanentBlock', domain: currentSite }, (response) => {
// //         if (response.success) {
// //           alert(`${currentSite} has been permanently blocked.`);
// //           window.close();
// //         }
// //       });
// //     } else {
// //       const durationMinutes = (hours * 60) + minutes;
// //       if (durationMinutes <= 0) return;
// //       chrome.runtime.sendMessage({ action: 'blockSite', domain: currentSite, durationMinutes: durationMinutes }, (response) => {
// //         if (response.success) {
// //           alert(`${currentSite} has been blocked for ${durationMinutes} minutes.`);
// //           window.close();
// //         }
// //       });
// //     }
// //   };

// //   return (
// //     <div className="app-container dashboard-view">
// //       <div className="header"><h1>Digital Focus Guard</h1></div>
// //       <div className="total-time-card"><p>Total Time Today</p><h2>{formatTime(totalTime)}</h2></div>
// //       <div className="top-sites-list">
// //         <h3>Top Sites</h3>
// //         {/* ✅ FIXED: Added the missing <ul> wrapper here */}
// //         <ul>
// //           {topSites.map(([domain, data]) => (
// //             <li key={domain} className="site-item">
// //               <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt={`${domain} favicon`} className="favicon" />
// //               <div className="site-info">
// //                 <span className="domain-name">{domain}</span>
// //                 <span className="site-stats">{formatTime(data.timeSpent)} | Visits: {data.visitCount}</span>
// //               </div>
// //             </li>
// //           ))}
// //         </ul>
// //       </div>

// //       <button className="focus-mode-button" onClick={() => setIsModalOpen(true)}>Focus Mode 🎯</button>
// //       <button className="full-report-button" onClick={openOptionsPage}>View Full Report</button>

// //       {/* The Modal Window for Blocking */}
// //       {isModalOpen && (
// //         <div className="modal-backdrop">
// //           <div className="modal-content">
// //             <h3>Block Current Site</h3>
// //             <p className="current-site-display">{currentSite || "No site detected"}</p>
// //             <div className="block-type-selector">
// //               <label><input type="radio" name="blockType" value="timed" checked={blockType === 'timed'} onChange={() => setBlockType('timed')} /> Set Timer</label>
// //               <label><input type="radio" name="blockType" value="always" checked={blockType === 'always'} onChange={() => setBlockType('always')} /> Always</label>
// //             </div>
// //             {blockType === 'timed' && (
// //               <div className="timed-inputs">
// //                 <input type="number" min="0" value={hours} onChange={(e) => setHours(Number(e.target.value))} /> H
// //                 <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /> M
// //               </div>
// //             )}
// //             <button className="add-site-button" onClick={handleBlockSite} disabled={!currentSite}>Confirm Block</button>
// //             <button className="close-modal-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default App;

// import { useState, useEffect } from 'react';
// import './App.css';

// function formatTime(totalSeconds) {
//   if (!totalSeconds || totalSeconds < 0) return '0m';
//   if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
//   const hours = Math.floor(totalSeconds / 3600);
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   if (hours > 0) {
//     return `${hours}h ${minutes}m`;
//   }
//   return `${minutes}m`;
// }

// function App() {
//   const [usageData, setUsageData] = useState({});
//   const [currentSite, setCurrentSite] = useState('');
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [blockType, setBlockType] = useState('timed');
//   const [hours, setHours] = useState(0);
//   const [minutes, setMinutes] = useState(30);

//   useEffect(() => {
//     const updateData = () => {
//       // Get the currently active tab
//       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0] && tabs[0].url) {
//           try {
//             const domain = new URL(tabs[0].url).hostname.replace(/^www\./, '');
//             setCurrentSite(domain);
//           } catch (e) {}
//         }
//       });
//       // Get all usage data from storage
//       chrome.storage.local.get('usageData', (result) => {
//         if (result.usageData) {
//           setUsageData(result.usageData);
//         }
//       });
//     };

//     updateData();
//     const intervalId = setInterval(updateData, 3000);
//     return () => clearInterval(intervalId);
//   }, []);

//   // Calculate stats from the fetched data
//   const today=new Date().toISOString().slice(0,10);
//   const todayUsage =usageData[today] || {};

//   const totalTime = Object.values(todayUsage).reduce((sum, site) => sum + site.timeSpent, 0);
//   const topSites = Object.entries(todayUsage)
//     .sort(([, a], [, b]) => b.timeSpent - a.timeSpent)
//     .slice(0, 3);
//   const currentSiteData = todayUsage[currentSite] || { timeSpent: 0, visitCount: 0 };

//   const openOptionsPage = () => {
//     chrome.runtime.openOptionsPage();
//   };

//   const handleBlockSite = () => {
//     if (!currentSite) return;
//     if (blockType === 'always') {
//       chrome.runtime.sendMessage({ action: 'addPermanentBlock', domain: currentSite }, (response) => {
//         if (response.success) {
//           alert(`${currentSite} has been permanently blocked.`);
//           window.close();
//         }
//       });
//     } else {
//       const durationMinutes = (hours * 60) + minutes;
//       if (durationMinutes <= 0) return;
//       chrome.runtime.sendMessage({ action: 'blockSite', domain: currentSite, durationMinutes: durationMinutes }, (response) => {
//         if (response.success) {
//           alert(`${currentSite} has been blocked for ${durationMinutes} minutes.`);
//           window.close();
//         }
//       });
//     }
//   };

//   return (
//     <div className="app-container dashboard-view">
//       <div className="header"><h1>Digital Focus Guard</h1></div>
      
//       {/* 1. Total Time Spent */}
//       <div className="total-time-card"><p>Total Time Today</p><h2>{formatTime(totalTime)}</h2></div>
      
//       {/* 2. Current Site Details */}
//       {currentSite && (
//         <div className="current-site-card">
//           <h4>Currently Viewing</h4>
//           <div className="site-item">
//             <img src={`https://www.google.com/s2/favicons?domain=${currentSite}&sz=32`} alt={`${currentSite} favicon`} className="favicon" />
//             <div className="site-info">
//               <span className="domain-name">{currentSite}</span>
//               <span className="site-stats">{formatTime(currentSiteData.timeSpent)} | Visits: {currentSiteData.visitCount}</span>
//             </div>
//             <button className="icon-button" onClick={()=>setIsModalOpen(true)} title='Block this site'>🚫</button>
//           </div>
//         </div>
//       )}

//       {/* 3. Top Sites */}
//       <div className="top-sites-list">
//         <h3>Top Sites Today</h3>
//         <ul>
//           {topSites.map(([domain, data]) => (
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

//       {/* 4. Block Option Buttons */}
//  <button className="focus-mode-button" onClick={() => alert('Focus session can be started from the main dashboard.')}>
//         Start a Focus Session
//       </button>

//       <button className="full-report-button" onClick={openOptionsPage}>
//         View Full Report
//       </button>

//       {/* The Modal for Blocking */}
//       {isModalOpen && (
//         <div className="modal-backdrop">
//           <div className="modal-content">
//             <h3>Block: <span className="current-site-display">{currentSite || "None"}</span></h3>
//             <div className="block-type-selector">
//               <label><input type="radio" name="blockType" value="timed" checked={blockType === 'timed'} onChange={() => setBlockType('timed')} /> Set Timer</label>
//               <label><input type="radio" name="blockType" value="always" checked={blockType === 'always'} onChange={() => setBlockType('always')} /> Always</label>
//             </div>
//             {blockType === 'timed' && (
//               <div className="timed-inputs">
//                 <input type="number" min="0" value={hours} onChange={(e) => setHours(Number(e.target.value))} /> H
//                 <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /> M
//               </div>
//             )}
//             <button className="add-site-button" onClick={handleBlockSite} disabled={!currentSite}>Confirm Block</button>
//             <button className="close-modal-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;



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
      chrome.storage.local.get('usageData', (result) => {
        if (result.usageData) {
          setUsageData(result.usageData);
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

  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '🌐';
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
            <div className="site-icon-large">🌐</div>
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
                <div className="site-rank">{getMedalEmoji(index)}</div>
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
        onClick={() => alert('Focus session can be started from the main dashboard.')}
      >
        <span>🚀</span> Start Focus Session
      </button>

      <button className="full-report-button" onClick={openOptionsPage}>
        View Full Dashboard →
      </button>

      {/* Modal for Blocking */}
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
    </div>
  );
}

export default App;