'use strict';

let dialogue = []; // stack of conversation lines

/**
 * Process conversation. 
 * Each speaker line separately.
 * 
 * @param {*} data 
 */
const processJob = (data) => {
  
  const id = data.resultId;
  let spkrPrefix = data.tag + '_' + data.channelId;

  let currSpeaker = undefined;
  let line = undefined;
  let lines = [];

  for (const item of data.items) {

    if (line && item?.Type === 'punctuation') {
      line.content += item.Content;
      continue;
    }

    const speaker = spkrPrefix + '_' + item.Speaker;

    if (currSpeaker !== speaker) {
      // Current line is done
      if (line) {
        // push to stack
        lines = [...lines, line];
        line = undefined;
      }
      // Setup next line with new speaker
      currSpeaker = speaker;
      line = {
        id: id + item.StartTime,
        startTime: item.StartTime,
        speaker: currSpeaker,
        content: ''
      };
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

//const getBottomItem = () => {
//  return dialogue[dialogue.length-1];
//}

const length = () => {
  return dialogue.length;
}

export {
  processJob,
  getDialogue,
  getDialogueRef,
  getTopItem,
  //getBottomItem,
  length
}

