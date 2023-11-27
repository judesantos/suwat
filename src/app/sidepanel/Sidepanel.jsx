import React, { useEffect, useState } from 'react';
import GreetingComponent from '../../containers/Greetings/Greetings';
import './Sidepanel.css';

const Sidepanel = () => {
  const [conversation, setConversation] = useState([]);

  useEffect(() => {
    chrome.runtime.onMessage.addListener((request) => {
      if (request.target !== 'sidepanel')
        return;
      console.log(request.data.Transcript)
      const updated = [
        ...conversation, 
        {
          id: request.data.ResultId,
          data: request.data.Transcript
        }
      ];
      setConversation(updated);
    })
  });
  
  return (
    <div className="App">
      <GreetingComponent/>
      <div className="Transcription">
        {conversation.map(conv => (
          <p key={conv.id}>
            {conv.data}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Sidepanel;
