import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';

const socket = io('https://real-time-chat-app-7gqk.onrender.com');
// const socket = io('http://localhost:5000');

const VideoChat = ({ room, username, isMicOn, isVideoOn, onEndCall, onMinimize, onMicToggle, onVideoToggle, isMinimized = false }) => {
  const userVideo = useRef();
  const screenVideo = useRef();
  const [peers, setPeers] = useState([]);
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const screenStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const [participantCount, setParticipantCount] = useState(1);

  useEffect(() => {
    async function getMediaPermissions() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoOn,
          audio: isMicOn
        });

        userVideo.current.srcObject = stream;

        socket.emit('joinVideoRoom', { room, username });

        socket.on('newUser', ({ userId, username: peerUsername }) => {
          console.log(`${peerUsername} joined the video call`);
          const peer = createPeer(userId, userVideo.current.srcObject);
          setPeers(prevPeers => [...prevPeers, { peer, id: userId, username: peerUsername }]);
          setParticipantCount(prev => prev + 1);
        });

        socket.on('offer', handleReceiveCall);

        socket.on('userLeft', ({ userId, username: peerUsername }) => {
          console.log(`${peerUsername} left the video call`);
          setPeers(prevPeers => prevPeers.filter(p => p.id !== userId));
          setParticipantCount(prev => prev - 1);
        });

        socket.on('participantCount', ({ count }) => {
          setParticipantCount(count);
        });

      } catch (error) {
        console.error("Permission Denied:", error);
        alert("Please allow camera and microphone access to join the video call.");
      }
    }

    getMediaPermissions();

    return () => {
      socket.emit('leaveVideoRoom', { room, username });
      if (userVideo.current && userVideo.current.srcObject) {
        userVideo.current.srcObject.getTracks().forEach(track => track.stop());
      }
      stopScreenShare();
      peers.forEach(({ peer }) => peer.destroy());
    };
  }, [room, username]);

  useEffect(() => {
    if (userVideo.current && userVideo.current.srcObject) {
      const audioTracks = userVideo.current.srcObject.getAudioTracks();
      const videoTracks = userVideo.current.srcObject.getVideoTracks();

      if (audioTracks.length > 0) {
        audioTracks[0].enabled = isMicOn;
      }

      if (videoTracks.length > 0) {
        videoTracks[0].enabled = isVideoOn;
      }
    }
  }, [isMicOn, isVideoOn]);

  const createPeer = (userToSignal, stream) => {
    const peer = new SimplePeer({ 
      initiator: true, 
      trickle: false, 
      stream 
    });

    peer.on('signal', signal => {
      socket.emit('offer', { 
        offer: signal, 
        to: userToSignal, 
        from: socket.id,
        username 
      });
    });

    peer.on('stream', peerStream => {
      // Handle peer's stream if needed
    });

    return peer;
  };

  const handleReceiveCall = ({ offer, from, username: peerUsername }) => {
    const peer = new SimplePeer({ 
      initiator: false, 
      trickle: false, 
      stream: userVideo.current.srcObject 
    });

    peer.on('signal', signal => {
      socket.emit('answer', { 
        answer: signal, 
        to: from,
        username 
      });
    });

    peer.on('stream', peerStream => {
      // Handle peer's stream if needed
    });

    setPeers(prevPeers => [...prevPeers, { peer, id: from, username: peerUsername }]);
    peer.signal(offer);
  };

  const startScreenShare = async () => {
    try {
      // Request screen share permissions
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },  // Optional: Display cursor in the shared screen
        audio: false, // No need for audio in screen sharing
      });

      // Check if we got the screen stream and handle it
      if (screenStream) {
        // Attach the screen stream to the video element
        if (screenVideo.current) {
          screenVideo.current.srcObject = screenStream;
        }

        // Set screen sharing status
        setScreenSharing(true);
        screenStreamRef.current = screenStream;

        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        // Emit to socket for other users to know screen sharing is happening
        socket.emit('screenShare', { room, isSharing: true });
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      alert('Screen sharing failed. Please check browser permissions and try again.');
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);

      // Emit to socket for other users to stop screen sharing
      socket.emit('screenShare', { room, isSharing: false });
    }
  };

  const startRecording = () => {
    try {
      const stream = userVideo.current.srcObject;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      recordedChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        setRecordedBlob(blob);
      };

      mediaRecorderRef.current.start(200);
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const downloadRecording = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `call-recording-${timestamp}.webm`;
      a.click();

      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`video-chat-container d-flex flex-column align-items-center bg-dark text-white p-3 rounded shadow ${isMinimized ? 'minimized' : ''}`} 
         style={{ maxHeight: isMinimized ? '80px' : '500px', overflow: isMinimized ? 'hidden' : 'visible', width: '100%' }}>
      <div className="video-header d-flex justify-content-between w-100 mb-2">
        <p>
          <i className="fas fa-video me-2"></i>
          Video Call ({participantCount} {participantCount === 1 ? 'participant' : 'participants'})
        </p>
        <div>
          <button className="btn btn-sm btn-outline-light me-2" onClick={onMinimize}>
            <i className={`fas ${isMinimized ? 'fa-expand' : 'fa-minus'}`}></i>
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={onEndCall}>
            <i className="fas fa-phone-slash"></i>
          </button>
        </div>
      </div>

      <div className="video-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', width: '100%' }}>
        <div className="video-item">
          <video 
            ref={userVideo} 
            autoPlay 
            playsInline 
            muted 
            className={`video-frame rounded ${!isVideoOn ? 'bg-secondary' : ''}`} 
            style={{ width: '100%', height: 'auto' }}
          />
          {!isVideoOn && (
            <div className="video-off-indicator">
              <i className="fas fa-user fa-2x"></i>
              <span className="d-block mt-1">{username} (You)</span>
            </div>
          )}
        </div>

        {peers.map(({ peer, id, username: peerUsername }) => (
          <div className="video-item" key={id}>
            <video 
              ref={ref => {
                if (ref) {
                  ref.srcObject = peer.streams?.[0];
                }
              }}
              autoPlay 
              playsInline 
              className="video-frame rounded" 
              style={{ width: '100%', height: 'auto' }}
            />
            <span className="peer-name badge bg-primary">{peerUsername}</span>
          </div>
        ))}

        {screenSharing && (
          <div className="screen-share-container">
            <video 
              ref={screenVideo} 
              autoPlay 
              playsInline 
              className="screen-share-frame rounded border border-warning" 
              style={{ width: '100%', height: 'auto' }}
            />
            <span className="badge bg-warning text-dark">Screen Share</span>
          </div>
        )}
      </div>

      <div className="video-controls d-flex justify-content-center mt-3">
        <button 
          className={`btn ${isMicOn ? 'btn-light' : 'btn-danger'} mx-1`}
          title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          onClick={() => onMicToggle(!isMicOn)}
        >
          <i className={`fas ${isMicOn ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
        </button>

        <button 
          className={`btn ${isVideoOn ? 'btn-light' : 'btn-danger'} mx-1`}
          title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
          onClick={() => onVideoToggle(!isVideoOn)}
        >
          <i className={`fas ${isVideoOn ? 'fa-video' : 'fa-video-slash'}`}></i>
        </button>

        {!screenSharing ? (
          <button 
            className="btn btn-warning mx-1" 
            onClick={startScreenShare}
            title="Share Your Screen"
          >
            <i className="fas fa-desktop"></i>
          </button>
        ) : (
          <button 
            className="btn btn-danger mx-1" 
            onClick={stopScreenShare}
            title="Stop Screen Sharing"
          >
            <i className="fas fa-desktop"></i> <i className="fas fa-times"></i>
          </button>
        )}

        {!recording ? (
          <button 
            className="btn btn-success mx-1" 
            onClick={startRecording}
            title="Start Recording"
          >
            <i className="fas fa-record-vinyl"></i>
          </button>
        ) : (
          <button 
            className="btn btn-danger mx-1" 
            onClick={stopRecording}
            title="Stop Recording"
          >
            <i className="fas fa-stop"></i>
          </button>
        )}

        {recordedBlob && (
          <button 
            className="btn btn-info mx-1" 
            onClick={downloadRecording}
            title="Download Recording"
          >
            <i className="fas fa-download"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoChat;
