// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';

        // Load chat history on init
        this.loadChatHistory();
        this.listenForMessages();
    }

    /**
     * Adds a user text message to UI and saves to Firestore.
     */
    async addUserMessage(text) {
        this.addMessageToUI('user', text);
        await this.saveMessage('user', text);
    }

    /**
     * Handles Deepgram transcription and updates the UI & Firestore correctly.
     */
    async addUserAudioMessage(transcript) {
        if (transcript) {
            this.addMessageToUI('user', transcript);
            await this.saveMessage('user', transcript); // Saves transcribed text
        } else {
            this.addMessageToUI('user', 'User sent an audio (No transcription)');
        }
    }

    /**
     * Starts streaming an AI model message.
     */
    startModelMessage() {
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }
        if (!this.lastUserMessageType) {
            this.addMessageToUI('user', 'User sent an audio...');
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message streaming';
        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv;
        this.currentTranscript = '';
        this.scrollToBottom();
    }

    /**
     * Continuously updates the AI streaming message in the UI.
     */
    async updateStreamingMessage(text) {
        if (!this.currentStreamingMessage) {
            this.startModelMessage();
        }
        this.currentTranscript += ' ' + text;
        this.currentStreamingMessage.textContent = this.currentTranscript;
        this.scrollToBottom();
    }

    /**
     * Finalizes the AI model message and saves it to Firestore.
     */
    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            const finalText = this.currentStreamingMessage.textContent;
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null;
            this.lastUserMessageType = null;
            this.currentTranscript = '';

            // Save the AI's final response to Firestore
            this.saveMessage('ai', finalText);
        }
    }

    /**
     * Saves a message to Firestore.
     */
    async saveMessage(sender, message) {
        try {
            await addDoc(chatCollection, {
                sender: sender,  // Fixing sender label (user/ai)
                message: message,
                timestamp: new Date().toISOString()
            });
            console.log(`Message saved: ${sender}: ${message}`);
        } catch (error) {
            console.error("Error saving message:", error);
        }
    }

    /**
     * Loads past chat history from Firestore (one-time fetch on init).
     */
    async loadChatHistory() {
        const q = query(chatCollection, orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const { sender, message } = doc.data();
            this.addMessageToUI(sender, message);
        });

        this.scrollToBottom();
    }

    /**
     * Real-time listener that updates the UI whenever new messages arrive in Firestore.
     */
    listenForMessages() {
        const q = query(chatCollection, orderBy("timestamp", "asc"));
        onSnapshot(q, (snapshot) => {
            this.chatContainer.innerHTML = ""; // Clear chat before updating

            snapshot.forEach((doc) => {
                const { sender, message } = doc.data();
                this.addMessageToUI(sender, message);
            });

            this.scrollToBottom();
        });
    }

    /**
     * Helper function: Adds messages to the UI.
     */
    addMessageToUI(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'model-message'}`;
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * UI helper: Scrolls to bottom of chat.
     */
    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    /**
     * Clears chat UI.
     */
    clear() {
        this.chatContainer.innerHTML = '';
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }
}