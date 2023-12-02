import React, {
  useEffect,
  useState,
  useCallback,
  useMemo
} from 'react';

import GreetingComponent from '../../containers/Greetings/Greetings';
import HeaderPanelComponent from '../../containers/HeaderPanel/HeaderPanel';

import { AppCtxProvider } from '../../services/AppContext';

import './Sidepanel.css';

const Sidepanel = () => {

  const [lines, setLines] = useState([]);
  const [recordingState, setRecordingState] = useState('Record');
  const [tabId, setTabId] = useState(0);

  // Initialization

  useEffect(() => {

    // Update sidepanel with saved dialogue
    chrome.storage.sync.get('dialogue', o => {
      if (o?.dialogue) {
        setLines(o.dialogue);
      }
    });

    // Listen for transcribe events
    chrome.runtime.onMessage.addListener((
      request,
      sender,
      sendResponse
    ) => {
      if (request.target === 'sidepanel') {
        chrome.storage.sync.get('dialogue', o => {
          if (o?.dialogue) {
            setLines(o.dialogue);
          }
        });
      }
    })

    // component dismount handler
    return () => {
      alert('do you want to exit without saving work?')
    }

  }, []); // one-time setup.

  // updates

  useEffect(() => {

    if (tabId)
      return;

    // Get previous state from storage, otherwise set.
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {

      const tabId = tabs[0].id
      chrome.storage.local.get({tabId, recordState: ''}, o => {

        console.log('get tabId: ' + o.tabId + ', currentTabId: ' + tabId + ', argTabId: ' + tabs[0].id)
        if (o.recordState.length) {

          setRecordingState(o.recordState);

        }

        if (!o.tabId) {
          // Save current state. 
          // Popup may go out of scope but will retain state when viewed later.
          console.log('set tabId: ' + tabId)
          chrome.storage.local.set({tabId, recordState: recordingState});
        }

      });

      setTabId(tabId);
    });

  }, [tabId, recordingState]);
  
  // Toggle recording event

  const toggleRecording = useCallback(async () => {

    await chrome.storage.local.get(['tabId'], async (o) => {

      if (!o.tabId) {
        console.error('tabId is not initialized! Exit.')
        return;
      }

      console.log('send record-action for tabId: ' + o.tabId);
      const response = await chrome.runtime.sendMessage({
        action: 'record-action',
        target: 'background',
        tabId: o.tabId
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
    });
  }, []);

  const contextProvider = useMemo(() => ({
    toggleRecording,
    recordingState
  }), [toggleRecording, recordingState]);

  // Render component

  return (
    <AppCtxProvider value={{contextProvider}}>
      <div className="App">
        <GreetingComponent/>
        <HeaderPanelComponent/>
        <div className="Transcription">
          {lines.length && 
            lines.map(line => (
              <p key={line?.id}>
                {line?.speaker}: {line?.content}
              </p>
            ))
          }
        </div>
      </div>
    </AppCtxProvider>
  );
};

export default Sidepanel;
