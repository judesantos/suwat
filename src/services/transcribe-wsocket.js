import MicrophoneStream from 'microphone-stream';
import { EventStreamMarshaller } from '@aws-sdk/eventstream-marshaller';
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node';

import axios from 'axios';

// UPDATE THIS ACCORDING TO YOUR BACKEND:
//const backendUrl = "http://localhost:8080/aws-signature";
//const backendUrl = "https://m9ozmudw1d.execute-api.us-east-1.amazonaws.com/Prod/preSignedURL/";
const backendUrl = 'http://localhost:3000/preSignedURL';

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
    console.log('socket open');
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
        console.log({ ...result });

        const data = {
          tag,
          timestamp: Date.now(),
          resultId: result.ResultId,
          channelId: result.ChannelId,
          items: result.Alternatives[0].Items,
          transcript: result.Alternatives[0].Transcript,
        };
        console.log({ onMessage: data });
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

  try {
    /*
     * Create dual channel audio source
     */

    // Browser tab specific source - google meet, messenger for example.
    tabAudioStream = await createAudioStream(streamId);

    console.log('creating background stream');

    await createSocketStreamer(
      tabAudioStream,
      (data) => {
        return (socketTabAudioStream = new WebSocket(data.preSignedURL));
      },
      returnTranscriptionDataCB,
      `brw`
    );
    console.log('created background stream');
  } catch (e) {
    console.log('startRecording create background stream exception:');
    console.error(e);
    return false;
  }

  try {
    // System microphone - laptop participant(s)
    desktopMicStream = await createAudioStream();

    console.log('creating foreground stream');

    await createSocketStreamer(
      desktopMicStream,
      (data) => {
        return (socketDesktopMicStream = new WebSocket(data.preSignedURL));
      },
      returnTranscriptionDataCB,
      `dsk`
    );

    console.log('created foreground stream');
  } catch (e) {
    console.log('startRecording create foreground stream exception:');
    console.error(e);
    return false;
  }

  return true;
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

    if (desktopMicStream) {
      desktopMicStream.stop();
      desktopMicStream.destroy();
      desktopMicStream = undefined;
    }

    if (socketTabAudioStream) {
      // send empty audio frame to terminate transcription
      console.log('sending close transcribe event for socketTabAudioStream');
      socketTabAudioStream.send([]);

      socketTabAudioStream.close();
      socketTabAudioStream = undefined;
    }

    if (socketDesktopMicStream) {
      // send empty audio frame to terminate transcription
      console.log('sending close transcribe event for socketDesktopMicStream');
      socketDesktopMicStream.send([]);

      socketDesktopMicStream.close();
      socketDesktopMicStream = undefined;
    }
  } catch (e) {
    console.log('stopRecording exception:');
    console.error(e);
    return false;
  }

  return true;
};

export { startRecording, stopRecording };
