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

        // Load chat history on init
        this.loadChatHistory();
        this.listenForMessages();
    }

    /**
     * Displays and saves a user text message to Firestore.
     */
    async addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'text';
        this.scrollToBottom();

        // Save to Firestore
        await this.saveMessage('user', text);
    }

    /**
     * Displays a placeholder for audio, but DOES NOT save to Firestore.
     * Deepgram code will handle storing the actual transcript later.
     */
    addUserAudioMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = 'User sent audio'; 
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio';
        this.scrollToBottom();

        // NOTICE: NO Firestore save here, to avoid double-saves.
    }

    /**
     * Starts AI (model) message in streaming mode.
     */
    startModelMessage() {
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }
        // If we have no user message type, treat it as if user sent audio
        if (!this.lastUserMessageType) {
            this.addUserAudioMessage();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message streaming';
        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv;
        this.currentTranscript = '';
        this.scrollToBottom();
    }

    /**
     * Appends text to an in-progress model (AI) message.
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
     * Finalizes the model message and saves it to Firestore.
     */
    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            this.currentStreamingMessage.classList.remove('streaming');
            
            // Capture final text before nulling out
            const finalText = this.currentStreamingMessage.textContent;

            this.currentStreamingMessage = null;
            this.lastUserMessageType = null;
            this.currentTranscript = '';

            // Save the AI response to Firestore
            this.saveMessage('ai', finalText);
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    clear() {
        this.chatContainer.innerHTML = '';
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }

    /**
     * Saves a message to Firestore (user or AI).
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
     * Real-time listener to reflect new messages as they come in.
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