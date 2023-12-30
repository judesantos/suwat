import React, { Component } from 'react';
import icon from '../../../public/assets/img/icon-128.png';
import './Greetings.css';

class GreetingComponent extends Component {
  state = {
    name: '',
  };

  render() {
    return (
      <div className="Greetings">
        <img src={icon} alt="extension icon" />
      </div>
    );
  }
}

export default GreetingComponent;
