import React, { Component } from 'react';
import './HeaderPanel.css';
import MenuPanelComponent from '../MenuPanel/MenuPanel';
import AppContext from '../../services/app-context';

class HeaderPanelComponent extends Component {
  static contextType = AppContext;

  onMenuEvent = (e) => {
    if (e.type === 'mouseover' && !this.context.popupMenuItem) {
      this.context.setPopupItem(!this.context.popupMenuItem);
    }
  };

  render() {
    return (
      <div className="HeaderPanel">
        <MenuPanelComponent/>
      </div>
    );
  }
}

export default HeaderPanelComponent;
