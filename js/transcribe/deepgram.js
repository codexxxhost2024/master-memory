// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
const userChatCollection = collection(db, "chats_memo");

// Prevent duplicate transcript entries
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
            this.ws = new WebSocket(url, ['token', this.apiKey]);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                this.isConnected = true;
                console.info('WebSocket connection established');
            };

            this.ws.onmessage = async (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.type === 'Results') {
                        const transcript = response.channel?.alternatives[0]?.transcript;

                        if (transcript && transcript !== lastTranscript) {
                            console.debug('Transcribed:', transcript);
                            
                            // Send transcript to chatuser-manager.js
                            window.dispatchEvent(new CustomEvent('audioTranscribed', { detail: transcript }));

                            // Store transcript to prevent duplicates
                            lastTranscript = transcript;
                        }
                    }
                } catch (error) {
                    console.error('Error processing transcription:', error);
                }
            };

            this.ws.onerror = (error) => console.error('WebSocket error:', error);
            this.ws.onclose = () => this.isConnected = false;

        } catch (error) {
            console.error('Error in connect():', error);
        }
    }

    sendAudio(audioData) {
        if (this.isConnected) this.ws.send(audioData);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }
}