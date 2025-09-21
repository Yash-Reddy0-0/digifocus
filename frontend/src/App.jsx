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
//   const [totalTime, setTotalTime] = useState(0);
//   const [topSites, setTopSites] = useState([]);
//   const [currentSite, setCurrentSite] = useState('');
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [blockType, setBlockType] = useState('timed');
//   const [hours, setHours] = useState(0);
//   const [minutes, setMinutes] = useState(30);

//   useEffect(() => {
//     // This fetches data for the main dashboard view
//     const updateDashboard = () => {
//       chrome.storage.local.get('usageData', (result) => {
//         if (result.usageData) {
//           const usageData = result.usageData;
//           const totalSeconds = Object.values(usageData).reduce((sum, site) => sum + site.timeSpent, 0);
//           setTotalTime(totalSeconds);
//           const sortedSites = Object.entries(usageData)
//             .sort(([, a], [, b]) => b.timeSpent - a.timeSpent)
//             .slice(0, 3);
//           setTopSites(sortedSites);
//         }
//       });
//     };
//     updateDashboard();
//     const intervalId = setInterval(updateDashboard, 3000);
//     return () => clearInterval(intervalId);
//   }, []);

//   useEffect(() => {
//     // This gets the current site for the blocking modal
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs[0] && tabs[0].url) {
//         try {
//           const domain = new URL(tabs[0].url).hostname;
//           setCurrentSite(domain);
//         } catch (e) {}
//       }
//     });
//   }, []);

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
//       <div className="total-time-card"><p>Total Time Today</p><h2>{formatTime(totalTime)}</h2></div>
//       <div className="top-sites-list">
//         <h3>Top Sites</h3>
//         {/* ✅ FIXED: Added the missing <ul> wrapper here */}
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

//       <button className="focus-mode-button" onClick={() => setIsModalOpen(true)}>Focus Mode 🎯</button>
//       <button className="full-report-button" onClick={openOptionsPage}>View Full Report</button>

//       {/* The Modal Window for Blocking */}
//       {isModalOpen && (
//         <div className="modal-backdrop">
//           <div className="modal-content">
//             <h3>Block Current Site</h3>
//             <p className="current-site-display">{currentSite || "No site detected"}</p>
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
  const [totalTime, setTotalTime] = useState(0);
  const [topSites, setTopSites] = useState([]);
  const [currentSite, setCurrentSite] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blockType, setBlockType] = useState('timed');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    const updateDashboard = () => {
      chrome.storage.local.get('usageData', (result) => {
        if (result.usageData) {
          const usageData = result.usageData;
          const totalSeconds = Object.values(usageData).reduce((sum, site) => sum + site.timeSpent, 0);
          setTotalTime(totalSeconds);
          const sortedSites = Object.entries(usageData)
            .sort(([, a], [, b]) => b.timeSpent - a.timeSpent)
            .slice(0, 3);
          setTopSites(sortedSites);
        }
      });
    };
    updateDashboard();
    const intervalId = setInterval(updateDashboard, 3000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const domain = new URL(tabs[0].url).hostname;
          setCurrentSite(domain);
        } catch (e) {}
      }
    });
  }, []);

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

  return (
    <div className="app-container dashboard-view">
      <div className="header"><h1>Digital Focus Guard</h1></div>
      <div className="total-time-card"><p>Total Time Today</p><h2>{formatTime(totalTime)}</h2></div>
      <div className="top-sites-list">
        <h3>Top Sites</h3>
        <ul>
          {topSites.map(([domain, data]) => (
            <li key={domain} className="site-item">
              <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt={`${domain} favicon`} className="favicon" />
              <div className="site-info">
                <span className="domain-name">{domain}</span>
                <span className="site-stats">{formatTime(data.timeSpent)} | Visits: {data.visitCount}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button className="focus-mode-button" onClick={() => setIsModalOpen(true)}>Focus Mode 🎯</button>
      <button className="full-report-button" onClick={openOptionsPage}>View Full Report</button>

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Block Current Site</h3>
            <p className="current-site-display">{currentSite || "No site detected"}</p>
            <div className="block-type-selector">
              <label><input type="radio" name="blockType" value="timed" checked={blockType === 'timed'} onChange={() => setBlockType('timed')} /> Set Timer</label>
              <label><input type="radio" name="blockType" value="always" checked={blockType === 'always'} onChange={() => setBlockType('always')} /> Always</label>
            </div>
            {blockType === 'timed' && (
              <div className="timed-inputs">
                <input type="number" min="0" value={hours} onChange={(e) => setHours(Number(e.target.value))} /> H
                <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /> M
              </div>
            )}
            <button className="add-site-button" onClick={handleBlockSite} disabled={!currentSite}>Confirm Block</button>
            <button className="close-modal-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;