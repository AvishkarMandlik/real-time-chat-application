import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import Chat from './Chat';
import OnlineUsers from './OnlineUsers';

const VideoChat = ({ room, username, userId, onEndCall }) => {
  // Refs
  const userVideo = useRef();
  const screenVideo = useRef();
  const chatContainerRef = useRef();
  const userStreamRef = useRef(null);
  const videoGridRef = useRef();
  const socketRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const peersRef = useRef([]);

  // State
  const [peers, setPeers] = useState([]);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteScreenShares, setRemoteScreenShares] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [participantCount, setParticipantCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeView, setActiveView] = useState('chat');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [pinnedParticipant, setPinnedParticipant] = useState(null);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [videoQuality, setVideoQuality] = useState('hd');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [showReactions, setShowReactions] = useState(false);
  const [layoutMode, setLayoutMode] = useState('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [mediaPermissions, setMediaPermissions] = useState({
    audio: false,
    video: false
  });
  const [showPermissionPrompt, setShowPermissionPrompt] = useState({
    audio: false,
    video: false
  });

  // Refs for media
  const mediaRecorderRef = useRef(null);
  const screenStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  // Available reactions
  const reactions = [
    { icon: '👏', label: 'Clap' },
    { icon: '👍', label: 'Thumbs up' },
    { icon: '❤️', label: 'Heart' },
    { icon: '😂', label: 'Laugh' },
    { icon: '😮', label: 'Surprised' },
    { icon: '🙌', label: 'Celebrate' }
  ];

  const handleNewUser = (newUserId, newUsername) => {
    if (userStreamRef.current) {
      const peer = createPeer(newUserId, userStreamRef.current);
      peersRef.current = [...peersRef.current, { peer, id: newUserId, username: newUsername }];
      setPeers(peersRef.current);
      setParticipantCount(prev => prev + 1);
    }
  };

  const handleReceiveCall = ({ offer, from, username: peerUsername }) => {
    if (!userStreamRef.current) return;

    const peer = new SimplePeer({ 
      initiator: false, 
      trickle: false, 
      stream: userStreamRef.current,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', signal => {
      socketRef.current.emit('answer', { answer: signal, to: from, username, userId });
    });

    peer.on('stream', stream => {
      if (stream.id.includes('screen')) {
        setRemoteScreenShares(prev => [...prev, { stream, userId: from }]);
      } else {
        // Update existing peer or add new one
        const existingPeerIndex = peersRef.current.findIndex(p => p.id === from);
        if (existingPeerIndex >= 0) {
          peersRef.current[existingPeerIndex].stream = stream;
        } else {
          peersRef.current = [...peersRef.current, { peer, id: from, username: peerUsername, stream }];
        }
        setPeers([...peersRef.current]);
      }
    });

    peer.on('track', (track, stream) => {
      if (track.kind === 'audio') {
        setupAudioAnalyser(stream, from);
      }
    });

    peer.signal(offer);
    peersRef.current = [...peersRef.current, { peer, id: from, username: peerUsername }];
    setPeers(peersRef.current);
  };

  const setupAudioAnalyser = (stream, userId) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const detectActiveSpeaker = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        if (average > 10) {
          setActiveSpeaker(userId);
        } else if (activeSpeaker === userId) {
          setActiveSpeaker(null);
        }
        
        animationRef.current = requestAnimationFrame(detectActiveSpeaker);
      };
      
      detectActiveSpeaker();
    } catch (error) {
      console.error('Audio analysis error:', error);
    }
  };

  const handleUserLeft = ({ userId: leftUserId }) => {
    peersRef.current = peersRef.current.filter(p => p.id !== leftUserId);
    setPeers(peersRef.current);
    setRemoteScreenShares(prev => prev.filter(s => s.userId !== leftUserId));
    setParticipantCount(prev => prev - 1);
    if (activeSpeaker === leftUserId) {
      setActiveSpeaker(null);
    }
    if (pinnedParticipant === leftUserId) {
      setPinnedParticipant(null);
    }
  };

  const updateParticipantCount = ({ count }) => {
    setParticipantCount(count);
  };

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', { username, userId, room, isVideoRoom: true });
      socketRef.current.disconnect();
    }
    
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    stopScreenShare();
    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current = [];
    setPeers([]);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
  };

  const createPeer = (userToSignal, stream) => {
    const peer = new SimplePeer({ 
      initiator: true, 
      trickle: false, 
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', signal => {
      socketRef.current.emit('offer', { 
        offer: signal, 
        to: userToSignal, 
        from: userId,
        username 
      });
    });

    peer.on('stream', stream => {
      if (stream.id.includes('screen')) {
        setRemoteScreenShares(prev => [...prev, { stream, userId: userToSignal }]);
      } else {
        // Update existing peer or add new one
        const existingPeerIndex = peersRef.current.findIndex(p => p.id === userToSignal);
        if (existingPeerIndex >= 0) {
          peersRef.current[existingPeerIndex].stream = stream;
        } else {
          peersRef.current = [...peersRef.current, { peer, id: userToSignal, stream }];
        }
        setPeers([...peersRef.current]);
      }
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
    });

    return peer;
  };

  const toggleMic = async () => {
    if (!mediaPermissions.audio) {
      setShowPermissionPrompt(prev => ({ ...prev, audio: true }));
      return;
    }

    const newValue = !isMicOn;
    setIsMicOn(newValue);
    if (userStreamRef.current) {
      const audioTracks = userStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = newValue;
      }
    }
  };

  const toggleVideo = async () => {
    if (!mediaPermissions.video) {
      setShowPermissionPrompt(prev => ({ ...prev, video: true }));
      return;
    }

    const newValue = !isVideoOn;
    setIsVideoOn(newValue);
    if (userStreamRef.current) {
      const videoTracks = userStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = newValue;
      }
    }
  };

  const requestMediaPermission = async (type) => {
    try {
      const constraints = {
        audio: type === 'audio' ? {
          noiseSuppression: noiseSuppression,
          echoCancellation: true,
          autoGainControl: true
        } : false,
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (userStreamRef.current) {
        // Replace the existing track
        if (type === 'audio') {
          const audioTrack = stream.getAudioTracks()[0];
          const existingAudioTracks = userStreamRef.current.getAudioTracks();
          if (existingAudioTracks.length > 0) {
            userStreamRef.current.removeTrack(existingAudioTracks[0]);
          }
          userStreamRef.current.addTrack(audioTrack);
        } else {
          const videoTrack = stream.getVideoTracks()[0];
          const existingVideoTracks = userStreamRef.current.getVideoTracks();
          if (existingVideoTracks.length > 0) {
            userStreamRef.current.removeTrack(existingVideoTracks[0]);
          }
          userStreamRef.current.addTrack(videoTrack);
        }
      }

      setMediaPermissions(prev => ({ ...prev, [type]: true }));
      setShowPermissionPrompt(prev => ({ ...prev, [type]: false }));

      // Update all peers with the new track
      peersRef.current.forEach(({ peer }) => {
        const senders = peer._pc.getSenders();
        const sender = senders.find(s => s.track?.kind === type);
        if (sender && userStreamRef.current) {
          const track = type === 'audio' 
            ? userStreamRef.current.getAudioTracks()[0]
            : userStreamRef.current.getVideoTracks()[0];
          if (track) {
            sender.replaceTrack(track);
          }
        }
      });

    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      setShowPermissionPrompt(prev => ({ ...prev, [type]: false }));
    }
  };

const startScreenShare = async () => {
  try {
    // Get screen stream
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: false
    });

    // Store the screen stream
    screenStreamRef.current = screenStream;
    setScreenSharing(true);

    // Show my screen to myself - IMPORTANT FIX
    if (screenVideo.current) {
      screenVideo.current.srcObject = screenStream;
      screenVideo.current.play().catch(e => console.error("Screen video play error:", e));
    }

    // Replace video track in all peer connections
    peersRef.current.forEach(({ peer }) => {
      const senders = peer._pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
      }
    });

    // Handle when user stops screen sharing
    screenStream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };

    // Notify others that I'm sharing my screen
    socketRef.current.emit('screenShareStarted', { room, userId });

  } catch (error) {
    console.error('Screen share error:', error);
    setScreenSharing(false);
  }
};

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      // Stop all tracks in the screen stream
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);

      // Notify others that I stopped sharing
      socketRef.current.emit('screenShareEnded', { room, userId });

      // Restore camera video track in all peer connections
      if (userStreamRef.current) {
        const videoTrack = userStreamRef.current.getVideoTracks()[0];
        peersRef.current.forEach(({ peer }) => {
          const senders = peer._pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack);
          }
        });
      }

      // Clear my screen video element
      if (screenVideo.current) {
        screenVideo.current.srcObject = null;
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = userVideo.current.srcObject;
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
      };

      mediaRecorderRef.current.start(1000);
      setRecording(true);
    } catch (error) {
      console.error('Recording failed:', error);
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
      a.href = url;
      a.download = `meeting-recording-${new Date().toISOString()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const pinParticipant = (id) => {
    setPinnedParticipant(pinnedParticipant === id ? null : id);
  };

  const toggleRaiseHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socketRef.current.emit('raiseHand', { room, username, userId, isRaised: newState });
  };

  const sendReaction = (reactionIcon) => {
    setReaction(reactionIcon);
    setTimeout(() => setReaction(null), 2000);
    socketRef.current.emit('sendReaction', { room, username, userId, reaction: reactionIcon });
  };

  const toggleBackgroundBlur = async () => {
    const newValue = !backgroundBlur;
    setBackgroundBlur(newValue);
    // In a real app, you would apply background blur effect here
  };

  const toggleNoiseSuppression = async () => {
    const newValue = !noiseSuppression;
    setNoiseSuppression(newValue);
    
    try {
      if (userStreamRef.current) {
        const audioTrack = userStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          await audioTrack.applyConstraints({
            noiseSuppression: newValue,
            echoCancellation: true,
            autoGainControl: true
          });
        }
      }
    } catch (error) {
      console.error('Error applying noise suppression:', error);
    }
  };

  const changeVideoQuality = async (quality) => {
    setVideoQuality(quality);
    
    try {
      if (userStreamRef.current) {
        const videoTrack = userStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          let constraints = {};
          
          switch(quality) {
            case 'sd':
              constraints = { width: 640, height: 480, frameRate: 24 };
              break;
            case 'hd':
              constraints = { width: 1280, height: 720, frameRate: 30 };
              break;
            case 'fhd':
              constraints = { width: 1920, height: 1080, frameRate: 30 };
              break;
            default:
              constraints = { width: 1280, height: 720, frameRate: 30 };
          }
          
          await videoTrack.applyConstraints(constraints);
        }
      }
    } catch (error) {
      console.error('Error changing video quality:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettings && settingsButtonRef.current && !settingsButtonRef.current.contains(event.target)) {
        const settingsPanel = document.querySelector('.settings-panel');
        if (settingsPanel && !settingsPanel.contains(event.target)) {
          setShowSettings(false);
        }
      }
    };
  
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [showSettings]);

  useEffect(() => {
    const socket = io('https://real-time-chat-app-7gqk.onrender.com', {
      transports: ['websocket'],
      withCredentials: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('handRaised', ({ username: peerUsername, userId: peerUserId, isRaised }) => {
      setRaisedHands(prev => isRaised 
        ? [...prev.filter(u => u.userId !== peerUserId), { username: peerUsername, userId: peerUserId }] 
        : prev.filter(u => u.userId !== peerUserId)
      );
    });

    socket.on('screenShareStarted', ({ userId: sharerId }) => {
      // Handled through peer connection streams
    });

    socket.on('screenShareEnded', ({ userId: sharerId }) => {
      setRemoteScreenShares(prev => prev.filter(s => s.userId !== sharerId));
    });

    socket.on('reaction', ({ username: peerUsername, userId: peerUserId, reaction: reactionIcon }) => {
      const reactionElement = document.createElement('div');
      reactionElement.className = 'reaction-bubble';
      reactionElement.innerHTML = reactionIcon;
      reactionElement.style.position = 'absolute';
      reactionElement.style.fontSize = '2rem';
      reactionElement.style.animation = 'floatUp 2s forwards';
      
      const userVideoElement = document.getElementById(`video-${peerUserId}`);
      if (userVideoElement) {
        userVideoElement.appendChild(reactionElement);
        setTimeout(() => reactionElement.remove(), 2000);
      }
    });

    socket.on('newUser', ({ userId: newUserId, username: newUsername }) => {
      handleNewUser(newUserId, newUsername);
    });

    socket.on('offer', (data) => {
      handleReceiveCall(data);
    });

    socket.on('userLeft', (data) => {
      handleUserLeft(data);
    });

    socket.on('participantCount', (data) => {
      updateParticipantCount(data);
    });

    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socket.on('chatMessage', (message) => {
      setMessages(prev => {
        const newMessages = [...prev, message];
        if (newMessages.length > 10) {
          return newMessages.slice(-10);
        }
        return newMessages;
      });
    });

    socket.on('chatHistory', (history) => {
      setMessages(history.slice(-10));
    });

    return () => {
      cleanup();
    };
  }, []);
  
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!socketConnected) return;

    const setupMedia = async () => {
      try {
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: {
            noiseSuppression: noiseSuppression,
            echoCancellation: true,
            autoGainControl: true
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        userVideo.current.srcObject = stream;
        userStreamRef.current = stream;

        setMediaPermissions({
          audio: stream.getAudioTracks().some(track => track.enabled),
          video: stream.getVideoTracks().some(track => track.enabled)
        });

        if (userStreamRef.current) {
          const audioTracks = userStreamRef.current.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks[0].enabled = isMicOn;
          }
          const videoTracks = userStreamRef.current.getVideoTracks();
          if (videoTracks.length > 0) {
            videoTracks[0].enabled = isVideoOn;
          }
        }

        socketRef.current.emit('joinRoom', { 
          username, 
          userId,
          room, 
          isVideoRoom: true 
        });

      } catch (error) {
        console.error("Media error:", error);
        setMediaPermissions({ audio: false, video: false });
        
        // Still join the room even if media permissions are denied
        socketRef.current.emit('joinRoom', { 
          username, 
          userId,
          room, 
          isVideoRoom: true 
        });
      }
    };

    setupMedia();
  }, [socketConnected, room, username, noiseSuppression]);

const calculateGridLayout = () => {
    const totalParticipants = peers.length + 1;
    const hasScreenShare = screenSharing || remoteScreenShares.length > 0;
    const hasPinned = pinnedParticipant !== null;
    const hasActiveSpeaker = activeSpeaker !== null && layoutMode === 'speaker';

    if (hasPinned) {
      return {
        screenShareClass: 'hidden',
        pinnedParticipantClass: 'col-span-12 h-full',
        otherParticipantsClass: 'hidden',
        participantItemClass: 'col-span-12 h-full'
      };
    }

    if (hasActiveSpeaker) {
      return {
        screenShareClass: hasScreenShare ? 'md:col-span-8 h-full' : 'hidden',
        activeSpeakerClass: 'md:col-span-4 h-full',
        otherParticipantsClass: 'hidden',
        participantItemClass: 'col-span-12 h-full'
      };
    }

    if (hasScreenShare) {
      return {
        screenShareClass: 'md:col-span-8 h-full',
        pinnedParticipantClass: 'hidden',
        otherParticipantsClass: 'md:col-span-4 h-full',
        participantItemClass: peers.length <= 2 ? 'col-span-12 h-1/2' : 'col-span-6 h-1/2'
      };
    }

    if (totalParticipants <= 2 || layoutMode === 'grid') {
      return {
        screenShareClass: 'hidden',
        pinnedParticipantClass: 'hidden',
        otherParticipantsClass: 'col-span-12 h-full',
        participantItemClass: totalParticipants <= 4 ? 'col-span-6 h-1/2' : 'col-span-6 md:col-span-4 lg:col-span-3 h-1/2'
      };
    }

    return {
      screenShareClass: 'hidden',
      pinnedParticipantClass: 'hidden',
      otherParticipantsClass: 'col-span-12 h-full',
      participantItemClass: 'col-span-6 md:col-span-4 h-1/2'
    };
  };

  const gridLayout = calculateGridLayout();

  const getSettingsPanelPosition = () => {
    if (!settingsButtonRef.current) return {};
    
    const buttonRect = settingsButtonRef.current.getBoundingClientRect();
    const panelHeight = 400;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    
    if (spaceBelow < panelHeight && buttonRect.top > panelHeight) {
      return {
        bottom: `${window.innerHeight - buttonRect.top + 10}px`,
        right: `${window.innerWidth - buttonRect.right}px`
      };
    }
    
    return {
      top: `${buttonRect.bottom + 10}px`,
      right: `${window.innerWidth - buttonRect.right}px`
    };
  };

  return (
    <div className="video-chat-container">
      {/* Permission Request Modals */}
      {showPermissionPrompt.audio && (
        <div className="permission-modal modal fade show d-block">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-microphone me-2"></i>
                  Microphone Permission Required
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPermissionPrompt(prev => ({ ...prev, audio: false }))}
                ></button>
              </div>
              <div className="modal-body">
                <p>You need to grant microphone access to use this feature.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPermissionPrompt(prev => ({ ...prev, audio: false }))}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => requestMediaPermission('audio')}
                >
                  Grant Permission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPermissionPrompt.video && (
        <div className="permission-modal modal fade show d-block">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-video me-2"></i>
                  Camera Permission Required
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPermissionPrompt(prev => ({ ...prev, video: false }))}
                ></button>
              </div>
              <div className="modal-body">
                <p>You need to grant camera access to use this feature.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPermissionPrompt(prev => ({ ...prev, video: false }))}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => requestMediaPermission('video')}
                >
                  Grant Permission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="video-chat-layout">
        {/* Video Area */}
        <div className={`video-area ${activeView === 'chat' ? 'with-sidebar' : ''}`}>
          {/* Video grid */}
          <div className="video-grid" ref={videoGridRef}>
            {/* Pinned participant */}
            {pinnedParticipant && gridLayout.pinnedParticipantClass && (
              <div className={gridLayout.pinnedParticipantClass}>
                {peers.filter(p => p.id === pinnedParticipant).map(({ id, username: peerUsername, stream }) => (
                  <div className="video-container pinned" key={id}>
                    <video 
                      ref={ref => ref && stream && (ref.srcObject = stream)}
                      autoPlay 
                      playsInline 
                      className="video-element"
                      id={`video-${id}`}
                    />
                    <div className="video-controls top-right">
                      <button 
                        className="btn btn-control btn-pin"
                        onClick={() => pinParticipant(id)}
                        title="Unpin"
                      >
                        <i className="fas fa-thumbtack"></i>
                      </button>
                    </div>
                    <div className="video-info">
                      {peerUsername} {raisedHands.some(u => u.userId === id) && <i className="fas fa-hand-paper ms-1"></i>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active speaker view */}
            {activeSpeaker && gridLayout.activeSpeakerClass && (
              <div className={gridLayout.activeSpeakerClass}>
                {peers.filter(p => p.id === activeSpeaker).map(({ id, username: peerUsername, stream }) => (
                  <div className="video-container active-speaker" key={id}>
                    <video 
                      ref={ref => ref && stream && (ref.srcObject = stream)}
                      autoPlay 
                      playsInline 
                      className="video-element"
                      id={`video-${id}`}
                    />
                    <div className="video-info">
                      {peerUsername} (Speaking) {raisedHands.some(u => u.userId === id) && <i className="fas fa-hand-paper ms-1"></i>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Screen share - local or remote */}
            {(screenSharing || remoteScreenShares.length > 0) && gridLayout.screenShareClass && (
              <div className={gridLayout.screenShareClass}>
                {screenSharing ? (
                  <div className="video-container screen-share">
                    <video 
                      ref={screenVideo} 
                      autoPlay 
                      playsInline 
                      className="screen-element"
                    />
                    <div className="screen-label">
                      Your Screen
                    </div>
                  </div>
                ) : (
                  remoteScreenShares.map(({ stream, userId }) => {
                    const sharer = onlineUsers.find(u => u.userId === userId);
                    return (
                      <div className="video-container screen-share" key={userId}>
                        <video 
                          ref={ref => ref && (ref.srcObject = stream)}
                          autoPlay 
                          playsInline 
                          className="screen-element"
                        />
                        <div className="screen-label">
                          {sharer?.username || 'Participant'}'s Screen
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Participants area */}
            {gridLayout.otherParticipantsClass && (
              <div className={gridLayout.otherParticipantsClass}>
                <div className="participants-grid">
                  {/* Local user */}
                  {!pinnedParticipant && !(activeSpeaker && layoutMode === 'speaker') && (
                    <div className={gridLayout.participantItemClass}>
                      <div className="video-container local-user">
                        <video 
                          ref={userVideo} 
                          autoPlay 
                          playsInline 
                          muted 
                          className={`video-element ${!isVideoOn ? 'no-video' : ''}`}
                          id={`video-${userId}`}
                        />
                        {!isVideoOn && (
                          <div className="no-video-placeholder">
                            <i className="fas fa-user"></i>
                            <div>{username} (You)</div>
                          </div>
                        )}
                        <div className="video-info">
                          {username} (You) {isHandRaised && <i className="fas fa-hand-paper ms-1"></i>}
                          {activeSpeaker === userId && <span className="ms-1">(Speaking)</span>}
                        </div>
                        {backgroundBlur && (
                          <div className="video-feature-label">
                            <i className="fas fa-camera me-1"></i> Background Blur
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Remote peers */}
                  {!pinnedParticipant && peers.map(({ id, username: peerUsername, stream }) => (
                    <div className={gridLayout.participantItemClass} key={id}>
                      <div className={`video-container ${activeSpeaker === id ? 'active-speaker' : ''}`}>
                        <video 
                          ref={ref => ref && stream && (ref.srcObject = stream)}
                          autoPlay 
                          playsInline 
                          className="video-element"
                          id={`video-${id}`}
                        />
                        <div className="video-controls top-right">
                          <button 
                            className="btn btn-control btn-pin"
                            onClick={() => pinParticipant(id)}
                            title="Pin participant"
                          >
                            <i className="fas fa-thumbtack"></i>
                          </button>
                        </div>
                        <div className="video-info">
                          {peerUsername} {raisedHands.some(u => u.userId === id) && <i className="fas fa-hand-paper ms-1"></i>}
                          {activeSpeaker === id && <span className="ms-1">(Speaking)</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="video-controls-bar">
            <div className="controls-left">
              <button 
                className={`btn btn-control ${isMicOn ? 'btn-mic-on' : 'btn-mic-off'}`}
                onClick={toggleMic}
                title={isMicOn ? 'Mute' : 'Unmute'}
              >
                <i className={`fas fa-microphone${isMicOn ? '' : '-slash'}`}></i>
              </button>

              <button 
                className={`btn btn-control ${isVideoOn ? 'btn-video-on' : 'btn-video-off'}`}
                onClick={toggleVideo}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                <i className={`fas fa-video${isVideoOn ? '' : '-slash'}`}></i>
              </button>

              <button 
                className={`btn btn-control ${screenSharing ? 'btn-screen-sharing' : 'btn-screen-share'}`}
                onClick={screenSharing ? stopScreenShare : startScreenShare}
                title={screenSharing ? 'Stop screen share' : 'Share screen'}
              >
                <i className="fas fa-desktop"></i>
              </button>

              <button 
                className={`btn btn-control ${isHandRaised ? 'btn-hand-raised' : 'btn-hand'}`}
                onClick={toggleRaiseHand}
                title={isHandRaised ? 'Lower hand' : 'Raise hand'}
              >
                <i className="fas fa-hand-paper"></i>
              </button>

              <div className="reactions-container">
                <button 
                  className="btn btn-control btn-reaction"
                  onClick={() => setShowReactions(!showReactions)}
                  title="Send reaction"
                >
                  <i className="fas fa-smile"></i>
                </button>
                {showReactions && (
                  <div className="reactions-panel">
                    {reactions.map((r, i) => (
                      <button
                        key={i}
                        className="btn btn-reaction-option"
                        onClick={() => {
                          sendReaction(r.icon);
                          setShowReactions(false);
                        }}
                        title={r.label}
                      >
                        <span>{r.icon}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="controls-center">
              <div className="btn-group layout-controls">
                <button 
                  className={`btn btn-control ${layoutMode === 'auto' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('auto')}
                  title="Auto layout"
                >
                  <i className="fas fa-magic"></i>
                </button>
                <button 
                  className={`btn btn-control ${layoutMode === 'speaker' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('speaker')}
                  title="Speaker view"
                >
                  <i className="fas fa-user"></i>
                </button>
                <button 
                  className={`btn btn-control ${layoutMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('grid')}
                  title="Grid view"
                >
                  <i className="fas fa-th"></i>
                </button>
              </div>
            </div>

            <div className="controls-right">
              {!recording ? (
                <button 
                  className="btn btn-control btn-record"
                  onClick={startRecording}
                  title="Start recording"
                >
                  <i className="fas fa-circle"></i>
                </button>
              ) : (
                <button 
                  className="btn btn-control btn-recording pulse"
                  onClick={stopRecording}
                  title="Stop recording"
                >
                  <i className="fas fa-stop"></i>
                </button>
              )}

              {recordedBlob && (
                <button 
                  className="btn btn-control btn-download"
                  onClick={downloadRecording}
                  title="Download recording"
                >
                  <i className="fas fa-download"></i>
                </button>
              )}

              <button 
                ref={settingsButtonRef}
                className={`btn btn-control btn-settings ${showSettings ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
                title="Settings"
              >
                <i className="fas fa-cog"></i>
              </button>

              <button 
                className="btn btn-control btn-end-call"
                onClick={onEndCall}
                title="End call"
              >
                <i className="fas fa-phone-slash"></i>
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div 
              className="settings-panel"
              style={getSettingsPanelPosition()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-header">
                <h5>
                  <i className="fas fa-cog me-2"></i>
                  Settings
                </h5>
                <button 
                  className="btn btn-close-settings"
                  onClick={() => setShowSettings(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="settings-section">
                <div className="settings-item">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="noiseSuppression"
                      checked={noiseSuppression}
                      onChange={toggleNoiseSuppression}
                    />
                    <label className="form-check-label" htmlFor="noiseSuppression">
                      <i className="fas fa-volume-up me-2"></i>
                      Noise Suppression
                    </label>
                  </div>
                </div>

                <div className="settings-item">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="backgroundBlur"
                      checked={backgroundBlur}
                      onChange={toggleBackgroundBlur}
                    />
                    <label className="form-check-label" htmlFor="backgroundBlur">
                      <i className="fas fa-camera me-2"></i>
                      Background Blur
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">
                  <i className="fas fa-video me-2"></i>
                  Video Quality
                </label>
                <select
                  className="form-select settings-select"
                  value={videoQuality}
                  onChange={(e) => changeVideoQuality(e.target.value)}
                >
                  <option value="sd">Standard (SD)</option>
                  <option value="hd">HD (720p)</option>
                  <option value="fhd">Full HD (1080p)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar - Chat or Participants */}
        {activeView !== 'video' && (
          <div className={`sidebar ${activeView === 'chat' ? 'chat-sidebar' : 'participants-sidebar'}`}>
            {/* Meeting details header */}
            <div className="sidebar-header">
              <div className="header-top">
                <h5>Meeting Details</h5>
                <div className="view-toggle">
                  <button 
                    className={`btn btn-view ${activeView === 'participants' ? 'active' : ''}`}
                    onClick={() => setActiveView('participants')}
                    title="Participants"
                  >
                    <i className="fas fa-users"></i>
                  </button>
                  <button 
                    className={`btn btn-view ${activeView === 'chat' ? 'active' : ''}`}
                    onClick={() => setActiveView('chat')}
                    title="Chat"
                  >
                    <i className="fas fa-comment"></i>
                  </button>
                </div>
              </div>
              <div className="meeting-stats">
                <span className="stat-item">
                  <i className="fas fa-user me-1"></i> {participantCount}
                </span>
                {raisedHands.length > 0 && (
                  <span className="stat-item">
                    <i className="fas fa-hand-paper me-1"></i> {raisedHands.length}
                  </span>
                )}
              </div>
            </div>

            {/* Content area */}
            <div className="sidebar-content">
              {activeView === 'chat' ? (
                <>
                  <div 
                    className="chat-container" 
                    ref={chatContainerRef}
                  >
                    {socketRef.current && (
                      <Chat 
                        username={username} 
                        messages={messages} 
                        socket={socketRef.current} 
                        room={room} 
                      />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="participants-header">
                    <h6>Participants ({onlineUsers.length})</h6>
                    {raisedHands.length > 0 && (
                      <span className="raised-hands-badge">
                        <i className="fas fa-hand-paper me-1"></i>
                        {raisedHands.length}
                      </span>
                    )}
                  </div>
                  <div className="participants-list">
                    <OnlineUsers users={onlineUsers} raisedHands={raisedHands} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add CSS styles */}
      <style jsx>{`
        .video-chat-container {
          height: 100vh;
          width: 100vw;
          background-color: #1a1a1a;
          color: #ffffff;
          overflow: hidden;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .video-chat-layout {
          display: flex;
          height: 100%;
        }

        .video-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #2d2d2d;
          position: relative;
        }

        .video-area.with-sidebar {
          width: calc(100% - 350px);
        }

        .video-grid {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          padding: 10px;
          overflow: auto;
          gap: 10px;
        }

        .video-container {
          position: relative;
          background-color: #000;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .video-container:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .video-container.pinned {
          border-color: #4a90e2;
        }

        .video-container.active-speaker {
          border-color: #4CAF50;
        }

        .video-container.screen-share {
          background-color: #000;
        }

        .video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-element.no-video {
          background-color: #121212;
        }

        .screen-element {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background-color: #000;
        }

        .no-video-placeholder {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #aaa;
        }

        .no-video-placeholder i {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .video-info {
          position: absolute;
          bottom: 0;
          left: 0;
          background-color: rgba(0, 0, 0, 0.7);
          padding: 5px 10px;
          border-radius: 0 4px 0 0;
          font-size: 0.85rem;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .video-controls {
          position: absolute;
          display: flex;
          gap: 5px;
        }

        .video-controls.top-right {
          top: 5px;
          right: 5px;
        }

        .video-feature-label {
          position: absolute;
          top: 5px;
          left: 5px;
          background-color: rgba(76, 175, 80, 0.8);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .screen-label {
          position: absolute;
          top: 5px;
          left: 5px;
          background-color: rgba(255, 193, 7, 0.9);
          color: #000;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .video-controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          background-color: rgba(30, 30, 30, 0.9);
          border-top: 1px solid #444;
        }

        .controls-left, .controls-right {
          display: flex;
          gap: 10px;
        }

        .controls-center {
          display: flex;
          justify-content: center;
        }

        .btn-control {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #3a3a3a;
          color: white;
        }

        .btn-control:hover {
          background-color: #4a4a4a;
          transform: scale(1.05);
        }

        .btn-control.active {
          background-color: #4a90e2;
        }

        .btn-mic-on {
          background-color: #4CAF50;
        }

        .btn-mic-off {
          background-color: #f44336;
        }

        .btn-video-on {
          background-color: #4CAF50;
        }

        .btn-video-off {
          background-color: #f44336;
        }

        .btn-screen-share {
          background-color: #2196F3;
        }

        .btn-screen-sharing {
          background-color: #FFC107;
          color: #000;
        }

        .btn-hand {
          background-color: #9C27B0;
        }

        .btn-hand-raised {
          background-color: #E91E63;
        }

        .btn-reaction {
          background-color: #FF9800;
        }

        .btn-record {
          background-color: #f44336;
        }

        .btn-recording {
          background-color: #f44336;
          animation: pulse 1.5s infinite;
        }

        .btn-end-call {
          background-color: #f44336;
        }

        .btn-settings {
          background-color: #607D8B;
        }

        .btn-settings.active {
          background-color: #4a90e2;
        }

        .btn-pin {
          background-color: rgba(0, 0, 0, 0.5);
          width: 30px;
          height: 30px;
        }

        .btn-pin:hover {
          background-color: rgba(74, 144, 226, 0.8);
        }

        .layout-controls {
          background-color: rgba(58, 58, 58, 0.7);
          border-radius: 20px;
          padding: 5px;
        }

        .layout-controls .btn-control {
          width: 35px;
          height: 35px;
          background-color: transparent;
        }

        .layout-controls .btn-control.active {
          background-color: #4a90e2;
        }

        .reactions-container {
          position: relative;
        }

        .reactions-panel {
          position: absolute;
          bottom: 50px;
          left: 0;
          background-color: rgba(58, 58, 58, 0.9);
          padding: 10px;
          border-radius: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          width: 180px;
          z-index: 100;
        }

        .btn-reaction-option {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 5px;
          transition: transform 0.2s;
        }

        .btn-reaction-option:hover {
          transform: scale(1.2);
        }

        .settings-panel {
          position: fixed;
          width: 280px;
          background-color: rgba(45, 45, 45, 0.98);
          border-radius: 8px;
          padding: 15px;
          border: 1px solid #444;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 1050;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #444;
        }

        .settings-header h5 {
          margin: 0;
          font-size: 1.1rem;
        }

        .btn-close-settings {
          background: none;
          border: none;
          color: #aaa;
          cursor: pointer;
          font-size: 1.1rem;
        }

        .btn-close-settings:hover {
          color: white;
        }

        .settings-section {
          margin-bottom: 15px;
        }

        .settings-item {
          margin-bottom: 10px;
        }

        .settings-label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.9rem;
          color: #ddd;
        }

        .settings-select {
          background-color: #333;
          border: 1px solid #444;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          width: 100%;
        }

        .settings-select:focus {
          border-color: #4a90e2;
          box-shadow: 0 0 0 0.2rem rgba(74, 144, 226, 0.25);
        }

        .form-check-input:checked {
          background-color: #4a90e2;
          border-color: #4a90e2;
        }

        .form-switch .form-check-input {
          width: 2.5em;
          height: 1.5em;
          margin-right: 8px;
        }

        .form-check-label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .sidebar {
          width: 350px;
          background-color: #252525;
          border-left: 1px solid #444;
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 15px;
          border-bottom: 1px solid #444;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .header-top h5 {
          margin: 0;
          font-size: 1.1rem;
        }

        .view-toggle {
          display: flex;
          gap: 5px;
        }

        .btn-view {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #3a3a3a;
          color: white;
        }

        .btn-view:hover {
          background-color: #4a4a4a;
        }

        .btn-view.active {
          background-color: #4a90e2;
        }

        .meeting-stats {
          display: flex;
          gap: 15px;
        }

        .stat-item {
          font-size: 0.9rem;
          color: #aaa;
        }

        .sidebar-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-container {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .participants-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #444;
        }

        .participants-header h6 {
          margin: 0;
          font-size: 1rem;
        }

        .raised-hands-badge {
          background-color: #4a90e2;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 0.8rem;
        }

        .participants-list {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .permission-modal .modal-content {
          background-color: #2d2d2d;
          color: white;
          border: 1px solid #444;
        }

        .permission-modal .modal-header {
          border-bottom: 1px solid #444;
        }

        .permission-modal .modal-footer {
          border-top: 1px solid #444;
        }

        .permission-modal .btn-close {
          filter: invert(1);
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes floatUp {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px);
            opacity: 0;
          }
        }

        .reaction-bubble {
          animation: floatUp 2s forwards;
          z-index: 10;
        }
      `}</style>
    </div>
  );
};

export default VideoChat;