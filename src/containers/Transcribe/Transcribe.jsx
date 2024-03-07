import React, { Component, createRef } from 'react';
import HeaderPanelComponent from '../HeaderPanel/HeaderPanel';

import './Transcribe.css';

import AppContext from '../../services/app-context';
import ModalDialog from '../ModalDialog/ModalDialog';

class TranscribePanel extends Component {

  render() {
    return (
      <>
        <TranscribeComponent/>
        <ModalDialog/>
      </>
    )
  }
}

class TranscribeComponent extends Component {
  static contextType = AppContext;

  refSpeakerLines = createRef();

  onMouseClick = (e) => {
    if (e.type === 'click' && this.context.popupMenuItem) {
      this.context.setPopupItem(!this.context.popupMenuItem);
    }
  }

  onLineSelected = (lineId) => {
    this.context.showEditDialog(lineId);
  }

  scrollToTop = () => {
    const scroll =
      this.refSpeakerLines.current.scrollHeight -
      this.refSpeakerLines.current.clientHeight;
    this.refSpeakerLines.current.scrollTo(0, scroll);
  };

  componentWillUnmount() {
  }

  componentDidUpdate() {
    this.scrollToTop();
  }

  // View

  render() {
    const context = this.context;

    return (
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
                      <td 
                        className="Bubble Bubble-background SpeakerStatement"
                        onClick={() => this.onLineSelected(line.id)}
                      >
                        <div
                          className="SpeakerId"
                          style={{ color: line.color }}
                        >
                          {line?.speakerId}
                        </div>
                        {line?.content
                          ?.split('\n')
                          ?.map((para, idx) =>
                            para.length ? <p key={idx}>{para}</p> : <></>
                          )}
                        <div className="time">
                          {new Date(line.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                    )}
                    {line.tag === 'dsk' && (
                      <td 
                        className="Bubble Bubble-foreground SpeakerStatement"
                        onClick={() => this.onLineSelected(line)}
                      >
                        <div
                          className="SpeakerId"
                          style={{ color: line.color }}
                        >
                          {line?.speakerId}
                        </div>
                        {line?.content
                          ?.split('\n')
                          ?.map((para, idx) =>
                            para.length ? <p key={idx}>{para}</p> : <></>
                          )}
                        <div className="time">
                          {new Date(line.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <HeaderPanelComponent className="Panel" />
      </>
    );
  }
}

export default TranscribePanel;
