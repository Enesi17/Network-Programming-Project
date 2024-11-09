import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../index.css";

const ChatRoom = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const userId = localStorage.getItem("userId");
  const [privateKey, setPrivateKey] = useState(null); // Store the private key

  useEffect(() => {
    // Load private key securely (for demo, this should be done securely in production)
    const loadPrivateKey = async () => {
      try {
        // Replace this with actual secure key retrieval (e.g., from session storage, or prompt user input)
        const pem = `-----BEGIN PRIVATE KEY-----
        YOUR_PRIVATE_KEY_HERE
        -----END PRIVATE KEY-----`;
        
        const key = await window.crypto.subtle.importKey(
          "pkcs8",
          str2ab(pem),
          {
            name: "RSA-OAEP",
            hash: { name: "SHA-256" },
          },
          true,
          ["decrypt"]
        );
        setPrivateKey(key);
      } catch (e) {
        console.error("Error loading private key:", e);
      }
    };

    loadPrivateKey();
  }, []);

  // Utility function to convert PEM format to ArrayBuffer
  const str2ab = (pem) => {
    const binary = atob(pem.replace(/-----[\w\s]+-----/g, "").replace(/\n/g, ""));
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  };

  const decryptMessage = async (encryptedContent) => {
    if (!privateKey) return "Decryption Error";
    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        Buffer.from(encryptedContent, "base64")
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error("Failed to decrypt message:", error);
      return "Decryption Error";
    }
  };

  useEffect(() => {
    if (!chatId) return;

    // Initialize Socket.IO client and connect
    const newSocket = io("http://localhost:5000", {
      query: { userId, chatId },
    });
    setSocket(newSocket);

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/chatrooms/${chatId}/messages`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        
        // Decrypt each message content
        const decryptedMessages = await Promise.all(
          data.map(async (message) => ({
            ...message,
            content: await decryptMessage(message.content),
          }))
        );
        setMessages(decryptedMessages);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchMessages();

    // Listen for incoming messages from the server
    newSocket.on("newMessage", async (message) => {
      const decryptedContent = await decryptMessage(message.content);
      setMessages((prevMessages) => [...prevMessages, { ...message, content: decryptedContent }]);
    });

    // Cleanup on component unmount
    return () => newSocket.disconnect();
  }, [chatId, userId, privateKey]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      userId,
      chatId,
      content: newMessage,
    };

    // Emit message to server via Socket.IO
    socket.emit("sendMessage", messageData);
    setNewMessage("");
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <h2>Chat Room {chatId}</h2>
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className="message-item">
            <strong>{message.username}: </strong>
            <span>{message.content}</span>
          </div>
        ))}
      </div>
      <div className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="message-input"
        />
        <button onClick={sendMessage} className="send-button">Send</button>
      </div>
    </div>
  );
};

export default ChatRoom;
