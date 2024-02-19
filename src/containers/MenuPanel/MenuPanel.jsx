import React, { Component } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faFloppyDisk,
  faPencilAlt,
  faTrashCan,
  faWrench,
  faRecordVinyl,
  faStop
} from '@fortawesome/free-solid-svg-icons';

import './MenuPanel.css';

import AppContext from '../../services/AppContext';

class MenuPanelComponent extends Component {
  static contextType = AppContext;

  render() {
    return (
      <>
        <div
          className="MenuItem"
          onClick={() => this.context.toggleRecording()}
        >
          {this.context.selectedMenuItem === 1 && (
            <div className="Checked">
                <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
            {this.context.recording && 
              <FontAwesomeIcon icon={faStop} className="Icon Play"/>
            }
            {!this.context.recording && 
              <FontAwesomeIcon icon={faRecordVinyl} className="Icon" />
            }
          </div>
        </div>
        <div
          className="MenuItem"
          onClick={() => {
            this.context.setSelectedMenuItem(1);
            this.context.setPopupItem(!this.context.popupMenuItem);
          }}
          disabled={this.context.recording || !this.context.lines.length}
        >
          {this.context.selectedMenuItem === 1 && (
            <div className="Checked">
                <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
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
          {this.context.selectedMenuItem === 2 && (
            <div className="Checked">
                <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
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
          {this.context.selectedMenuItem === 3 && (
            <div className="Checked">
                <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
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
          {this.context.selectedMenuItem === 4 && (
            <div className="Checked">
                <FontAwesomeIcon icon={faCheck} className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
            <FontAwesomeIcon icon={faWrench} className="Icon" />
          </div>
        </div>
      </>
    );
  }
}

export default MenuPanelComponent;
