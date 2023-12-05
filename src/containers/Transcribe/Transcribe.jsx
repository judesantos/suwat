import React, { Component } from 'react';
import HeaderPanelComponent from '../HeaderPanel/HeaderPanel';

import './Transcribe.css';

//import { AppCtxConsumer } from '../../services/AppContext';
import AppContext from '../../services/AppContext';

class TranscribeComponent extends Component {

  static contextType = AppContext;

  onMouseClick = (e) => {
    if (e.type ==='click' && this.context.popupMenuItem) {
      this.context.setPopupItem(!this.context.popupMenuItem);
    }
  }

  componentWillUnmount() {
    alert('transcription will unmount')
  }

  // View

  render() {

    const context = this.context;

    return (
      <>
        {context && (
          <>
            <div className="Transcription" onClick={this.onMouseClick}>
              <table className='SpeakerLines'>
              {context.lines.length > 0 && 
                context.lines.map(line => (
                  <tr key={line?.id} className='SpeakerLine'>
                    <td className='SpeakerId' style={{color:line.color}}>
                      {line?.speakerId}
                    </td>
                    <td className='SpeakerStatement'>
                      {line?.content}
                    </td>
                  </tr>
                ))
              }
              </table>
            </div>
            <HeaderPanelComponent className='Panel'/>
          </>
        )}
      </>
    );
  }
}

export default TranscribeComponent;
