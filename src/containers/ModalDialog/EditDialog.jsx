import React, { Component } from 'react';
import './ModalDialog.css';

import AppContext from '../../services/app-context';
import Button from '@mui/material/Button';

class EditDialog extends Component {
  static contextType = AppContext;

  render() {

    let line = undefined;
    const lines = this.context.lines;
    for (let idx = 0; idx < lines.length; idx++) {
      if (this.context.dialog.lineId === lines[idx].id) {
        line = lines[idx];
        break;
      }
    }

    console.log({line});

    return (
      <div className='ModalWindow EditWindow'>
        <div className='ModalTitle'>
          Edit dialogue 
        </div>
        <div className="ModalMessage">
          <div>
            {line.speakerId}
          </div>
          <textarea disabled className='TextArea'>
            {line.content}
          </textarea>
        </div>
        <div className='ModalAction'>
          <Button onClick={() => {
            this.props.toggleDialog();
            this.props.cancel();
          }}>
            {this.props.lblBtnCancel}
          </Button>
          <Button autoFocus onClick={() => {
            this.props.toggleDialog();
            this.props.confirm();
          }}>
            {this.props.lblBtnConfirm}
          </Button>
        </div>
      </div>
    );
  }
}

export default EditDialog;
