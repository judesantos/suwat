
---

# Suwat

**Suwat** is a **speech transcription application** built with **React** and powered by **AWS APIs**. It enables real-time voice-to-text conversion using cloud-based speech recognition services.

## Features

- 🎤 **Real-time Speech Recognition**: Converts spoken words into text with high accuracy.
- 🌍 **Multi-Language Support**: Supports multiple languages for transcription.
- 🔌 **AWS API Integration**: Leverages AWS SDK for handling speech-to-text services.
- 🌐 **Chrome Extension Interface**: Seamlessly integrates into Google Chrome.
- 💾 **Export & Save Transcriptions**: Download transcriptions in various formats.

## Technologies Used

### **Frontend**
- **React.js** – JavaScript library for building user interfaces.
- **Chrome Extension API** – Handles browser interactions.
- **Web Speech API** – Captures and transcribes speech in supported browsers.
- **FontAwesome** – UI icons for better user experience.

### **Backend & AWS Integrations**
- **AWS SDK** – Integrates AWS services for speech processing.
- **Amazon Transcribe** – AWS speech-to-text service for high-quality transcription.
- **WebSockets** – Enables real-time communication between the frontend and backend.

## Installation

### **Chrome Extension Setup**
1. Clone the repository:
   ```sh
   git clone https://github.com/judesantos/suwat.git
   cd suwat
   ```
2. Load the extension into Chrome:
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top-right corner).
   - Click **Load unpacked**.
   - Select the `chrome-extension/` directory inside the project.
   - The extension should now be available in Chrome.

### **Backend Setup**
1. Navigate to the backend folder:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the server:
   ```sh
   npm start
   ```

The backend will now be running at `http://localhost:5000`.

## Usage

1. Click the **Suwat Chrome Extension** icon in the browser toolbar.
2. Click the **Start Recording** button and begin speaking.
3. The transcribed text will appear in real-time.
4. Click **Stop Recording** to end the session.
5. (Optional) Save or export the transcription.

## Roadmap

- [ ] Improve speech recognition accuracy.
- [ ] Add support for **offline transcription**.
- [ ] Store transcriptions in **AWS DynamoDB**.
- [ ] Implement **voice commands** for hands-free control.

## Contributing

1. Fork the repository.
2. Create a new branch:
   ```sh
   git checkout -b feature-branch
   ```
3. Make your changes and commit:
   ```sh
   git commit -m "Added new feature"
   ```
4. Push the branch:
   ```sh
   git push origin feature-branch
   ```
5. Open a pull request.

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
