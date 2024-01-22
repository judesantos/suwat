import * as transcript from '../../services/transcript.js';

let transcribePort = undefined;
let sidepanelPort = undefined;
let tabId = undefined;

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
      justification: 'Recording from chrome.tabCapture API',
    });
  }

  chrome.action.onClicked.addListener(async (tab) => {
    //navigator.permissions.query({name: 'microphone'})
    //.then((permissionObj) => {
    //  console.log('permission: ' + permissionObj.state);
    chrome.permissions.request(
      {
        permissions: ['tabs'],
        origins: ['<all_urls>'],
      },
      (granted) => {
        // The callback argument will be true if the user granted the permissions.
        if (granted) {
          console.log('permission granted');
        } else {
          console.log('permission denied');
        }
      }
    );
    //})
    //.catch((error) => {
    //  console.error('Got error :', error);
    //})

    console.log('sidpanel event clicked: ' + tabId);
    if (tabId) {
      if (tab.id === tabId) return; // same tab. Ignore
      // Only 1 sidepanel can be open at a time.
      // Send message to offscreen and warn user.

      chrome.runtime.sendMessage({
        action: 'tab-exists',
        target: 'offscreen',
      });

      return;
    }

    tabId = tab.id;
    console.log('open side panel for tab: ' + tabId);

    chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'sidepanel.html',
      enabled: true,
    });
    chrome.sidePanel.open({ tabId: tab.id });
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
      console.log('background message listener: record-action!');
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
        console.log('calling google auth...');

        try {
          /**
           * see: https://gist.github.com/raineorshine/970b60902c9e6e04f71d
           */
          chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (token) {
              console.log('google auth. token: ' + token);

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

        //if (token) {

        console.log('logout success');

        sidepanelPort.postMessage({
          action: 'sign-out',
          status: 'success',
          token,
        });

        //} else {

        //  console.log('logout failed: ' + chrome.runtime.lastError.message);

        //  sidepanelPort.postMessage({
        //    action: 'sign-out',
        //    status: 'error',
        //    msg: chrome.runtime.lastError.message
        //  });
        //}
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
        //if (!result) {
        //  console.log({logout_error: chrome.runtime.lastError.message})
        //}
      } catch (e) {
        console.log('Sign-out exception!');
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

    console.log('stop recording - send request to offscreen')
    // If currently recording - stop
    response = await chrome.runtime.sendMessage({
      action: 'stop-recording',
      target: 'offscreen',
      tabId: request.tabId,
    });

    if (response.status === 'stopped') {
      callback(response);
    }
  } else {
    // Current state is stopped. Toggle and start transcription

    // Get a MediaStream for the active tab.
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: request.tabId,
    });

    console.log('start recording - send request to offscreeen');
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

      // Send interim status to command request source - popup
      callback(response);
    }
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
    transcribePort.onMessage.addListener((msg) => {
      if (msg.status === 'ready') {
        // Tell data source we are ready to receive events.
        transcribePort.postMessage({ status: 'ready' });
      } else if (msg.status === 'transcription') {
        // Format, separate speakers by line.
        const lines = transcript.processJob(msg.data);
        // Send new transcribe data to sidepanel
        chrome.runtime.sendMessage({
          action: 'transcription',
          target: 'sidepanel',
          data: lines,
        });
        // Save updates
        chrome.storage.local.set({ dialogue: transcript.getDialogue() });
      } else if (msg.status === 'disconnect') {
        transcribePort.disconnect();
        transcribePort = undefined;
      } else {
        console.log(
          'background - establish transcription tunnel connection failed. status: ' +
            msg.status
        );
      }
    });
  });
};

export {};
