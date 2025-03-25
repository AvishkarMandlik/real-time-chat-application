import React, { useState, useEffect, useRef } from "react";

const Chat = ({ messages, socket, username, room }) => {
  const [message, setMessage] = useState("");
  const [typingIndicator, setTypingIndicator] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on("userTyping", (message) => setTypingIndicator(message));
    socket.on("userStoppedTyping", () => setTypingIndicator(""));

    return () => {
      socket.off("userTyping");
      socket.off("userStoppedTyping");
    };
  }, [socket]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (e.target.value.trim()) {
      socket.emit("typing", { username, room });
    } else {
      socket.emit("stopTyping", { room });
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("chatMessage", { username, room, message });
      setMessage("");
      socket.emit("stopTyping", { room });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <>
      <div
        className="d-flex flex-column "
        style={{ backgroundColor: "#1a1a1a" }}
      >
        {/* Chat Container (Scroll only messages) */}
        <div
          className="chat-messages flex-grow-1 p-3"
          style={{
            height: "45vh",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            scrollbarWidth: "thin", // For Firefox
            scrollbarColor: "#ff4d4d #1a1a1a",
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message mb-2 p-2 rounded`}
              style={{
                backgroundColor: msg.username === username ? "#ff4d4d" : "#333",
                color: "#fff",
                maxWidth: "70%",
                wordBreak: "break-word",
                alignSelf:
                  msg.username === username ? "flex-end" : "flex-start",
                textAlign: msg.username === username ? "right" : "left",
                borderRadius: "15px",
                padding: "10px 15px",
              }}
            >
              {msg.username !== username && (
                <strong style={{ fontSize: "0.9rem", display: "block" }}>
                  {msg.username}
                </strong>
              )}
              {msg.message}
            </div>
          ))}
          {/* Invisible element to scroll into view */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {typingIndicator && (
        <p
          className="text-white  text-sm mb-1 animate-pulse"     style={{ fontStyle: 'italic' }}
        >
          {typingIndicator}
        </p>
      )}

      <div className="input-group mt-2">
        <input
          type="text"
          className="form-control px-3 py-2"
          placeholder="Type your message..."
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          style={{
          
            borderRadius: "15px",
            height: "40px", // Match button height
            fontSize: "14px", // Ensure text visibility
          }}
        />

        <button
          className="btn btn-danger d-flex align-items-center justify-content-center mx-1"
          title="Send Message"
          onClick={sendMessage}
          style={{ width: "40px", height: "40px", borderRadius: "50%" }} // Match button size
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </>
  );
};

export default Chat;
