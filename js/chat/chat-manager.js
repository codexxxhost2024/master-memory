import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Setup
const firebaseConfig = { /* same Firebase config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const aiChatCollection = collection(db, "chats_memo");

export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
    }

    async addAIMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message';
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();

        // Save AI message to Firestore
        await this.saveMessage('ai', text);
    }

    async saveMessage(sender, message) {
        try {
            await addDoc(aiChatCollection, {
                sender,
                message,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error saving AI message:", error);
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}