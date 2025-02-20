import React, { useEffect, useState } from 'react';
import GreetingComponent from '../../containers/Greetings/Greetings';
import './Popup.css';

const Popup = () => {
  const [recordingState, setRecordingState] = useState('Record');
  const [tabId, setTabId] = useState({});

  useEffect(() => {
    // Get previous state from storage, otherwise set.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      chrome.sidePanel.open({ tabId });
      chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: true,
      });

      chrome.storage.local.get({ tabId, recordState: '' }, (o) => {
        if (o.recordState.length) {
          setRecordingState(o.recordState);
        } else {
          // Save current state.
          // Popup may go out of scope but will retain state when viewed later.
          chrome.storage.local.set({
            tabId: tabId,
            recordState: recordingState,
          });
        }

        setTabId(tabId);
      });
    });
  });

  const toggleRecording = async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'record-action',
      target: 'background',
      tabId,
    });

    if (response) {
      let state = '';
      if (response.status === 'recording') state = 'Stop';
      else if (response.status === 'stopped') state = 'Record';

      chrome.storage.local.set({ recordState: state });

      setRecordingState(state);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <button className="App-record-action" onClick={toggleRecording}>
          {recordingState}
        </button>
      </header>
      <GreetingComponent />
    </div>
  );
};

export default Popup;
