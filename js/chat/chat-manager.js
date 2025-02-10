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
     * Adds a user audio transcription message.
     */
    async addUserAudioMessage(transcript) {
        if (transcript) {
            this.addMessageToUI('user', transcript);
            await this.saveMessage('user', transcript); // Saves actual transcribed text
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
     * Updates AI streaming response in UI.
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
     * Finalizes the AI response and saves it correctly to Firestore.
     */
    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            const finalText = this.currentStreamingMessage.textContent;
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null;
            this.lastUserMessageType = null;
            this.currentTranscript = '';

            // ✅ Now correctly saves AI responses as "ai"
            this.saveMessage('ai', finalText);
        }
    }

    /**
     * Saves messages to Firestore with correct sender.
     */
    async saveMessage(sender, message) {
        try {
            await addDoc(chatCollection, {
                sender: sender,  // Now correctly differentiates between 'user' and 'ai'
                message: message,
                timestamp: new Date().toISOString()
            });
            console.log(`Message saved: ${sender}: ${message}`);
        } catch (error) {
            console.error("Error saving message:", error);
        }
    }

    /**
     * Loads chat history from Firestore.
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
     * Real-time listener that updates UI when Firestore updates.
     */
    listenForMessages() {
        const q = query(chatCollection, orderBy("timestamp", "asc"));
        onSnapshot(q, (snapshot) => {
            this.chatContainer.innerHTML = ""; // Clear UI before updating

            snapshot.forEach((doc) => {
                const { sender, message } = doc.data();
                this.addMessageToUI(sender, message);
            });

            this.scrollToBottom();
        });
    }

    /**
     * Adds messages to the UI with correct sender.
     */
    addMessageToUI(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'model-message'}`;
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Scrolls chat UI to bottom.
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