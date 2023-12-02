import * as transcript from '../../services/transcript.js'

let tunnelPort = undefined;

chrome.runtime.onInstalled.addListener(async () => {

  console.log('onInstalled.addListener');
  /**
   * Sidepanel setup
   */

  chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch((error) => console.error(error));

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
  
  chrome.action.onClicked.addListener(async (tab) => {

    console.log('open side panel')

    chrome.sidePanel.open({ tabId: tab.id });
    chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'sidepanel.html',
      enabled: true
    });

  });

});

const record_action = async (request, callback) => {

  // Find offscreen page and check current state

  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
  );

  let recording = offscreenDocument.documentUrl.endsWith('#recording');
  let response = undefined;

  if (recording) {

    // If currently recording - stop
    response = await chrome.runtime.sendMessage({
      action: 'stop-recording',
      target: 'offscreen',
      tabId: request.tabId
    });

    if (response.status === 'stopped') {
      callback(response);
    }

  } else {

    // Current state is stopped. Toggle and start transcription

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
    
    if (response.status === 'recording') {

      // Setup listener to transfer transcription chunks through service-worker,
      // then the sidepanel
      await recvTranscriptionEvents();

      // Send interim status to command request source - popup
      callback(response)
    }
  }

}

/**
 * Setup long-lived tunnel connection to offscreen (data source) and
 * transfer transcription data to sidepanel (consumer).
 * 
 */
const recvTranscriptionEvents = async () => {

  if (tunnelPort) {
    tunnelPort.disconnect();
    tunnelPort = undefined;
  }

  // Establish connection to offscreen 'transcribe' data source.
  chrome.runtime.onConnect.addListener(port => {

  // Ignore non 'transcribe' connections
    if (port.name !== 'transcribe')
      return false;
    // Only 1 onMessage callback at a time.
    if (tunnelPort)
      return false;

    tunnelPort = port;

    //// Send previous
    //chrome.storage.sync.get('dialogue', o => {
    //  if (o?.dialogue) {
    //    chrome.runtime.sendMessage({
    //      action: 'transcription',
    //      target: 'sidepanel',
    //      data: o.dialogue
    //    });
    //  }
    //});

    // Create 'transcribe' event callback.
    tunnelPort.onMessage.addListener(msg => {

      if (msg.status === 'ready') {

        // Tell data source we are ready to receive events.
        tunnelPort.postMessage({status: 'ready'})

      } else if (msg.status === 'transcription') {
        // Format, separate speakers by line.
        const lines = transcript.processJob(msg.data);
        // Send new transcribe data to sidepanel
        chrome.runtime.sendMessage({
          action: 'transcription',
          target: 'sidepanel',
          data: lines
        });
        // Save updates
        chrome.storage.sync.set({dialogue: transcript.getDialogue()});

      } else if (msg.status === 'disconnect') {

        tunnelPort.disconnect();
        tunnelPort = undefined;

      } else {

        console.log('background - establish transcription tunnel connection failed. status: ' + msg.status);
      }

    });
  })

}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // Popup conduit - listen for popup commands.
  if (request.target === 'background') {

    if (request.action === 'record-action') {

      console.log('background message listener: record-action!');
      record_action(request, sendResponse);

      return true; // tell popup that we will be sending command status response soon.

    }

  }
})

export {}
