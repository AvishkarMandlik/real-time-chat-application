import React, { useState, useEffect, useRef } from "react";

const Chat = ({ messages: propMessages, socket, username, room }) => {
  const [message, setMessage] = useState("");
  const [typingIndicator, setTypingIndicator] = useState("");
  const [messages, setMessages] = useState(propMessages || []);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // Sync with parent component's messages
  useEffect(() => {
    setMessages(propMessages || []);
  }, [propMessages]);

  useEffect(() => {
    socket.on("userTyping", (message) => setTypingIndicator(message));
    socket.on("userStoppedTyping", () => setTypingIndicator(""));

    return () => {
      socket.off("userTyping");
      socket.off("userStoppedTyping");
    };
  }, [socket]);

  // Improved scroll behavior
  useEffect(() => {
    if (isAutoScrollEnabled && messagesEndRef.current) {
      scrollToBottom();
    }
  }, [messages, isAutoScrollEnabled]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle scroll events to detect if user has scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 50;
      setIsAutoScrollEnabled(isNearBottom);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      socket.emit("typing", { username, room });
    } else {
      socket.emit("stopTyping", { room });
    }
  };

  const sendMessage = async () => {
    if (message.trim()) {
      const timestamp = new Date().toISOString();
      const tempId = Date.now();
      
      // Optimistically update UI
      const optimisticMessage = {
        _id: tempId,
        username,
        message,
        timestamp,
        isOptimistic: true
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setMessage("");
      socket.emit("stopTyping", { room });

      try {
        // Send to server
        socket.emit("chatMessage", { 
          username, 
          room, 
          message, 
          timestamp 
        });
      } catch (error) {
        console.error("Error sending message:", error);
        // Remove optimistic update if failed
        setMessages(prev => prev.filter(msg => msg._id !== tempId));
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: "#1a1a1a" }}>
      {/* Chat Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-grow-1 p-3 overflow-auto"
        style={{
          display: "flex",
          flexDirection: "column",
          scrollbarWidth: "thin",
          scrollbarColor: "#ff4d4d #1a1a1a",
        }}
        onScroll={handleScroll}
      >
        {messages.map((msg, index) => {
          const isCurrentUser = msg.username === username;
          const showHeader = index === 0 || 
            messages[index-1]?.username !== msg.username || 
            (new Date(msg.timestamp) - new Date(messages[index-1]?.timestamp)) > 60000;
          
          return (
            <div 
              key={msg._id || msg.timestamp} 
              className={`d-flex flex-column mb-2 ${isCurrentUser ? 'align-items-end' : 'align-items-start'}`}
            >
              {showHeader && (
                <div className="d-flex align-items-center mb-1" style={{ color: '#aaa' }}>
                  {!isCurrentUser && (
                    <strong className="me-2" style={{ color: '#ff4d4d' }}>{msg.username}</strong>
                  )}
                </div>
              )}
              <div
                className={`p-2 px-3 rounded d-flex align-items-end ${msg.isOptimistic ? 'opacity-75' : ''}`}
                style={{
                  backgroundColor: isCurrentUser ? "#ff4d4d" : "#333",
                  color: "#fff",
                  maxWidth: "80%",
                  wordBreak: "break-word",
                  borderRadius: isCurrentUser ? "18px 18px 0 18px" : "18px 18px 18px 0",
                }}
              >
                <span>{msg.message}</span>
                <small className="ms-2" style={{ opacity: 0.7, fontSize: '0.75rem' }}>
                  {formatTime(msg.timestamp)}
                </small>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingIndicator && (
        <div className="px-3 pb-1">
          <small className="text-white animate-pulse" style={{ fontStyle: 'italic' }}>
            {typingIndicator}
          </small>
        </div>
      )}

      {/* Message Input */}
      <div className="p-3 pt-0">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Type your message..."
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            style={{
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '20px',
              padding: '10px 15px',
              height: '45px'
            }}
          />
          <button
            className="btn btn-danger ms-2"
            onClick={sendMessage}
            disabled={!message.trim()}
            style={{
              backgroundColor: 'red',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;