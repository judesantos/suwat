import { Component, createContext } from 'react';
import * as transcript from './transcript.js';

const RECORD_IDLE_TIMEOUT = 1000 * 60 * 0.5; // 30 seconds
const AppContext = createContext();

class AppCtxProvider extends Component {

  recordIdleTimeout = undefined;
  state = {
    tabId: 0,
    lines: [],
    recordingState: 'Record',
    recording: false,
    popupMenuItem: false,
    selectedMenuItem: 0,
  };

  /**
   * Hook - on load
   */
  componentDidMount = () => {
    // Get previous state from storage, otherwise set.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;
      chrome.storage.local.get({ tabId, recordState: '' }, (o) => {
        console.log(
          'get tabId: ' +
            o.tabId +
            ', currentTabId: ' +
            tabId +
            ', argTabId: ' +
            tabs[0].id
        );
        if (o.recordState.length) {
          this.updateState('recordingState', o.recordState);
        }

        if (!o.tabId) {
          // Save current state.
          // Popup may go out of scope but will retain state when viewed later.
          console.log('set tabId: ' + tabId);
          chrome.storage.local.set({
            tabId,
            recordState: this.state.recordingState,
          });
        }
      });

      this.updateState('tabId', tabId);
    });

    // Listen for transcribe events
    chrome.runtime.onMessage.addListener((request) => {
      if (request.target === 'sidepanel') {
        // restart idle timer
        this.resetTimeout();
        // update lines
        console.log({sidePanelUpdateLines: request})
        this.setState(state => ({...state, lines: [...state.lines, ...request.data]}))
        //chrome.storage.local.get('dialogue', (o) => {
        //  if (o?.dialogue) {
        //    console.log({ new_dialog: o.dialogue });
        //    this.setState((state) => (state.lines = o.dialogue));
        //  }
        //});
      }
    });
  };

  /**
   * Hook - on unload
   */
  componentWillUnmount = () => {
    alert(
      'AppContext componentWillUnmount: Do you want to exit without saving work?'
    );
  };

  stopRecording = () => {
    if (this.state.recordingState.toLowerCase() === 'stop') {
      //this.updateState('recordingState', !this.state.recordingState);
      this.updateState('recording', !this.state.recording);
    }
  };

  /**
   * Hook - State change update
   */
  componentDidUpdate = async () => {
    console.log('componentDidUpdate')
    switch (this.state.selectedMenuItem) {
      case 4:
        console.log('settings command');
        break;
      case 3:
        console.log('delete command');
        if (this.state.lines.length && window.confirm('Delete current job?')) {
          console.log('deleting...')
          // clear from db
          await chrome.storage.local.remove('dialogue');
          // clear storage model
          transcript.clear();
          // clear local cache
          this.updateState('lines', []);
          this.updateState('selectedMenuItem', 0);
          setTimeout(() => {
            console.log({state_after_delete: this.state})
          }, 1000)
        }
        break;
      case 2:
        console.log('save command');
        break;
      case 1:
        console.log('edit command');
        break;
      default:
        break;
    }
  };

  /**
   * Idle timer. Stop recording when no more activity 
   * Idle time to expire: RECORD_IDLE_TIMEOUT
   */
  setTimeout = () => {
    this.recordIdleTimeout = setTimeout(() => {
      console.log('Connection idle for ' + RECORD_IDLE_TIMEOUT / 1000 + ' seconds. Disconnecting...')
      this.toggleRecording()
      this.recordIdleTimeout = undefined;
    }, RECORD_IDLE_TIMEOUT);
  }

  /**
   * Reset timer everytime we detect activity.
   */
  resetTimeout = () => {
    if (this.recordIdleTimeout) {
      clearTimeout(this.recordIdleTimeout);
    }
    this.setTimeout();
  }

  toggleRecording = async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'record-action',
      target: 'background',
      tabId: this.state.tabId,
    });

    if (response) {
      let state = '';
      if (response.status === 'recording') {
        state = 'Stop';
        this.updateState('recording', true);
        // set timeout
        this.setTimeout();
      } else if (response.status === 'stopped') {
        // Stop timer
        clearTimeout(this.recordIdleTimeout);
        // update states
        state = 'Record';
        this.updateState('recording', false);
      }

      this.updateState('recordingState', state);
      chrome.storage.local.set({ recordState: state });
    }
  };

  updateState = (prop, value) => {
    this.setState((state) => {
      state[prop] = value;
      return state;
    });
  };

  setPopupItem = (newVal) => {
    this.updateState('popupMenuItem', newVal);
  };

  setSelectedMenuItem = (newVal) => {
    this.updateState('selectedMenuItem', newVal);
  };

  render() {
    return (
      <AppContext.Provider
        value={{
          tabId: this.state.tabId,
          lines: this.state.lines,
          recordingState: this.state.recordingState,
          recording: this.state.recording,
          popupMenuItem: this.state.popupMenuItem,
          selectedMenuItem: this.state.selectedMenuItem,
          setSelectedMenuItem: this.setSelectedMenuItem,
          setPopupItem: this.setPopupItem,
          toggleRecording: this.toggleRecording,
          updateState: this.updateState,
        }}
      >
        {this.props.children}
      </AppContext.Provider>
    );
  }
}

const AppCtxConsumer = AppContext.Consumer;

export default AppContext;

export { AppCtxProvider, AppCtxConsumer };
