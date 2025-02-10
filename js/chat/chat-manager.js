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

export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.currentStreamingMessage = null;
        this.currentTranscript = '';

        this.listenForMessages();
    }

    /**
     * Starts streaming an AI response.
     */
    startModelMessage() {
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
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
    updateStreamingMessage(text) {
        if (!this.currentStreamingMessage) {
            this.startModelMessage();
        }
        this.currentTranscript += ' ' + text;
        this.currentStreamingMessage.textContent = this.currentTranscript;
        this.scrollToBottom();
    }

    /**
     * Finalizes the AI response and saves it to Firestore.
     */
    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            const finalText = this.currentStreamingMessage.textContent;
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null;
            this.currentTranscript = '';

            // ✅ Save AI messages only
            this.saveMessage('ai', finalText);
        }
    }

    /**
     * Saves messages to Firestore.
     */
    async saveMessage(sender, message) {
        try {
            await addDoc(chatCollection, {
                sender: sender, // Always "ai" for this file
                message: message,
                timestamp: new Date().toISOString()
            });
            console.log(`AI Message saved: ${message}`);
        } catch (error) {
            console.error("Error saving AI message:", error);
        }
    }

    /**
     * Listens for Firestore updates (for AI retrieval).
     */
    listenForMessages() {
        const q = query(chatCollection, orderBy("timestamp", "asc"));
        onSnapshot(q, (snapshot) => {
            this.chatContainer.innerHTML = ""; // Clear UI before updating

            snapshot.forEach((doc) => {
                const { sender, message } = doc.data();
                if (sender === "ai") { // ✅ Only AI messages are displayed
                    this.addMessageToUI(message);
                }
            });

            this.scrollToBottom();
        });
    }

    /**
     * Adds AI messages to the UI.
     */
    addMessageToUI(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message';
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
}