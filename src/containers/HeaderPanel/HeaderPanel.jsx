import React, { Component, useContext } from 'react';
import './HeaderPanel.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'

import PopupMenuComponent from '../PopupMenu/PopupMenu';
import AppContext from '../../services/AppContext';

class HeaderPanelComponent extends Component {

  static contextType = AppContext;

  constructor(props) {
    super(props);
    this.state = {
      showPopup: false
    };
  }

  togglePopupMenu = () => {
    this.setState({showPopup: !this.state.showPopup})
  }

  render() {

    const { toggleRecording, recordingState } = this.context.contextProvider;

    return (
      <div className="HeaderPanel">
        <button 
          className="ButtonRecord"
          onClick={() => toggleRecording()}
        >
         {recordingState} 
        </button>
        <button className='ButtonMenu'>
          <FontAwesomeIcon icon={faBars} onClick={this.togglePopupMenu}/>
        </button>
        {this.state.showPopup && 
          <PopupMenuComponent/>
        }
      </div>
    );
  }
}

export default HeaderPanelComponent;
