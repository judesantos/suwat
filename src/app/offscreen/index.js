import {
  startRecording,
  stopRecording,
} from '../../services/transcribe-wsocket.js';

let portTunnel = undefined;

const initTranscriptionMsgChannel = async () => {
  if (portTunnel) {
    console.log('offscreen - disconnection previous transcription tunnel');
    disconnectTranscriptionMessageTunnel();
  }

  console.log('offscreen - creating transcription tunnel');

  portTunnel = chrome.runtime.connect({ name: 'transcribe' });
  portTunnel.onMessage.addListener((msg) => {
    if (msg.status === 'ready') {
      console.log('Transcription message tunnel is ready.');
    } else {
      console.log({ unhandled_request: msg });
    }
  });

  await portTunnel.postMessage({ status: 'ready' });
};

const disconnectTranscriptionMessageTunnel = () => {
  if (portTunnel) {
    // Send disconnect signal to other end - service-worker.
    portTunnel.postMessage({ status: 'disconnect' });
    portTunnel.disconnect();
    portTunnel = undefined;
  }
};

const sendTranscriptionData = async (data) => {
  if (portTunnel) {
    portTunnel.postMessage({ status: 'transcription', data });
  }
};

const record_start = async (streamId, sendResponse) => {
  if (startRecording(streamId, sendTranscriptionData)) {
    // Set offscreen to 'recording' mode
    window.location.hash = 'recording';
    // Setup tunnel to our service-worker to relay transcription data.
    await initTranscriptionMsgChannel();
    sendResponse({ status: 'recording' });
  } else {
    sendResponse({ status: 'error' });
  }
};

const record_stop = async (sendResponse) => {
  if (stopRecording()) {
    window.location.hash = '';
    sendResponse({ status: 'stopped' });
  } else {
    sendResponse({ status: 'error' });
  }

  await disconnectTranscriptionMessageTunnel();
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target === 'offscreen') {
    console.log({ offscreen: request });

    if (request.action === 'start-recording') {
      console.log('record-start-action');
      record_start(request.streamId, sendResponse);

      return true;
    } else if (request.action === 'stop-recording') {
      console.log('record-stop-action');
      record_stop(sendResponse);

      return true;
    } else if (request.action === 'logout') {
      record_stop(sendResponse);
      chrome.storage?.local.remove('dialogue');
      //setTimeout(() => {
      //  const msg =
      //    '\n\nYou have closed suwat.\n\nDiscard current job and Logout?\n\n';
      //  if (window.confirm(msg)) {
      //    record_stop(sendResponse);
      //  }
      //}, 100);
      return true;

    } else if (request.action === 'tab-exists') {
      window.alert('\nSuwat is open in another tab\nClose Suwat in the other tab\n\nTry Again\n\n')
    }
  }
});
