import { Component, createContext } from 'react';
import * as transcript from './transcript.js';
import icon34 from '../../public/assets/img/icon-34.png';

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
        if (o.recordState.length) {
          this.updateState('recordingState', o.recordState);
        }

        if (!o.tabId) {
          // Save current state.
          // Popup may go out of scope but will retain state when viewed later.
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
        this.setState(state => ({...state, lines: [...state.lines, ...request.data]}))
      }
    });
  };

  /**
   * Hook - on unload
   */
  componentWillUnmount = () => {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: icon34,
      silent: false,
      message: "AppContext componentWillUnmount: Do you want to exit without saving work?",
    });
  };

  stopRecording = () => {
    if (this.state.recordingState.toLowerCase() === 'stop') {
      //this.updateState('recordingState', !this.state.recordingState);
      this.updateState('recording', !this.state.recording);
    }
  };

  isAuthorized = async () => {
    const cookie = await chrome.cookies.get({url:'http://suwat.com', name:'token'});
    return cookie ? true : false;
  }

  /**
   * Hook - State change update
   */
  componentDidUpdate = async () => {

    if (this.state.selectedMenuItem && !this.isAuthorized()) {
      // Logout
      chrome.runtime.connect({ name: 'sidepanel' });
      return;
    } 

    switch (this.state.selectedMenuItem) {
      case 4: // settings
        this.updateState('selectedMenuItem', 0)
        break;
      case 3: // delete
        this.updateState('selectedMenuItem', 0)
        if (this.state.lines.length && window.confirm('Delete current job?')) {
          // clear from db
          await chrome.storage.local.remove('dialogue');
          // clear storage model
          transcript.clear();
          // clear local cache
          this.updateState('lines', []);
          this.updateState('selectedMenuItem', 0);
        }
        break;
      case 2: // save
        this.updateState('selectedMenuItem', 0)
        await chrome.storage.local.get('dialogue', (obj) => {
          if (obj?.dialogue.length) {
            let lines = []
            obj.dialogue.forEach(item => {
              lines.push(item.speakerId + ': ' + item.content) 
            });
            const data_string = lines.join('\n')
            const blob = new Blob([data_string], {type: 'text/plain'})
            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = window.URL.createObjectURL(blob)
            const date = new Date()
            a.download = 'transcript_' + date.toISOString() + '.txt'
            document.body.appendChild(a);
            a.click()
            URL.revokeObjectURL(a.href)
            document.body.removeChild(a)
          }
        });
        break;
      case 1: // edit
        this.updateState('selectedMenuItem', 0)
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
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: icon34,
          silent: false,
          title: response.message,
          message: "Check settings and permissions",
        });
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
