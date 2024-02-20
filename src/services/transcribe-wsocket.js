import MicrophoneStream from 'microphone-stream';
import { EventStreamMarshaller } from '@aws-sdk/eventstream-marshaller';
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node';

import axios from 'axios';

const TRANSCRIBE_STATUS = {
  SUCCESS: 0,
  FOREGROUND_SESSION_ERROR: 1,
  BACKGROUND_SESSION_ERROR: 2,
  FOREGROUND_INPUT_DEVICE_ERROR: 3,
  BACKGROUND_INPUT_DEVICE_ERROR: 4,
  SOCKET_STREAM_ERROR: 5
};

// UPDATE THIS ACCORDING TO YOUR BACKEND:
//const backendUrl = "http://localhost:8080/aws-signature";
const backendUrl = "https://m9ozmudw1d.execute-api.us-east-1.amazonaws.com/Prod/preSignedURL/";
//const backendUrl = 'http://localhost:3000/preSignedURL';

const SAMPLE_RATE = 44100;
//const SAMPLE_RATE = 16000;
let inputSampleRate = undefined;
let sampleRate = SAMPLE_RATE;

let socketTabAudioStream = undefined;
let socketDesktopMicStream = undefined;
let tabAudioStream = undefined;
let desktopMicStream = undefined;

const eventStreamMarshaller = new EventStreamMarshaller(toUtf8, fromUtf8);

const pcmEncode = (input) => {
  var offset = 0;
  var buffer = new ArrayBuffer(input.length * 2);
  var view = new DataView(buffer);
  for (var i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
};

const createAudioStream = async (streamId = null) => {
  let audioStream = new MicrophoneStream();
  audioStream.on('format', (data) => {
    inputSampleRate = data.sampleRate;
  });

  let stream;

  if (streamId) {
    // Tab stream
    stream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    // Unmutes audio source
    const context = new AudioContext();
    const ctx_stream = context.createMediaStreamSource(stream);
    ctx_stream.connect(context.destination);
  } else {
    // Desktop user microphone
    stream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
  }

  // set destination recorder
  audioStream.setStream(stream);

  return audioStream;
};

const downsampleBuffer = (
  buffer,
  inputSampleRate = SAMPLE_RATE,
  //outputSampleRate = 16000
  outputSampleRate = 44100
) => {
  if (outputSampleRate === inputSampleRate) {
    return buffer;
  }

  var sampleRateRatio = inputSampleRate / outputSampleRate;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Float32Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;

  while (offsetResult < result.length) {
    var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

    var accum = 0,
      count = 0;

    for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
};

const getAudioEventMessage = (buffer) => {
  return {
    headers: {
      ':message-type': {
        type: 'string',
        value: 'event',
      },
      ':event-type': {
        type: 'string',
        value: 'AudioEvent',
      },
    },
    body: buffer,
  };
};

const convertAudioToBinaryMessage = (audioChunk) => {
  let raw = MicrophoneStream.toRaw(audioChunk);

  if (raw == null) return;

  let downsampledBuffer = downsampleBuffer(raw, inputSampleRate, sampleRate);
  let pcmEncodedBuffer = pcmEncode(downsampledBuffer);

  let audioEventMessage = getAudioEventMessage(Buffer.from(pcmEncodedBuffer));

  let binary = eventStreamMarshaller.marshall(audioEventMessage);

  return binary;
};

const createSocketStreamer = async (
  streamSource,
  webSocketCreator,
  returnTranscriptionDataCB,
  label
) => {
  /*
   * Setup websocket. Send partial streams from the audio sources.
   */
  const { data } = await axios.get(backendUrl);

  let webSocket = webSocketCreator(data);
  webSocket.binaryType = 'arraybuffer';

  webSocket.onopen = () => {
    streamSource.on('data', (rawAudioChunk) => {
      if (webSocket.readyState === WebSocket.OPEN) {
        const binary = convertAudioToBinaryMessage(rawAudioChunk);
        webSocket.send(binary);
      }
    });
  };

  webSocket.onclose = (wa, e) => {
    console.log('Socket closed!');
  };

  webSocket.onmessage = (message) => {
    const tag = label;

    let messageWrapper = eventStreamMarshaller.unmarshall(Buffer(message.data));
    let messageBody = JSON.parse(
      String.fromCharCode.apply(String, messageWrapper.body)
    );

    if (messageWrapper.headers[':message-type'].value === 'event') {
      let results = messageBody.Transcript?.Results;
      if (results.length && !results[0].IsPartial) {
        const result = results[0];
        const data = {
          tag,
          timestamp: Date.now(),
          resultId: result.ResultId,
          channelId: result.ChannelId,
          items: result.Alternatives[0].Items,
          transcript: result.Alternatives[0].Transcript,
        };
        returnTranscriptionDataCB(data);
      }
    }
  };

  webSocket.onerror = (error) => {
    console.error('websocket onError event.');
    console.error(error);
  };
};

/**
 *
 * @param {*} streamId
 * @param {*} returnTranscriptionDataCB
 * @returns
 */
const startRecording = async (streamId, returnTranscriptionDataCB) => {
  if (tabAudioStream || desktopMicStream) {
    stopRecording();
  }

  /*
   * Create dual channel audio source
   */

  try {
    // Browser tab specific source - google meet, messenger for example.
    //
    tabAudioStream = await createAudioStream(streamId);

  } catch (e) {

    console.error(e);
    return TRANSCRIBE_STATUS.BACKGROUND_INPUT_DEVICE_ERROR;

  }

  try {
    // System microphone - laptop participant(s)
    //
    desktopMicStream = await createAudioStream();

  } catch (e) {

    stopRecording();

    console.error(e);
    return TRANSCRIBE_STATUS.FOREGROUND_INPUT_DEVICE_ERROR;

  }

  try {

    await createSocketStreamer(
      tabAudioStream,
      (data) => {
        return (socketTabAudioStream = new WebSocket(data.preSignedURL));
      },
      returnTranscriptionDataCB,
      `brw`
    );

    await createSocketStreamer(
      desktopMicStream,
      (data) => {
        return (socketDesktopMicStream = new WebSocket(data.preSignedURL));
      },
      returnTranscriptionDataCB,
      `dsk`
    );

    } catch(e) {

      stopRecording()

      console.error(e);
      return TRANSCRIBE_STATUS.SOCKET_STREAM_ERROR;
    }

  return TRANSCRIBE_STATUS.SUCCESS;
};

/**
 *
 * @returns
 */
const stopRecording = () => {

  try {

    if (tabAudioStream) {
      tabAudioStream.stop();
      tabAudioStream.destroy();
      tabAudioStream = undefined;
    }

    if (socketTabAudioStream) {
      // send empty audio frame to terminate transcription
      socketTabAudioStream.send([]);
      socketTabAudioStream.close();
      socketTabAudioStream = undefined;
    }

  } catch (e) {

    console.error(e);
    return TRANSCRIBE_STATUS.BACKGROUND_SESSION_ERROR;
  }

  try {

    if (desktopMicStream) {
      desktopMicStream.stop();
      desktopMicStream.destroy();
      desktopMicStream = undefined;
    }

    if (socketDesktopMicStream) {
      // send empty audio frame to terminate transcription
      socketDesktopMicStream.send([]);
      socketDesktopMicStream.close();
      socketDesktopMicStream = undefined;
    }
  } catch (e) {
    
    console.error(e);
    return TRANSCRIBE_STATUS.FOREGROUND_SESSION_ERROR;
  }

  return TRANSCRIBE_STATUS.SUCCESS;
};

export { startRecording, stopRecording, TRANSCRIBE_STATUS };
