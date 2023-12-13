let dialogue = []; // stack of conversation lines
let speakerIds = new Map();

let currSpeaker = undefined;

const randomColor = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

/**
 *  Return the short-id of a unique speaker in the dialogue.
 * 
 * @param string speaker - full length code of a unique speaker in a dialogue
 * @returns {speakerId, color}
 */
const getSpeakerId = (speaker) => {

  let speakerObj = undefined;

  if (speakerIds.has(speaker)) {
    speakerObj = speakerIds.get(speaker);
  } else {
    const speakerId = 'sp' + (speakerIds.size + 1).toString();
    const color = randomColor();
    speakerObj = {speakerId, color};
    speakerIds.set(speaker, speakerObj);
  }
return speakerObj;
}

/**
 * Process conversation. 
 * Each speaker line separately.
 * 
 * @param {*} data 
 */
const processJob = (data) => {
  
  let spkrPrefix = data.tag + '_' + data.channelId;

  let line = undefined;
  let lines = [];

  for (const item of data.items) {

    if (line && item?.Type === 'punctuation') {
      line.content += item.Content;
      continue;
    }

    const speaker = spkrPrefix + '_' + item.Speaker;

    if (undefined === currSpeaker || currSpeaker !== speaker) {
      // Current line is done
      if (line) {
        // push to stack
        lines = [...lines, line];
        line = undefined;
      }
      // Setup next line with new speaker
      currSpeaker = speaker;
      const spkObj = getSpeakerId(currSpeaker);

      line = {
        tag: data.tag,
        id: data.timestamp + item.StartTime,
        timestamp: data.timestamp,
        speakerId: spkObj.speakerId,
        color: spkObj.color,
        speaker,
        startTime: item.StartTime,
        content: ''
      };

    } else {
      // Same speaker as the last dialog line.
      // Get the last line from the cache and append content.
      if (!line && dialogue.length) {
        line = dialogue.pop();
        line.content += '\n\n'; // new paragraph
      }
    }

    line.content += (line.content.length ? ' ' : '') + item.Content;
  }
  if (line) {
    // Save last line from current transcript.
    lines = [...lines, line];
  }
 
  dialogue = [...dialogue, ...lines];
  return lines;
}

/**
 * 
 * @returns copy of internal dialog object 
 */
const getDialogue = () => {
  // Return copy
  return [...dialogue];
}

/**
 * @returns reference of internal dialog object
 */
const getDialogueRef = () => {
  return dialogue;
}

const getTopItem = () => {
  return dialogue[dialogue.length-1];
}

const length = () => {
  return dialogue.length;
}

const clear = () => {
  dialogue = [];
}

export {
  processJob,
  getDialogue,
  getDialogueRef,
  getTopItem,
  clear,
  length
}

