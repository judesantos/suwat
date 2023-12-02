import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './PopupMenu.css'
import { faCheck } from '@fortawesome/free-solid-svg-icons';

class PopupMenuComponent extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedItem: 0
    };
  }

  setSelectedMenuItem = (item) => {
    this.setState({selectedItem: item})
  }

  render() {
    return (
      <div className="PopupMenu">
        <div className='MenuItem' onClick={() => this.setSelectedMenuItem(1)}>
          <div className='Checked'>
            {this.state.selectedItem === 1 &&
              <FontAwesomeIcon icon={faCheck} className='checkIcon'/>
            }
          </div>
          <div className='MenuItemText'>
            Menu item 1
          </div>
        </div>
        <div className='MenuItem' onClick={() => this.setSelectedMenuItem(2)}>
          <div className='Checked'>
            {this.state.selectedItem === 2 &&
              <FontAwesomeIcon icon={faCheck} className='checkIcon'/>
            }
          </div>
          <div className='MenuItemText'>
            Menu item 2
          </div>
        </div>
        <div className='MenuItem' onClick={() => this.setSelectedMenuItem(3)}>
          <div className='Checked'>
            {this.state.selectedItem === 3 &&
              <FontAwesomeIcon icon={faCheck} className='checkIcon'/>
            }
          </div>
          <div className='MenuItemText'>
            Menu item 3
          </div>
        </div>
      </div>
    );
  }
}

export default PopupMenuComponent;
