import React, { Component, createRef } from 'react';
import './EditDialog.css';

import AppContext from '../../services/app-context';
import Button from '@mui/material/Button';

import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

class EditDialog extends Component {
  static contextType = AppContext;

  constructor() {
    super();
    this.state = {
      speakerLabelSaveOption: 'current',
      editableText: ''
    }
    this.contentEditableRef = createRef();
  }

  componentDidMount() {    
    const line = this.getLine();
    const content = this.context.dialog.which === 'text' ? line.content : line.speakerId;
    this.setState(state => state.editableText = content);
    if (this.contentEditableRef.current) {
      const contentEditable = this.contentEditableRef.current;
      contentEditable.focus(); // Focus on the contenteditable element
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentEditable);
      range.collapse(false); // Set the cursor at the end of the text
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setTimeout(() => this.handleTextareaResize(), 0);
  }

  componentWillUnmount() {
  }

  onSpeakerLabelOptionChange = (e) => {
    this.setState((state) => state.speakerLabelSaveOption = e.target.value)
  }

  onTextChange = (e) => {
    const newVal = e.target.value;
    this.setState(state => state.editableText = newVal)
  }

  handleTextareaResize = () => {
    const textarea = this.contentEditableRef.current;
    textarea.style.height = 'auto'; // Reset height to correctly calculate scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`; // Set height to match scrollHeight
    console.log('textarea height after resise: ' + textarea.style.height)
  };

  save = () => {
    const line = this.getLine();
    if (this.context.dialog.which === 'id') {
      if (this.state.speakerLabelSaveOption === 'current') {
        line.speakerId = this.state.editableText;
      } else if (this.state.speakerLabelSaveOption === 'all') {
        console.log('save all')
        const lines = this.context.lines;
        const speakerId = line.speakerId;
        let color = undefined;
        // Check if there is an existing speaker that we are changing this one into, 
        // get it's color and transform all changed items to the same color.
        for (let _line of lines) {
          if (_line.speakerId === this.state.editableText) {
            color = _line.color;
            console.log('got color for speaker: ' + _line.speakerId + ', color: ' + _line.color)
            break;
          }
        }
        // Apply to all lines with similar original id.
        for (let _line of lines) {
          if (speakerId === _line.speakerId) {
            _line.speakerId = this.state.editableText;
            if (color)
              _line.color = color;
          }
        }
      }
    } else if (this.context.dialog.which === 'text') {
      line.content = this.state.editableText;
    }
  }

  getLine = () => {
    let line = undefined;
    const lines = this.context.lines;
    for (let idx = 0; idx < lines.length; idx++) {
      if (this.context.dialog.lineId === lines[idx].id) {
        line = lines[idx];
        break;
      }
    }
    return line
  }
  
  render() {

    return (
      <div className='EditWindow'>
        <div className='EditTitle'>
          {this.context.dialog.which === 'text' && "Edit transcript text"}
          {this.context.dialog.which === 'id' && "Edit speaker label"}
        </div>
        <div className="EditMessage">
          <div disabled className='TextAreaContainer'>
              <textarea 
                className='TextAreaContent' 
                ref={this.contentEditableRef}
                onChange={this.onTextChange}
                onInput={this.handleTextareaResize}
                value={this.state.editableText}
              />
          </div>
          {this.context.dialog.which === 'id' &&
            <div className='RadioGroup'>
            <FormControl>
              <FormLabel>Applies to:</FormLabel>
              <RadioGroup row defaultValue="current">
                <FormControlLabel 
                  value='all' 
                  checked={this.state.speakerLabelSaveOption === 'all'}
                  control={<Radio 
                    onChange={this.onSpeakerLabelOptionChange}
                  />} 
                  label='All'
                />
                <FormControlLabel 
                  value='current'
                  checked={this.state.speakerLabelSaveOption === 'current'}
                  control={<Radio 
                    onChange={this.onSpeakerLabelOptionChange}
                  />}
                  label='This message'
                />
              </RadioGroup>
            </FormControl>
            </div>
          }
        </div>
        <div className='EditAction'>
          <Button onClick={() => {
            this.props.toggleDialog();
            this.props.cancel();
          }}>
            {this.props.lblBtnCancel}
          </Button>
          <Button autoFocus onClick={() => {
            this.save();
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

export default EditDialog;
