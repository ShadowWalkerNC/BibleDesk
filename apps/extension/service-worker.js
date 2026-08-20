/**
 * service-worker.js — BibleDesk Chrome Extension Background Worker (MV3)
 */

// Enable side panel to open upon clicking the action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// Set up Context Menus on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'bibledesk-study-selection',
    title: 'Study "%s" in BibleDesk',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'bibledesk-lookup-verse',
    title: 'Lookup Scripture Verse',
    contexts: ['page', 'selection'],
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.windowId) return;

  // Open the side panel for the current window
  await chrome.sidePanel.open({ windowId: tab.windowId });

  if (info.menuItemId === 'bibledesk-study-selection' && info.selectionText) {
    const text = info.selectionText.trim();
    // Send message to side panel with selected text to trigger search or study
    await chrome.storage.local.set({ lastQuery: text, triggerAction: 'search' });
    chrome.runtime.sendMessage({ action: 'study_query', query: text }).catch(() => {
      // Side panel might still be initializing, state is stored in storage.local
    });
  }
});
