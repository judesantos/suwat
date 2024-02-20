import {
  startRecording,
  stopRecording,
  TRANSCRIBE_STATUS
} from '../../services/transcribe-wsocket.js';

let portTunnel = undefined;

const initTranscriptionMsgChannel = async () => {
  if (portTunnel) {
    disconnectTranscriptionMessageTunnel();
  }

  portTunnel = chrome.runtime.connect({ name: 'transcribe' });
  portTunnel.onMessage.addListener((msg) => {
    if (msg.status !== 'ready') {
      console.error({ unhandled_request: msg });
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
  const status = await startRecording(streamId, sendTranscriptionData)
  if (status === TRANSCRIBE_STATUS.SUCCESS) {
    // Set offscreen to 'recording' mode
    window.location.hash = 'recording';
    // Setup tunnel to our service-worker to relay transcription data.
    await initTranscriptionMsgChannel();
    sendResponse({ status: 'recording' });
  } else {
    if (TRANSCRIBE_STATUS.FOREGROUND_INPUT_DEVICE_ERROR) {
      sendResponse({
        status: 'error',
        error: status,
        message: 'Microphone not available!'
      });
    } else {
      sendResponse({
        status: 'error',
        error: status,
        message: 'Setup recording failed!'
      });
    }
  }
};

const record_stop = async (sendResponse) => {
  const status = stopRecording()
  if (status === TRANSCRIBE_STATUS.SUCCESS) {
    window.location.hash = '';
    sendResponse({ status: 'stopped' });
  } else {
      sendResponse({
        status: 'error',
        error: status,
        message: 'Stop recording failed!'
      });
  }

  await disconnectTranscriptionMessageTunnel();
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target === 'offscreen') {
    if (request.action === 'start-recording') {
      record_start(request.streamId, sendResponse);
      return true;
    } else if (request.action === 'stop-recording') {
      record_stop(sendResponse);
      return true;
    } else if (request.action === 'logout') {
      record_stop(sendResponse);
      chrome.storage?.local.remove('dialogue');
      return true;
    } else if (request.action === 'tab-exists') {
      window.alert('\nSuwat is open in another tab\nClose Suwat in the other tab\n\nTry Again\n\n')
    }
  }
});
