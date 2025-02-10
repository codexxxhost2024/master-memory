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

export class ChatUserManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.listenForMessages();
    }

    /**
     * Adds user messages to UI and saves to Firestore.
     */
    async addUserMessage(text) {
        this.addMessageToUI('user', text);
        await this.saveMessage('user', text);
    }

    /**
     * Saves user messages to Firestore.
     */
    async saveMessage(sender, message) {
        try {
            await addDoc(chatCollection, {
                sender: sender, // Always "user" for this file
                message: message,
                timestamp: new Date().toISOString()
            });
            console.log(`User Message saved: ${message}`);
        } catch (error) {
            console.error("Error saving user message:", error);
        }
    }

    /**
     * Listens for Firestore updates (for user retrieval).
     */
    listenForMessages() {
        const q = query(chatCollection, orderBy("timestamp", "asc"));
        onSnapshot(q, (snapshot) => {
            this.chatContainer.innerHTML = ""; // Clear UI before updating

            snapshot.forEach((doc) => {
                const { sender, message } = doc.data();
                if (sender === "user") { // ✅ Only user messages are displayed
                    this.addMessageToUI(sender, message);
                }
            });

            this.scrollToBottom();
        });
    }

    /**
     * Adds user messages to the UI.
     */
    addMessageToUI(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
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