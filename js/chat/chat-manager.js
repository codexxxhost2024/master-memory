// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, query, orderBy, getDocs, onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

        // Load and listen to chat history on init
        this.loadChatHistory();
        this.listenForMessages();
    }

    /**
     * Adds a user text message to UI and saves to Firestore.
     */
    async addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);

        this.lastUserMessageType = 'text';
        this.scrollToBottom();

        // Save user text to Firestore
        await this.saveMessage('user', text);
    }

    /**
     * Adds a placeholder for user audio in the UI
     * WITHOUT saving "User sent audio" to Firestore.
     * Deepgram (or other logic) can save the transcript later.
     */
    addUserAudioMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = 'User sent audio';
        this.chatContainer.appendChild(messageDiv);

        this.lastUserMessageType = 'audio';
        this.scrollToBottom();

        // NO Firestore save here to avoid double-saving placeholders.
    }

    /**
     * Starts streaming an AI model message.
     */
    startModelMessage() {
        // Finalize any existing streaming message first
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }

        // If no user message was shown, we assume user sent audio
        if (!this.lastUserMessageType) {
            this.addUserAudioMessage();
        }

        // Create a new streaming AI message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message streaming';
        this.chatContainer.appendChild(messageDiv);

        this.currentStreamingMessage = messageDiv;
        this.currentTranscript = '';

        this.scrollToBottom();
    }

    /**
     * Continuously update the AI streaming message in the UI.
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
            this.currentStreamingMessage.classList.remove('streaming');

            // Capture final text
            const finalText = this.currentStreamingMessage.textContent;

            // Reset streaming state
            this.currentStreamingMessage = null;
            this.lastUserMessageType = null;
            this.currentTranscript = '';

            // Save the AI's final response to Firestore
            this.saveMessage('ai', finalText);
        }
    }

    /**
     * Simple UI helper: scroll to the bottom of chat.
     */
    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    /**
     * Clear the chat in the UI (not Firestore).
     */
    clear() {
        this.chatContainer.innerHTML = '';
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }

    /**
     * Saves a message to Firestore.
     */
    async saveMessage(sender, message) {
        try {
            await addDoc(chatCollection, {
                sender: sender,
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
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'model-message'}`;
            messageDiv.textContent = message;
            this.chatContainer.appendChild(messageDiv);
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
                const messageDiv = document.createElement('div');
                messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'model-message'}`;
                messageDiv.textContent = message;
                this.chatContainer.appendChild(messageDiv);
            });

            this.scrollToBottom();
        });
    }
}