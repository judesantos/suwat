import React, { Component } from 'react';
import './HeaderPanel.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'

import PopupMenuComponent from '../PopupMenu/PopupMenu';
import AppContext from '../../services/AppContext';

class HeaderPanelComponent extends Component {

  static contextType = AppContext;

  onMenuEvent = (e) => {
    if (e.type ==='mouseover' && !this.context.popupMenuItem) {
      this.context.setPopupItem(!this.context.popupMenuItem);
    }
  }

  render() {

    return (
      <div className="HeaderPanel">
        <button 
          className="ButtonRecord"
          onClick={this.context.toggleRecording}
        >
        {this.context.recordingState} 
        </button>
        <div className='MenuDropDown'
          onMouseOver={this.onMenuEvent}
        >
          <button className='ButtonDropDown'>
            <FontAwesomeIcon icon={faBars}
            />
          </button>
          {this.context.popupMenuItem && 
            <PopupMenuComponent />
          }
        </div>
      </div>
    );
  }
}

export default HeaderPanelComponent;
