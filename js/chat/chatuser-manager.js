import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Setup
const firebaseConfig = { /* same Firebase config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userChatCollection = collection(db, "chats_memo");

export class ChatUserManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.listenForMessages();
    }

    async addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();

        // Save user text to Firestore
        await this.saveMessage('user', text);
    }

    async saveMessage(sender, message) {
        try {
            await addDoc(userChatCollection, {
                sender,
                message,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error saving message:", error);
        }
    }

    listenForMessages() {
        const q = query(userChatCollection, orderBy("timestamp", "asc"));
        onSnapshot(q, (snapshot) => {
            this.chatContainer.innerHTML = "";
            snapshot.forEach((doc) => {
                const { sender, message } = doc.data();
                const messageDiv = document.createElement('div');
                messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'model-message'}`;
                messageDiv.textContent = message;
                this.chatContainer.appendChild(messageDiv);
            });
            this.scrollToBottom();
        });
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}

// Listen for transcribed audio and save it
window.addEventListener('audioTranscribed', (event) => {
    const transcribedText = event.detail;
    const chatManager = new ChatUserManager();
    chatManager.addUserMessage(transcribedText);
});