import React, { useEffect, useState } from 'react';
import GreetingComponent from '../../containers/Greetings/Greetings';
import './Popup.css';

const Popup = () => {

  const [recordingState, setRecordingState] = useState('Record'); 
  const [tabId, setTabId] = useState({});

  useEffect(() => {

    // Get previous state from storage, otherwise set.
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      const tabId = tabs[0].id;
      console.log('tabId: ' + tabId);
      chrome.storage.local.get({tabId, recordState: ''}, o => {
        if (o.recordState.length) {
          setRecordingState(o.recordState);
        } else {
          chrome.storage.local.set({tabId: tabId, recordState: recordingState});
        }
        setTabId(tabId);
      });
    });

  });

  const startRecording = async () => {

    const response = await chrome.runtime.sendMessage({
      action: 'record-action',
      target: 'background',
      tabId
    });
    if (response) {
      let state = '';
      if (response.status === 'recording')
        state = 'Stop';
      else if (response.status === 'stopped')
        state = 'Record';
      chrome.storage.local.set({recordState: state});
      setRecordingState(state);
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <button className="App-record-action" onClick={startRecording}>
           {recordingState} 
        </button>
      </header>
      <GreetingComponent />
    </div>
  );
};

export default Popup;
