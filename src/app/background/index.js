chrome.runtime.onInstalled.addListener(async () => {

  /**
   * Sidepanel setup
   */

  chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch((error) => console.error(error));

  chrome.contextMenus.create({
    id: 'openSidePanel',
    title: 'Open side panel',
    contexts: ['all']
  });

  /**
   * Offscreen setup
   */

  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
  );

  if (!offscreenDocument) {
    // Create an offscreen document.
    chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording from chrome.tabCapture API'
    });
  }
});

/**
 * Handle events
 */

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('open side panel')
  if (tab.id > 0 && info.menuItemId === 'openSidePanel') {
    // This will open the panel on the current tab.
    chrome.sidePanel.open({ tabId: tab.id});//, windowId: tab.windowId });
    //chrome.sidePanel.setOptions({
    //  tabId: tab.id,
    //  path: 'sidepanel.html',
    //  enabled: true
    //});
  }
});

const record_action = async (request, callback) => {
  console.log({request})
  //await setStreamId(tab);
  // This will open the panel on the current tab.
  //chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });

  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
  );

  let recording = offscreenDocument.documentUrl.endsWith('#recording');
  let response = undefined;

  if (recording) {

    response = await chrome.runtime.sendMessage({
      action: 'stop-recording',
      target: 'offscreen',
      tabId: request.tabId
    });
    console.log({response})
    if (response.status === 'stopped') {
      callback(response);
      //chrome.action.setIcon({ path: 'icons/not-recording.png' });
    }

  } else {

    // Get a MediaStream for the active tab.
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: request.tabId
    });

    // Send the stream ID to the offscreen document to start recording.
    response = await chrome.runtime.sendMessage({
      action: 'start-recording',
      target: 'offscreen',
      streamId: streamId
    });
    
    console.log({response})
    if (response.status === 'recording') {
      //chrome.action.setIcon({ path: '/icons/recording.png' });
      await recvTranscriptionEvents();
      //chrome.sidePanel.open({ tabId: request.id, windowId: request.windowId });
      callback(response)
    }
  }

}

const recvTranscriptionEvents = async () => {

  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'transcribe') return;
    
    port.onMessage.addListener(msg => {

      if (msg.status === 'ready') {

        console.log("Transcribe source is ready!")
        port.postMessage({status: 'ready'})

      } else if (msg.status === 'transcription') {

        chrome.runtime.sendMessage({
          action: 'transcription',
          target: 'sidepanel',
          data: msg.data
        });

      } else {

        console.log({unknown_event: msg})
      }
    });
  })

}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.target === 'background') {
    if (request.action === 'record-action') {
      record_action(request, sendResponse);
      return true;
    }
  }
})

export {}
