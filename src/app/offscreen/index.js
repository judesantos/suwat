import { startRecording, stopRecording } from '../../services/transcribe-wsocket.js';

let port = undefined;

const initTranscriptionMsgChannel = async () => {
  
  port = chrome.runtime.connect({name: 'transcribe'});
  port.onMessage.addListener(msg => {

    if (msg.status === 'ready') {

      console.log("Transcription message tunnel is ready.")

    } else {

      console.log({unhandled_request: msg})
    }
  });

  await port.postMessage({status: 'ready'});

}

const sendTranscriptionData = async (data) => {
  if (port) {
    port.postMessage({status: 'transcription', data});
  }
}

const record_start = async (streamId, sendResponse) => {
  
  if (startRecording(streamId, sendTranscriptionData)) {

    // Set offscreen to 'recording' mode
    window.location.hash = 'recording';
    // Setup tunnel to our ui sidpanel to receive transcription data.
    await initTranscriptionMsgChannel();
    sendResponse({status: 'recording'})

  } else {

    sendResponse({status: 'error'})
  }
}

const record_stop = async (sendResponse) => {

  if (stopRecording()) {

    window.location.hash = '';
    sendResponse({status: 'stopped'})

  } else {

    sendResponse({status: 'error'})
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.target === 'offscreen') {

    console.log({content_js: request})

    if (request.action === 'start-recording') {

      console.log('record-start-action')
      record_start(request.streamId, sendResponse);
      return true;

    } else if (request.action === 'stop-recording') {

      console.log('record-stop-action')
      record_stop(sendResponse);
      return true;
    }
  } 

});
