import React, { useEffect, useState } from 'react';

import GreetingComponent from '../../containers/Greetings/Greetings.jsx';
import SignInComponent from '../../containers/SignIn/SignIn.jsx';

import './Sidepanel.css';

import { AppCtxProvider } from '../../services/app-context.js';
import TranscribePanel from '../../containers/Transcribe/Transcribe.jsx';

const Sidepanel = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [backgroundPort, setBackgroundPort] = useState(undefined);

  useEffect(() => {
    // Keeps service-worker aware of our existence.
    // Sends disconnect signal on sidepanel reload event.
    if (!backgroundPort) {
      const port = chrome.runtime.connect({ name: 'sidepanel' });
      setBackgroundPort(port);

      port.onMessage.addListener((msg) => {
        if (msg.action === 'sign-in') {
          if (msg.status === 'success') {
            // Hide login form and go to main screen.
            setLoggedIn(true);
          } else {
            console.error('Login failed! ' + msg.msg);
          }
        }
      });

    } else {
      console.log('connection exists');
    }

    return () => {
      // component unload event
    };
  }, []);

  const login = () => {
    try {

      if (!backgroundPort) {
        console.error('Tunnel port is not ready. Abort!');
        return;
      }

      backgroundPort.postMessage({
        action: 'sign-in',
        target: 'background',
      });
    } catch (e) {
      console.error({ error: e });
    }
  };

  const isAuthorized = async () => {
      const cookie = await chrome.cookies.get({url:'http://suwat.com', name:'token'});
      if (cookie) {
        setLoggedIn(true)
      }
      
  }
  // Auto-login if pre-authed
  isAuthorized()
  // Render component
  return (
    <AppCtxProvider>
      <div className="App">
        <GreetingComponent />
        {loggedIn ? <TranscribePanel /> : <SignInComponent login={login} />}
      </div>
    </AppCtxProvider>
  );
};

export default Sidepanel;
