// You can uncomment this block temporarily whenever you want to clear all data
// chrome.runtime.onInstalled.addListener(() => {
//   chrome.storage.local.clear(() => {
//     console.log("✅ STORAGE CLEARED. Starting fresh.");
//   });
// });

let activeTabInfo = {
  id: null,
  domain: null,
  startTime: null,
};

function getDomainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
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
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  handleTabSwitch(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url) {
    const domain = getDomainFromUrl(tab.url);
    chrome.storage.local.get('tempBlocklist', (result) => {
      const blocklist = result.tempBlocklist || {};
      if (domain in blocklist) {
        if (Date.now() < blocklist[domain]) {
          chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html') });
        } else {
          delete blocklist[domain];
          chrome.storage.local.set({ tempBlocklist: blocklist });
        }
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