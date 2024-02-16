import React, { Component } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faFloppyDisk,
  faPencilAlt,
  faTrashCan,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import './PopupMenu.css';

import AppContext from '../../services/AppContext';

class PopupMenuComponent extends Component {
  static contextType = AppContext;

  render() {
    return (
      <div className="PopupMenu">
        <div
          className="MenuItem"
          onClick={() => {
            this.context.setSelectedMenuItem(1);
            this.context.setPopupItem(!this.context.popupMenuItem);
          }}
          disabled={this.context.recording || !this.context.lines.length}
        >
          <div className="Checked">
            {this.context.selectedMenuItem === 1 && (
              <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            )}
          </div>
          <div className="MenuItemText">
            Edit
            <FontAwesomeIcon icon={faPencilAlt} className="Icon" />
          </div>
        </div>
        <div
          className="MenuItem"
          onClick={() => {
            this.context.setSelectedMenuItem(2);
            this.context.setPopupItem(!this.context.popupMenuItem);
          }}
          disabled={this.context.recording || !this.context.lines.length}
        >
          <div className="Checked">
            {this.context.selectedMenuItem === 2 && (
              <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            )}
          </div>
          <div className="MenuItemText">
            Save
            <FontAwesomeIcon icon={faFloppyDisk} className="Icon" />
          </div>
        </div>
        <div
          className="MenuItem"
          onClick={() => {
            this.context.setSelectedMenuItem(3);
            this.context.setPopupItem(!this.context.popupMenuItem);
          }}
          disabled={this.context.recording || !this.context.lines.length}
        >
          <div className="Checked">
            {this.context.selectedMenuItem === 3 && (
              <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            )}
          </div>
          <div className="MenuItemText">
            Delete
            <FontAwesomeIcon icon={faTrashCan} className="Icon" />
          </div>
        </div>
        <div
          className="MenuItem"
          onClick={() => {
            this.context.setSelectedMenuItem(4);
            this.context.setPopupItem(!this.context.popupMenuItem);
          }}
        >
          <div className="Checked">
            {this.context.selectedMenuItem === 4 && (
              <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            )}
          </div>
          <div className="MenuItemText">
            Settings
            <FontAwesomeIcon icon={faWrench} className="Icon" />
          </div>
        </div>
      </div>
    );
  }
}

export default PopupMenuComponent;
