import { Component, createContext } from 'react';
import * as transcript from './transcript.js';
//import icon34 from '../../public/assets/img/icon-34.png';

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
    dialog: {
      type: 'confirm',
      open: false,
      title: '',
      message: '',
      lblBtnConfirm: 'Yes',
      lblBtnCancel: 'Cancel',
      confirm: () => {},
      cancel: () => {}
    }
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
        this.updateState((state) => {
          state.lines = [...state.lines, ...request.data];
        })
      }
    });
  };

  /**
   * Hook - on unload
   */
  componentWillUnmount = () => {
    this.showModalDialog(
      "AppContext componentWillUnmount: Do you want to exit without saving work?",
    );
  };

  stopRecording = () => {
    if (this.state.recordingState.toLowerCase() === 'stop') {
      this.updateState('recording', !this.state.recording);
    }
  };

  isAuthorized = async () => {
    const cookie = await chrome.cookies.get({url:'http://suwat.com', name:'token'});
    return cookie ? true : false;
  }

  /**
   * 
   */
  cleanUp = async () => {
    // clear from db
    console.log('cleanup')
    await chrome.storage.local.remove('dialogue');
    // clear storage model
    console.log('delete transcript')
    transcript.clear();
    // clear local cache
    this.updateState('lines', []);
    this.updateState('selectedMenuItem', 0);
  }

  showAlertDialog = (title, message) => {
    let dlg = {
      type: 'alert',
      open: true,
      title,
      message,
    }
    dlg.confirm = ()=>{};
    // Update!
    this.updateState(state => {
      state.dialog = dlg;
    });

  }

  showModalDialog = (title, message, confirmCb = undefined, cancelCb = undefined) => {
    let dlg = {
      type: 'confirm',
      open: true,
      title,
      message,
      lblBtnConfirm: 'ok',
      lblBtnCancel: 'cancel'
    }
    dlg.confirm = confirmCb ? confirmCb : ()=>{};
    dlg.cancel = cancelCb ? cancelCb : ()=>{};
    // Update!
    this.updateState(state => {
      state.dialog = dlg;
    });
  }
  
  showEditDialog = (lineId, which) => {
    let dlg = {
      type: 'edit',
      open: true,
      lblBtnConfirm: 'Save',
      lblBtnCancel: 'cancel',
      lineId,
      which
    }
    dlg.confirm = ()=>{};
    dlg.cancel = ()=>{};
    // Update!
    this.updateState(state => {
      state.dialog = dlg;
    });
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

    console.log('componentUpdate: ' + this.state.selectedMenuItem)

    switch (this.state.selectedMenuItem) {
      case 4: // settings
        this.updateState('selectedMenuItem', 0)
        break;
      case 3: // delete
        this.updateState('selectedMenuItem', 0)
        if (this.state.lines.length) { 
          this.showModalDialog(
            'Delete Message?',
            'Transcript will be deleted permanently.',
            this.cleanUp
          );
        }
        break;
      case 2: // save
        this.updateState('selectedMenuItem', 0)
        this.showModalDialog(
          'Save transcript?',
          'Transcript will be saved to a file.',
          async () => {
            if (this.state.lines.length) {
              let _lines = [];
              let line = undefined;
              this.state.lines.forEach(item => {
                
                line =item.speakerId + ' [' + new Date(item.timestamp).toLocaleTimeString() +']: ' + item.content; 
                line = line.replace(/^\s*[\r\n]/gm, '');
                if (line && line.length)
                  _lines.push(line);
              });
              const data_string = _lines.join('\n')
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
          }
        );
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
        this.showAlertDialog(
          'Record failed!',
          response.message,
          false
        );
      }

      this.updateState('recordingState', state);
      chrome.storage.local.set({ recordState: state });
    }
  };

  updateState = (prop, value) => {
    if (prop instanceof Function) {
      this.setState((state) => {
        prop(state);
        return state;
      })
      return;
    }
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
          dialog: this.state.dialog,
          setSelectedMenuItem: this.setSelectedMenuItem,
          setPopupItem: this.setPopupItem,
          toggleRecording: this.toggleRecording,
          updateState: this.updateState,
          showEditDialog: this.showEditDialog
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
