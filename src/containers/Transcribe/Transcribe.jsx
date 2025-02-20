import React, { Component, createRef } from 'react';
import HeaderPanelComponent from '../HeaderPanel/HeaderPanel';

import './Transcribe.css';

import AppContext from '../../services/app-context';
import ModalDialog from '../ModalDialog/ModalDialog';

class TranscribePanel extends Component {

  render() {
    return (
      <>
        <ModalDialog/>
        <TranscribeComponent/>
      </>
    )
  }
}

class TranscribeComponent extends Component {
  static contextType = AppContext;
  
  constructor(props) {
    super(props);
    this.state = {
      lines: []
    }
  }

  refSpeakerLines = createRef();

  onMouseClick = (e) => {
    if (e.type === 'click' && this.context.popupMenuItem) {
      this.context.setPopupItem(!this.context.popupMenuItem);
    }
  }

  onTextSelected = (lineId) => {
    this.context.showEditDialog(lineId, 'text');
  }

  onSpeakerIdSelected = (lineId) => {
    this.context.showEditDialog(lineId, 'id');
  }

  scrollToTop = () => {
    const scroll =
      this.refSpeakerLines.current.scrollHeight -
      this.refSpeakerLines.current.clientHeight;
    this.refSpeakerLines.current.scrollTo(0, scroll);
  };

  componentDidMount() {
    this.setState((state) => state.lines = this.context.lines);
  }

  componentWillUnmount() {
  }

  componentDidUpdate() {
    if (this.context.lines.length !== this.state.lines.length) {
      this.setState((state) => state.lines = this.context.lines);
      if (!this.context.dialog.open)
        this.scrollToTop();
    }
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
                      >
                        <div
                          className="SpeakerId"
                          style={{ color: line.color }}
                          onClick={() => this.onSpeakerIdSelected(line.id)}
                        >
                          {line?.speakerId}
                        </div>
                        <div 
                          className='SpeakerText'
                          onClick={() => this.onTextSelected(line.id)}
                        >
                          {line?.content
                            ?.split('\n')
                            ?.map((para, idx) =>
                              para.length ? <p key={idx}>{para}</p> : <></>
                            )}
                          <div className="time">
                            {new Date(line.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                    )}
                    {line.tag === 'dsk' && (
                      <td 
                        className="Bubble Bubble-foreground SpeakerStatement"
                      >
                        <div
                          className="SpeakerId"
                          style={{ color: line.color }}
                          onClick={() => this.onSpeakerIdSelected(line.id)}
                        >
                          {line?.speakerId}
                        </div>
                        <div 
                          className='SpeakerText'
                          onClick={() => this.onTextSelected(line.id)}
                        >
                          {line?.content
                            ?.split('\n')
                            ?.map((para, idx) =>
                              para.length ? <p key={idx}>{para}</p> : <></>
                            )}
                          <div className="time">
                            {new Date(line.timestamp).toLocaleTimeString()}
                          </div>
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
