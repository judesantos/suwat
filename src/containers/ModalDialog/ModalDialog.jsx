// ModalDialog.js
import React, { Component } from 'react';
import './ModalDialog.css';

import Button from '@mui/material/Button';

import AppContext from '../../services/app-context';
import EditDialog from './EditDialog';

class ModalDialog extends Component {
  static contextType = AppContext;

  toggleDialog = () => {
    this.context.updateState((state) => {
      state.dialog.open = false;
    })
  }

  render() {

    const props = {
      ...this.context.dialog,
      toggleDialog: this.toggleDialog
    };
    console.log({props})

    let dialog = undefined;
    if (this.context.dialog.type === 'alert') {
      dialog = <AlertDialog {...props} />
    } else if (this.context.dialog.type === 'confirm') {
      dialog = <ConfirmDialog {...props} />;
    } else if (this.context.dialog.type === 'edit') {
      dialog = <EditDialog {...props} />
    }

    return (
      <>{
       this.context.dialog.open &&
          <div className='Modal'>
            {dialog}
          </div>
      }</>
    );
  }
}

class AlertDialog extends Component {
  render() {
    return (
      <div className='ModalWindow'>
        <div className='ModalTitle'>
          {this.props.title}  
        </div>
        <div className="ModalMessage">
          {this.props.message}
        </div>
        <div className='AlertAction'>
          <Button autoFocus onClick={() => {
            this.props.toggleDialog();
          }}>
            Close
          </Button>
        </div>
      </div>
    );
  }
}

class ConfirmDialog extends Component {

  render() {
    return (
      <div className='ModalWindow'>
        <div className='ModalTitle'>
          {this.props.title}  
        </div>
        <div className="ModalMessage">
          <div className='TextArea'>
            {this.props.message}
          </div>
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

export default ModalDialog;