
import MicrophoneStream from "microphone-stream";
import { EventStreamMarshaller } from "@aws-sdk/eventstream-marshaller";
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";

import axios from "axios";

// UPDATE THIS ACCORDING TO YOUR BACKEND:
//const backendUrl = "http://localhost:8080/aws-signature";
//const backendUrl = "https://mm13k5qyif.execute-api.us-east-1.amazonaws.com/Prod/preSignedURL";
const backendUrl = "http://localhost:3000/preSignedURL";

let socket = null;
const SAMPLE_RATE = 44100;
//const SAMPLE_RATE = 16000;
let inputSampleRate = undefined;
let sampleRate = SAMPLE_RATE;
let microphoneStream = undefined;
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

const createMicrophoneStream = async (streamId) => {
  microphoneStream = new MicrophoneStream();
  microphoneStream.on("format", (data) => {
    inputSampleRate = data.sampleRate;
  });
  
  const stream = await window.navigator.mediaDevices.getUserMedia({
    video: false,
    //audio: true,
    audio: {
      mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
      }
    }
  })

  // Unmutes audio source
  const context = new AudioContext();
  const ctx_stream = context.createMediaStreamSource(stream);
  ctx_stream.connect(context.destination);

  // set destination recorder
  microphoneStream.setStream(stream);
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
      ":message-type": {
        type: "string",
        value: "event",
      },
      ":event-type": {
        type: "string",
        value: "AudioEvent",
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

const startRecording = async (streamId, sendTranscriptionData) => {

  try {

    if (microphoneStream) {
      stopRecording();
    }

    await createMicrophoneStream(streamId);

    const { data } = await axios.get(backendUrl);

    socket = new WebSocket(data.preSignedURL);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      console.log('socket open')
      microphoneStream.on("data", (rawAudioChunk) => {
        if (socket.readyState === socket.OPEN) {
          const binary = convertAudioToBinaryMessage(rawAudioChunk);
          socket.send(binary);
        }
      });
    };

    socket.onclose = (wa, e) => {
      //callback({status: 499, message: 'Connection closed!', event: e})
      console.log('Socket closed!');
    };


    socket.onmessage = (message) => {

      let messageWrapper = eventStreamMarshaller.unmarshall(Buffer(message.data));
      let messageBody = JSON.parse(String.fromCharCode.apply(String, messageWrapper.body));

      if (messageWrapper.headers[":message-type"].value === "event") {

        let results = messageBody.Transcript?.Results;
        if (results.length && !results[0]?.IsPartial) {

          console.log({new_message: results[0]})
          sendTranscriptionData(results[0].Alternatives[0]);

        }

      }
    };

    socket.onerror = (error) => {
      console.error(error);
    };

  } catch (e) {

    console.log(e)
    return false;
  }

  return true;

};

const stopRecording = () => {

  try {

    if (microphoneStream) {

      microphoneStream.stop();
      microphoneStream.destroy();
      microphoneStream = undefined;

    }

    if (socket) {

      console.log('sending close transcribe event')
      // send empty audio frame to terminate transcription
      socket.send([]);
      socket.close();
      socket = undefined;
    }

  } catch(e) {

    console.error(e);
    return false;

  }

  return true;
};

export {
  startRecording,
  stopRecording
};
