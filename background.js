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

// in background.js

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
  chrome.storage.local.get('usageData', (result) => {
    const usageData = result.usageData || {};
    const now = Date.now();
    if (oldDomain && oldStartTime) {
      const timeSpent = Math.round((now - oldStartTime) / 1000);
      if (timeSpent > 0) {
        if (!usageData[oldDomain]) usageData[oldDomain] = { timeSpent: 0, visitCount: 0 };
        usageData[oldDomain].timeSpent += timeSpent;
      }
    }
    if (newDomain && newDomain !== oldDomain) {
      if (!usageData[newDomain]) usageData[newDomain] = { timeSpent: 0, visitCount: 0 };
      usageData[newDomain].visitCount += 1;
    }
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
          sendResponse({ success: true });
        });
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
    chrome.storage.local.get(['tempBlocklist', 'permanentBlocklist', 'violationLogs'], (result) => {
      const tempBlocklist = result.tempBlocklist || {};
      const permanentBlocklist = result.permanentBlocklist || [];
      let isBlocked = false;
      if (permanentBlocklist.includes(domain)) {
        isBlocked = true;
      }
      else if (domain in tempBlocklist) {
        if (Date.now() < tempBlocklist[domain]) {
          isBlocked = true;
        } else {
          delete tempBlocklist[domain];
          chrome.storage.local.set({ tempBlocklist });
        }
      }
      if (isBlocked) {
        const violationLogs = result.violationLogs || [];
        const newLog = {
          domain: domain,
          timestamp: Date.now(),
          type: 'Blocked site access attempt'
        };
        const updatedLogs = [newLog, ...violationLogs];
        chrome.storage.local.set({ violationLogs: updatedLogs }, () => {
          chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html') });
        });
        return;
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
  } else if (newState === 'active') {
    activeTabInfo.startTime = Date.now();
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