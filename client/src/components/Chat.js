import React, { useState, useEffect } from 'react';

const Chat = ({ messages, socket, username, room }) => {
  const [message, setMessage] = useState('');
  const [typingIndicator, setTypingIndicator] = useState('');


  useEffect(() => {
    // Listen for typing events
    socket.on('userTyping', (message) => setTypingIndicator(message));

    socket.on('userStoppedTyping', () => setTypingIndicator(''));

    return () => {
      socket.off('userTyping');
      socket.off('userStoppedTyping');
    };
  }, [socket]);
  const handleInputChange = (e) => {
    setMessage(e.target.value);

    // Emit typing event
    if (e.target.value.trim()) {
      socket.emit('typing', { username, room });
    } else {
      socket.emit('stopTyping', { room });
    }
  };
  const sendMessage = () => {
    if (message.trim()) {
      // console.log('Sending message:', { username, room, message });
      socket.emit('chatMessage', { username, room, message });
      setMessage('');
    }  
  };

  return (
<div className="d-flex flex-column">
  {/* Chat Messages */}
  <div
    className="chat-box border rounded p-3 mb-3"
    style={{ height: '300px', overflowY: 'scroll', backgroundColor: '#f8f9fa' }}
  >
    {messages.map((msg, index) => (
      <div key={index}>
        <strong>{msg.username}: </strong>
        {msg.message}
      </div>
    ))}
  </div>

  {/* Typing Indicator */}
  {typingIndicator && <p className="text-muted mb-2">{typingIndicator}</p>}

  {/* Message Input */}
  <div className="input-group">
    <input
      type="text"
      className="form-control"
      value={message}
      onChange={(e) => {
        setMessage(e.target.value);
        handleInputChange(e);
      }}
      placeholder="Type your message..."
    />
    <button className="btn btn-primary" onClick={sendMessage}>
      Send
    </button>
  </div>
</div>

  );
};

export default Chat;
