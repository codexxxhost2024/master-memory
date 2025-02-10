// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBe9a58zaQCrBSGeWwcIVa_PnZABoH6zV4",
  authDomain: "tudds-ccd0wn.firebaseapp.com",
  databaseURL: "https://tudds-ccd0wn-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tudds-ccd0wn",
  storageBucket: "tudds-ccd0wn.appspot.com",
  messagingSenderId: "786974954352",
  appId: "1:786974954352:web:8cdc279d2e7dc1fb9bb5b5",
  measurementId: "G-E1RZQYQXQN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const chatCollection = collection(db, "chats_memo");

// 🛠️ Fix: Track the last transcript to prevent duplicates
let lastTranscript = "";

/**
 * Handles real-time audio transcription using Deepgram API
 */
export class DeepgramTranscriber {
  constructor(apiKey, sampleRate) {
    this.apiKey = apiKey;
    this.ws = null;
    this.isConnected = false;
    this.eventListeners = new Map();
    this.sampleRate = sampleRate;
    console.info('DeepgramTranscriber initialized');
  }

  async connect() {
    try {
      const url = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=${this.sampleRate}`;
      console.info('Attempting to connect to Deepgram WebSocket...');

      this.ws = new WebSocket(url, ['token', this.apiKey]);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        console.info('WebSocket connection established');

        const config = {
          type: 'Configure',
          features: {
            model: 'nova-2',
            language: 'en-US',
            encoding: 'linear16',
            sample_rate: this.sampleRate,
            channels: 1,
            interim_results: false, // Only final transcriptions
            punctuate: true,
            endpointing: 800
          },
        };

        console.debug('Sending configuration:', config);
        this.ws.send(JSON.stringify(config));
        this.emit('connected');
      };

      this.ws.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.type === 'Results') {
            const transcript = response.channel?.alternatives[0]?.transcript;

            if (transcript && transcript !== lastTranscript) {
              console.debug('Received transcript:', transcript);

              // 🛠️ Fix: Save the actual transcribed text (not "User sent audio")
              await saveMessage('user', transcript);
              this.emit('transcription', transcript);

              // Store last transcript to avoid duplication
              lastTranscript = transcript;
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          this.emit('error', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.info('WebSocket connection closed');
        this.isConnected = false;
        this.emit('disconnected');
      };

    } catch (error) {
      console.error('Error in connect():', error);
      throw error;
    }
  }

  sendAudio(audioData) {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(audioData);
  }

  disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
  }

  emit(eventName, data) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

/**
 * Saves messages to Firestore with correct sender labels.
 */
async function saveMessage(sender, message) {
  try {
    const messageData = {
      sender: sender, // Ensuring correct sender (user/ai)
      message: message,
      timestamp: new Date().toISOString()
    };

    await addDoc(chatCollection, messageData);
    console.log("Message saved:", messageData);
  } catch (error) {
    console.error("Error saving message:", error);
  }
}

/**
 * Retrieve full conversation as JSON for AI memory.
 */
async function getConversationJSON() {
  const q = query(chatCollection, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);

  const messages = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return JSON.stringify(messages);
}

/**
 * Real-time listener for chat updates.
 */
function listenForMessages() {
  const q = query(chatCollection, orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    document.getElementById('chatHistory').innerHTML = ""; // Clear chat UI

    snapshot.forEach((doc) => {
      const data = doc.data();
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message ${data.sender === 'user' ? 'user-message' : 'model-message'}`;
      messageDiv.textContent = data.message || "No transcription available.";

      document.getElementById('chatHistory').appendChild(messageDiv);
    });

    document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
  });
}

// Start listening for Firestore updates
listenForMessages();