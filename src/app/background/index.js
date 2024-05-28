import * as transcript from '../../services/transcript.js';

let transcribePort = undefined;
let sidepanelPort = undefined;
let tabId = undefined;

chrome.runtime.onInstalled.addListener(async () => {
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
      justification: 'Recording from chrome.tabCapture API',
    });
  }

  chrome.action.onClicked.addListener((tab) => {

    if (tabId) {
      if (tab.id === tabId)
        return; // same tab. Ignore
      // Only 1 sidepanel can be open at a time.
      // Send message to offscreen and warn user.
      chrome.runtime.sendMessage({
        action: 'tab-exists',
        target: 'offscreen',
      });
      // cancel
      return
    }

    tabId = tab.id;

    chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'sidepanel.html',
      enabled: true,
    });
    chrome.sidePanel.open({ tabId: tab.id });
  });
  
  chrome.webNavigation.onCommitted.addListener(function(details) {
    // Check if the navigation is in an offscreen frame
    if (details.frameId === 0 && details.tabId !== undefined) {
        // details.url contains the new URL
        if (details.transitionQualifiers.length) {
          chrome.sidePanel.setOptions({
            tabId,
            enabled: false
          }); 
        }
        // You can perform any action you need here
    }
});
});

chrome.runtime.onStartup.addListener(() => {
  console.log('runtime onStartup');
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('runtime onSuspend');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Popup conduit - listen for popup commands.
  if (request.target === 'background') {
    if (request.action === 'record-action') {
      record_action(request, sendResponse);

      return true; // tell popup that we will be sending command status response soon.
    }
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    if (sidepanelPort) {
      // Do not duplicate disconnect handler
      return;
    }

    sidepanelPort = port;
    // message listener
    //
    sidepanelPort.onMessage.addListener(async (msg) => {
      if (msg.action === 'sign-in') {

        try {
          /**
           * see: https://gist.github.com/raineorshine/970b60902c9e6e04f71d
           */
          chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (token) {
              chrome.cookies.set({
                url: 'http://suwat.com', // Change to your domain
                name: 'token',
                value: token,
                expirationDate: Math.floor(Date.now() / 1000) + (3 * 60) // 3 minutes
              });

              sidepanelPort.postMessage({
                action: 'sign-in',
                status: 'success',
                token: token,
              });
            } else {
              console.error(
                'login failed: ' + chrome.runtime.lastError.message
              );

              sidepanelPort.postMessage({
                action: 'sign-in',
                status: 'error',
                msg: chrome.runtime.lastError.message,
              });
            }
          });
        } catch (e) {
          sidepanelPort.postMessage({
            action: 'sign-in',
            status: 'error',
            msg: e,
          });
        }
      } else if (msg.action === 'sign-out') {
        const token = await signOut();

        sidepanelPort.postMessage({
          action: 'sign-out',
          status: 'success',
          token,
        });

      }
    });

    // disconnection listener
    //
    sidepanelPort.onDisconnect.addListener(async () => {
      // Remove previously stored tabId and this tunnel
      tabId = undefined;
      sidepanelPort = undefined;

      // Send message to offscreen to stop ongoing transcription.
      chrome.runtime.sendMessage({
        action: 'logout',
        target: 'offscreen',
      });

      try {

        signOut();

      } catch (e) {

        console.error(chrome.runtime?.lastError);
      }
    });
  }
});

const signOut = async () => {
  return chrome.identity.clearAllCachedAuthTokens();
  //const config = {
  //  url: 'https://accounts.google.com/logout',
  //  abortOnLoadForNonInteractive: true,
  //  timeoutMsForNonInteractive: 0,
  //  interactive: false
  //};

  //return chrome.identity.launchWebAuthFlow(config);
};

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
      tabId: request.tabId,
    });

    //if (response.status === 'stopped') {
      callback(response);
    //}
  } else {
    // Current state is stopped. Toggle and start transcription

    // Get a MediaStream for the active tab.
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: request.tabId,
    });

    // Send the stream ID to the offscreen document to start recording.
    response = await chrome.runtime.sendMessage({
      action: 'start-recording',
      target: 'offscreen',
      streamId: streamId,
    });

    if (response.status === 'recording') {
      // Setup listener to transfer transcription chunks through service-worker,
      // then the sidepanel
      await recvTranscriptionEvents();
    }
    
    // Send interim status to command request source - popup
    callback(response);
  }
};

/**
 * Setup long-lived tunnel connection to offscreen (data source) and
 * transfer transcription data to sidepanel (consumer).
 *
 */
const recvTranscriptionEvents = async () => {
  if (transcribePort) {
    transcribePort.disconnect();
    transcribePort = undefined;
  }

  // Establish connection to offscreen 'transcribe' data source.
  chrome.runtime.onConnect.addListener((port) => {
    // Ignore non 'transcribe' connections
    if (port.name !== 'transcribe') return false;
    // Only 1 onMessage callback at a time.
    if (transcribePort) return false;

    transcribePort = port;

    // Create 'transcribe' event callback.
    transcribePort.onMessage.addListener(async (msg) => {
      if (msg.status === 'ready') {
        // Tell data source we are ready to receive events.
        transcribePort.postMessage({ status: 'ready' });
      } else if (msg.status === 'transcription') {
        // Format, separate speakers by line.
        const lines = transcript.processJob(msg.data);
        // Send new transcribe data to sidepanel
        await chrome.runtime.sendMessage({
          action: 'transcription',
          target: 'sidepanel',
          data: lines,
        });
        // Save updates
        await chrome.storage.local.get('dialogue', async (obj) => {
          if (!obj?.dialogue || obj?.dialogue.length <= 0) {
            obj.dialogue = lines
          } else {
            obj.dialogue = [...obj.dialogue, ...lines]
          }
          await chrome.storage.local.set({ 'dialogue': obj.dialogue });
        })
      } else if (msg.status === 'disconnect') {
        transcribePort.disconnect();
        transcribePort = undefined;
      } else {
        console.error(
          'background - establish transcription tunnel connection failed. status: ' +
            msg.status
        );
      }
    });
  });
};

export {};
