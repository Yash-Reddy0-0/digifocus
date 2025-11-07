// Add this block to the TOP of the file to ensure a clean start
// chrome.runtime.onInstalled.addListener(() => {
//   chrome.storage.local.clear(() => {
//     console.log("✅ STORAGE CLEARED on install. Starting fresh.");
//   });
// });

let activeTabInfo = {
  id: null,
  domain: null,
  startTime: null,
};

// A helper to get the current date as a string (e.g., "2025-09-21")
function getCurrentDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// A function to keep only the last 7 days of data
function pruneOldData(usageData) {
  const savedDays = Object.keys(usageData).sort();
  if (savedDays.length > 7) {
    const daysToDelete = savedDays.slice(0, savedDays.length - 7);
    daysToDelete.forEach(day => {
      delete usageData[day];
    });
  }
  return usageData;
}

// Function to log violations
function logViolation(domain, type = 'Blocked site access attempt') {
  chrome.storage.local.get('violationLogs', (result) => {
    const logs = result.violationLogs || [];
    const newLog = {
      domain: domain,
      timestamp: Date.now(),
      type: type
    };
    // Add new log at the beginning, keep only last 50 logs
    const updatedLogs = [newLog, ...logs].slice(0, 50);
    chrome.storage.local.set({ violationLogs: updatedLogs });
    console.log('🚫 Violation logged:', domain, type);
  });
}

function getDomainFromUrl(url) {
  if (!url) return null;
  try {
    // This regex finds the main domain name, ignoring subdomains and protocols
    const domainRegex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im;
    const matches = url.match(domainRegex);
    if (matches && matches[1]) {
      // We return the first captured group, which is the domain
      return matches[1];
    }
    return new URL(url).hostname; // Fallback for edge cases
  } catch (e) {
    return null;
  }
}

function updateUsageData({ oldDomain, oldStartTime, newDomain }) {
  if (!oldDomain && !newDomain) return;

  const todayStr = getCurrentDateString();

  chrome.storage.local.get('usageData', (result) => {
    let usageData = result.usageData || {};
    if (!usageData[todayStr]) {
      usageData[todayStr] = {};
    }
    
    const todayUsage = usageData[todayStr];
    const now = Date.now();

    if (oldDomain && oldStartTime) {
      const timeSpent = Math.round((now - oldStartTime) / 1000);
      if (timeSpent > 0) {
        if (!todayUsage[oldDomain]) todayUsage[oldDomain] = { timeSpent: 0, visitCount: 0 };
        todayUsage[oldDomain].timeSpent += timeSpent;
      }
    }

    if (newDomain && newDomain !== oldDomain) {
      if (!todayUsage[newDomain]) todayUsage[newDomain] = { timeSpent: 0, visitCount: 0 };
      todayUsage[newDomain].visitCount += 1;
    }
    
    usageData = pruneOldData(usageData);
    chrome.storage.local.set({ usageData });
  });
}

function handleTabSwitch(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    const newDomain = getDomainFromUrl(tab.url);
    updateUsageData({
      oldDomain: activeTabInfo.domain,
      oldStartTime: activeTabInfo.startTime,
      newDomain: newDomain,
    });
    activeTabInfo.id = tab.id;
    activeTabInfo.domain = newDomain;
    activeTabInfo.startTime = Date.now();
  });
}

// --- Event Listeners ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'blockSite') {
    const { domain, durationMinutes } = request;
    const endTime = Date.now() + durationMinutes * 60 * 1000;
    chrome.storage.local.get('tempBlocklist', (result) => {
      const blocklist = result.tempBlocklist || {};
      blocklist[domain] = endTime;
      chrome.storage.local.set({ tempBlocklist: blocklist, focusSessionEndTime: endTime }, () => {
        console.log(`✅ Timed block added: ${domain} for ${durationMinutes} minutes`);
        sendResponse({ success: true });
      });
    });
    return true;
  } else if (request.action === 'startFocusSession') {
    const { domains, durationMinutes } = request;
    const endTime = Date.now() + durationMinutes * 60 * 1000;
    chrome.storage.local.get('tempBlocklist', (result) => {
      const blocklist = result.tempBlocklist || {};
      for (const domain of domains) {
        blocklist[domain] = endTime;
      }
      chrome.storage.local.set({ tempBlocklist: blocklist, focusSessionEndTime: endTime }, () => {
        console.log(`✅ Focus session started with ${domains.length} sites for ${durationMinutes} minutes`);
        sendResponse({ success: true });
      });
    });
    return true;
  } else if (request.action === 'cancelTimedBlock') {
    const { domain } = request;
    chrome.storage.local.get('tempBlocklist', (result) => {
      const blocklist = result.tempBlocklist || {};
      if (domain in blocklist) {
        delete blocklist[domain];
        chrome.storage.local.set({ tempBlocklist: blocklist }, () => {
          console.log(`✅ Timed block cancelled: ${domain}`);
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  } else if (request.action === 'addPermanentBlock') {
    const { domain } = request;
    chrome.storage.local.get('permanentBlocklist', (result) => {
      const blocklist = result.permanentBlocklist || [];
      if (!blocklist.includes(domain)) {
        const updatedList = [...blocklist, domain];
        chrome.storage.local.set({ permanentBlocklist: updatedList }, () => {
          console.log(`✅ Permanent block added: ${domain}`);
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  handleTabSwitch(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading' && !changeInfo.url) {
    return;
  }
  const domain = getDomainFromUrl(tab.url);
  if (domain) {
    chrome.storage.local.get(['tempBlocklist', 'permanentBlocklist'], (result) => {
      const tempBlocklist = result.tempBlocklist || {};
      const permanentBlocklist = result.permanentBlocklist || [];
      let isBlocked = false;
      let blockType = '';
      
      // Check permanent blocklist
      if (permanentBlocklist.includes(domain)) {
        isBlocked = true;
        blockType = 'Permanent block violation';
      }
      // Check temporary blocklist
      else if (domain in tempBlocklist) {
        if (Date.now() < tempBlocklist[domain]) {
          isBlocked = true;
          blockType = 'Timed block violation';
        } else {
          // Block expired, remove it
          delete tempBlocklist[domain];
          chrome.storage.local.set({ tempBlocklist });
        }
      }
      
      if (isBlocked) {
        // Log the violation
        logViolation(domain, blockType);
        
        // Redirect to blocked page
        chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html') });
        console.log(`🚫 Blocked access to: ${domain} (${blockType})`);
      }
    });
  }
  if (tabId === activeTabInfo.id && changeInfo.url) {
    handleTabSwitch(tabId);
  }
});

chrome.idle.onStateChanged.addListener((newState) => {
  updateUsageData({
    oldDomain: activeTabInfo.domain,
    oldStartTime: activeTabInfo.startTime,
    newDomain: null,
  });
  if (newState === 'idle' || newState === 'locked') {
    activeTabInfo.startTime = null;
    console.log('⏸️ User idle/locked - pausing tracking');
  } else if (newState === 'active') {
    activeTabInfo.startTime = Date.now();
    console.log('▶️ User active - resuming tracking');
  }
});

chrome.alarms.create('periodicSave', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSave') {
    updateUsageData({
      oldDomain: activeTabInfo.domain,
      oldStartTime: activeTabInfo.startTime,
      newDomain: null,
    });
    if (activeTabInfo.startTime) {
      activeTabInfo.startTime = Date.now();
    }
  }
});

// Log when extension starts
console.log('🎯 Digital Focus Guard started');