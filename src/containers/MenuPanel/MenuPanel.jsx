import React, { Component } from 'react';

import PlayCircle from '@mui/icons-material/PlayCircleOutlineOutlined';
import StopCircle from '@mui/icons-material/StopCircleOutlined';
//import Edit from '@mui/icons-material/EditOutlined';
import Save from '@mui/icons-material/SaveOutlined';
import Delete from '@mui/icons-material/DeleteOutlined';
//import Settings from '@mui/icons-material/SettingsOutlined';
import Check from '@mui/icons-material/Check';

import './MenuPanel.css';

import AppContext from '../../services/app-context';

class MenuPanelComponent extends Component {
  static contextType = AppContext;

  render() {
    return (
      <>
        {/*
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
              <Check className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
            <Edit fontSize='small'/>
          </div>
        </div>
        */}
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
              <Check className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
            <Save fontSize='small'/>
          </div>
        </div>
        <div
          className="MenuItem"
          onClick={() => this.context.toggleRecording()}
        >
          {this.context.selectedMenuItem === 1 && (
            <div className="Checked">
              <Check className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
            {this.context.recording && 
              <StopCircle fontSize='small' className='Play'/>
            }
            {!this.context.recording && 
              <PlayCircle fontSize='small' className=''/>
            }
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
              <Check className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
            <Delete fontSize='small'/>
          </div>
        </div>
        {/*
        <div
          className="MenuItem"
          onClick={() => {
            this.context.setSelectedMenuItem(4);
            this.context.setPopupItem(!this.context.popupMenuItem);
          }}
        >
          {this.context.selectedMenuItem === 4 && (
            <div className="Checked">
              <Check className="checkIcon" />
            </div>
          )}
          <div className="MenuItemText">
            <Settings fontSize='small'/>
          </div>
        </div>
        */}
      </>
    );
  }
}

export default MenuPanelComponent;
