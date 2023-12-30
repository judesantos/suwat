import React, { Component, createRef } from 'react';
import HeaderPanelComponent from '../HeaderPanel/HeaderPanel';

import './Transcribe.css';

//import { AppCtxConsumer } from '../../services/AppContext';
import AppContext from '../../services/AppContext';

class TranscribeComponent extends Component {
  static contextType = AppContext;

  refSpeakerLines = createRef();

  onMouseClick = (e) => {
    if (e.type === 'click' && this.context.popupMenuItem) {
      this.context.setPopupItem(!this.context.popupMenuItem);
    }
  };

  scrollToTop = () => {
    const scroll =
      this.refSpeakerLines.current.scrollHeight -
      this.refSpeakerLines.current.clientHeight;
    this.refSpeakerLines.current.scrollTo(0, scroll);
  };

  componentWillUnmount() {
    alert('transcription will unmount');
  }

  componentDidUpdate() {
    this.scrollToTop();
  }

  // View

  render() {
    const context = this.context;

    return (
      <>
        {context && (
          <>
            <div
              className="Transcription"
              ref={this.refSpeakerLines}
              onClick={this.onMouseClick}
            >
              <table className="SpeakerLines">
                <tbody>
                  {context.lines.length > 0 &&
                    context.lines.map((line) => (
                      <tr key={line?.id} className="SpeakerLine">
                        {line.tag === 'brw' && (
                          <>
                            <td className="Bubble Bubble-background SpeakerStatement">
                              <div
                                className="SpeakerId"
                                style={{ color: line.color }}
                              >
                                {line?.speakerId}
                              </div>
                              {line?.content
                                ?.split('\n')
                                ?.map((para, idx) =>
                                  para.length ? <p>{para}</p> : <></>
                                )}
                              <div class="time">
                                {new Date(line.timestamp).toLocaleTimeString()}
                              </div>
                            </td>
                          </>
                        )}
                        {line.tag === 'dsk' && (
                          <>
                            <td className="Bubble Bubble-foreground SpeakerStatement">
                              <div
                                className="SpeakerId"
                                style={{ color: line.color }}
                              >
                                {line?.speakerId}
                              </div>
                              {line?.content
                                ?.split('\n')
                                ?.map((para, idx) =>
                                  para.length ? <p>{para}</p> : <></>
                                )}
                              <div className="time">
                                {new Date(line.timestamp).toLocaleTimeString()}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <HeaderPanelComponent className="Panel" />
          </>
        )}
      </>
    );
  }
}

export default TranscribeComponent;
