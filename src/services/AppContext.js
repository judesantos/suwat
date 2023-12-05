import { Component, createContext } from 'react';
import * as transcript from './transcript.js';

const AppContext = createContext();

class AppCtxProvider extends Component {

  state = {
    tabId: 0,
    lines: [],
    recordingState: 'Record',
    recording: false,
    popupMenuItem: false,
    selectedMenuItem: 0,
  }

  /**
   * Hook - on load 
   */
  componentDidMount = () => {

    // Get previous state from storage, otherwise set.
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {

      const tabId = tabs[0].id
      chrome.storage.sync.get({tabId, recordState: ''}, o => {

        console.log('get tabId: ' + o.tabId + ', currentTabId: ' + tabId + ', argTabId: ' + tabs[0].id)
        if (o.recordState.length) {

          this.updateState('recordingState', o.recordState);

        }

        if (!o.tabId) {
          // Save current state. 
          // Popup may go out of scope but will retain state when viewed later.
          console.log('set tabId: ' + tabId)
          chrome.storage.sync.set({tabId, recordState: this.state.recordingState});
        }

      });

      this.updateState('tabId', tabId);
    });

    // Listen for transcribe events
    chrome.runtime.onMessage.addListener(request => {

      if (request.target === 'sidepanel') {

        chrome.storage.sync.get('dialogue', o => {
          if (o?.dialogue) {
            this.setState(state => state.lines = o.dialogue);
          }
        });

      }
    })
  }

  /**
   * Hook - on unload 
   */
  componentWillUnmount = () => {
    alert('AppContext componentWillUnmount: Do you want to exit without saving work?')
  }

  stopRecording = () => {
    if (this.state.recordingState.toLowerCase() === 'stop') {
      //this.updateState('recordingState', !this.state.recordingState);
      this.updateState('recording', !this.state.recording);
    }
  }

  /**
   * Hook - State change update
   */
  componentDidUpdate = () => {

    switch (this.state.selectedMenuItem) {
      case 4:
        console.log('settings command');
        break;
      case 3:
        console.log('delete command');
        if (
          this.state.lines.length &&
          window.confirm('Delete current job?')
        ) {
          // clear from db
          chrome.storage.sync.remove('dialogue')
          // clear storage model
          transcript.clear();
          // clear local cache
          this.updateState('lines', [])
          this.updateState('selectedMenuItem', 0)
        }
        break;
      case 2:
        console.log('save command')
        break;
      case 1:
        console.log('edit command')
        break;
      default:
        break;
    }
  }

  toggleRecording = async () => {

    const response = await chrome.runtime.sendMessage({
      action: 'record-action',
      target: 'background',
      tabId: this.state.tabId
    });

    if (response) {
      let state = '';
      if (response.status === 'recording') {
        state = 'Stop';
        this.updateState('recording', true);
      } else if (response.status === 'stopped') {
        state = 'Record';
        this.updateState('recording', false);
      }

      this.updateState('recordingState',  state);
      chrome.storage.sync.set({recordState: state});
    }
  }
  
  updateState = (prop, value) => {
    this.setState(state => {
      state[prop] = value;
      return state;
    });
  }

  setPopupItem = (newVal) => {
    this.updateState('popupMenuItem', newVal);
  }

  setSelectedMenuItem = (newVal) => {
    this.updateState('selectedMenuItem', newVal);
  }

  render() {

    return (

      <AppContext.Provider value={{
        tabId: this.state.tabId,
        lines: this.state.lines,
        recordingState: this.state.recordingState,
        recording: this.state.recording,
        popupMenuItem: this.state.popupMenuItem,
        selectedMenuItem: this.state.selectedMenuItem,
        setSelectedMenuItem: this.setSelectedMenuItem,
        setPopupItem: this.setPopupItem,
        toggleRecording: this.toggleRecording,
        updatetate: this.updateState
      }}>
        {this.props.children}
      </AppContext.Provider>

    )
  }
}

const AppCtxConsumer = AppContext.Consumer

export default AppContext

export {
  AppCtxProvider,
  AppCtxConsumer
}