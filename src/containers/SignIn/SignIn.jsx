import React, { Component } from 'react';
import './SignIn.css';

class SignInComponent extends Component {
  state = {
    username: '',
    password: '',
  };

  componentDidCatch(error, info) {
    console.error({ error, info });
  }

  onUserNameInput = (e) => {
    this.setState((state) => (state.username = e.target.value));
  };

  onPasswordInput = (e) => {
    this.setState((state) => (state.password = e.target.value));
  };

  login = (e) => {
    e.preventDefault();
    this.props.login();
  };

  render() {
    return (
      <div className="login-page">
        <div className="form">
          <form className="register-form">
            <input type="text" placeholder="username" />
            <input type="password" placeholder="password" />
            <input type="text" placeholder="email address" />
            <button>create</button>
            <p className="message">
              Already registered? <a href="#">Sign In</a>
            </p>
          </form>
          <form className="login-form">
            <input
              type="text"
              placeholder="email"
              value={this.state.username}
              onChange={this.onUserNameInput}
            />
            <input
              type="password"
              placeholder="password"
              value={this.state.password}
              onChange={this.onPasswordInput}
            />
            <p className="forgot-password">
              <a href="#">Forgot password?</a>
            </p>
            <p className="new-account">
              <a href="#">New account</a>
            </p>
            <button onClick={this.login}>login</button>
          </form>
        </div>
      </div>
    );
  }
}

export default SignInComponent;
