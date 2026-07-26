'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Send, Copy, Check, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WatchPartyClientProps {
  roomId: string;
}

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

// STUN servers for WebRTC
const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function WatchPartyClient({ roomId }: WatchPartyClientProps) {
  const router = useRouter();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [usersCount, setUsersCount] = useState(1);
  const [userName, setUserName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRoomFull, setIsRoomFull] = useState(false);

  // WebRTC Voice State
  const [isVoiceJoined, setIsVoiceJoined] = useState(false);
  const isVoiceJoinedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  
  // WebRTC Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const heartbeatIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate a random name if not set
  useEffect(() => {
    setUserName(`User-${Math.floor(Math.random() * 10000)}`);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Fetch initial messages
  useEffect(() => {
    if (!supabase) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('watch_party_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);
        
      if (!error && data) {
        setMessages(data.map(m => ({
          id: m.id,
          user: m.user_name,
          text: m.message,
          timestamp: new Date(m.created_at).getTime()
        })));
        scrollToBottom();
      }
    };
    fetchMessages();
  }, [roomId]); // supabase is a constant import, no need to include in deps usually, but fine.

  // Main Room Connection and Signaling
  useEffect(() => {
    if (!userName || !supabase) return;

    const room = supabase.channel(`room_${roomId}`, {
      config: {
        presence: { key: userName },
      },
    });
    channelRef.current = room;

    room
      .on('presence', { event: 'sync' }, () => {
        const state = room.presenceState();
        const activeUsers = Object.keys(state).length;
        setUsersCount(activeUsers > 0 ? activeUsers : 1);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // If WE are already in voice, and a NEW user joins the channel, we initiate connection
        if (isVoiceJoinedRef.current && localStreamRef.current && newPresences.length > 0) {
           const newUser = newPresences[0].user;
           if (newUser && newUser !== userName) {
              initiatePeerConnection(newUser);
           }
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
         const leftUser = leftPresences[0]?.user;
         if (leftUser) removePeerConnection(leftUser);
      });

    // Handle incoming WebRTC signaling via broadcast
    room.on('broadcast', { event: 'webrtc_signaling' }, (payload) => {
      const { targetUser, fromUser, type, data } = payload.payload;
      
      if (type === 'voice_joined') {
         if (isVoiceJoinedRef.current && localStreamRef.current && fromUser !== userName) {
            initiatePeerConnection(fromUser);
         }
         return;
      }

      // Ignore messages not meant for us
      if (targetUser !== userName) return;

      if (type === 'offer') {
        handleReceiveOffer(fromUser, data);
      } else if (type === 'answer') {
        handleReceiveAnswer(fromUser, data);
      } else if (type === 'ice-candidate') {
        handleReceiveIceCandidate(fromUser, data);
      }
    });

    // Listen for database inserts
    room.on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'watch_party_messages',
      filter: `room_id=eq.${roomId}`
    }, (payload) => {
      const newMsg = payload.new as any;
      setMessages((prev) => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, {
          id: newMsg.id,
          user: newMsg.user_name,
          text: newMsg.message,
          timestamp: new Date(newMsg.created_at).getTime()
        }];
      });
    });

    // Subscribe to the channel
    room.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Enforce 5 user limit BEFORE fully tracking presence
        const state = room.presenceState();
        const activeUsers = Object.keys(state).length;
        if (activeUsers >= 5) {
           setIsRoomFull(true);
           supabase.removeChannel(room);
           return;
        }
        await room.track({ user: userName, onlineAt: new Date().toISOString() });
      }
    });

    return () => {
      stopVoice();
      supabase.removeChannel(room);
    };
  }, [roomId, userName]);

  // --- WEBRTC METHODS ---

  const sendSignalingMessage = (targetUser: string, type: string, data: any) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc_signaling',
      payload: { targetUser, fromUser: userName, type, data }
    });
  };

  const createPeerConnection = (targetUser: string) => {
    const peer = new RTCPeerConnection(rtcConfig);
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) peer.addTrack(track, localStreamRef.current);
      });
    }

    // Keep-alive DataChannel
    const dataChannel = peer.createDataChannel('keepalive', { negotiated: true, id: 0 });
    dataChannelsRef.current.set(targetUser, dataChannel);

    const pingInterval = setInterval(() => {
      if (dataChannel.readyState === 'open') {
        dataChannel.send('ping');
        console.log(`[WebRTC] Ping to ${targetUser}`);
      }
    }, 10000);
    heartbeatIntervalsRef.current.set(targetUser, pingInterval);

    // Debugging ICE state
    peer.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE Connection State for ${targetUser}:`, peer.iceConnectionState);
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') {
        console.warn(`[WebRTC] ICE failed/disconnected for ${targetUser}. Triggering ICE Restart...`);
        if (isVoiceJoinedRef.current) {
           peer.createOffer({ iceRestart: true })
             .then(offer => {
                return peer.setLocalDescription(offer).then(() => {
                   sendSignalingMessage(targetUser, 'offer', offer);
                });
             })
             .catch(err => console.error('ICE Restart Offer Error:', err));
        }
      }
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage(targetUser, 'ice-candidate', event.candidate);
      }
    };

    // Handle incoming audio tracks
    peer.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${targetUser}:`, event.track.kind);
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(targetUser, remoteStream);
        return next;
      });
    };

    peersRef.current.set(targetUser, peer);
    return peer;
  };

  const initiatePeerConnection = async (targetUser: string) => {
    if (peersRef.current.has(targetUser)) return; // Already connected
    const peer = createPeerConnection(targetUser);
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendSignalingMessage(targetUser, 'offer', offer);
    } catch (err) {
      console.error('Error creating offer', err);
    }
  };

  const handleReceiveOffer = async (fromUser: string, offer: RTCSessionDescriptionInit) => {
    if (!isVoiceJoinedRef.current) return; // If we aren't in voice, ignore offers
    
    const peer = peersRef.current.has(fromUser) 
      ? peersRef.current.get(fromUser)! 
      : createPeerConnection(fromUser);

    try {
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      sendSignalingMessage(fromUser, 'answer', answer);
    } catch (err) {
      console.error('Error handling offer', err);
    }
  };

  const handleReceiveAnswer = async (fromUser: string, answer: RTCSessionDescriptionInit) => {
    const peer = peersRef.current.get(fromUser);
    if (peer) {
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error setting remote description', err);
      }
    }
  };

  const handleReceiveIceCandidate = async (fromUser: string, candidate: RTCIceCandidateInit) => {
    const peer = peersRef.current.get(fromUser);
    if (peer) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate', err);
      }
    }
  };

  const removePeerConnection = (user: string) => {
    const peer = peersRef.current.get(user);
    if (peer) {
      peer.close();
      peersRef.current.delete(user);
    }
    const interval = heartbeatIntervalsRef.current.get(user);
    if (interval) {
      clearInterval(interval);
      heartbeatIntervalsRef.current.delete(user);
    }
    const dc = dataChannelsRef.current.get(user);
    if (dc) {
      dc.close();
      dataChannelsRef.current.delete(user);
    }
    setRemoteStreams(prev => {
      const next = new Map(prev);
      next.delete(user);
      return next;
    });
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsVoiceJoined(true);
      isVoiceJoinedRef.current = true;
      setIsMuted(false);
      
      // Connect to everyone already in the room
      if (channelRef.current) {
        const state = channelRef.current.presenceState();
        Object.values(state).forEach((presences: any) => {
           const user = presences[0]?.user;
           if (user && user !== userName) {
             initiatePeerConnection(user);
           }
        });
        
        // Broadcast intent to everyone else in case they need to connect to us
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signaling',
          payload: { targetUser: '*', fromUser: userName, type: 'voice_joined', data: null }
        });
      }
    } catch (err) {
      console.error('Failed to get microphone', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopVoice = () => {
    // Stop microphone
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setIsVoiceJoined(false);
    isVoiceJoinedRef.current = false;
    setIsMuted(false);
    
    // Close all peer connections
    peersRef.current.forEach(peer => peer.close());
    peersRef.current.clear();
    
    // Clear intervals
    heartbeatIntervalsRef.current.forEach(interval => clearInterval(interval));
    heartbeatIntervalsRef.current.clear();
    
    // Close DataChannels
    dataChannelsRef.current.forEach(dc => dc.close());
    dataChannelsRef.current.clear();

    setRemoteStreams(new Map());
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // --- UI HANDLERS ---

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !supabase) return;
    const text = newMessage.trim();
    setNewMessage('');
    scrollToBottom();
    await supabase.from('watch_party_messages').insert({
      room_id: roomId, user_name: userName, message: text
    });
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isRoomFull) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        backgroundColor: 'var(--surface)', borderRadius: '0.75rem',
        border: '1px solid #ef4444', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center'
      }}>
        <Users size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Room is Full</h2>
        <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>Maximum 5 users allowed in a Watch Party.</p>
        <button onClick={() => router.push('/')} className="btn btn-primary">
          Return to Homepage
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: 'var(--surface)', borderRadius: '0.75rem',
      border: '1px solid #333', overflow: 'hidden'
    }}>
      {/* Audio elements for remote streams */}
      {Array.from(remoteStreams.entries()).map(([user, stream]) => (
        <audio 
          key={user} 
          autoPlay 
          playsInline
          ref={el => { if (el && el.srcObject !== stream) el.srcObject = stream; }} 
          style={{ display: 'none' }} 
        />
      ))}

      {/* Header */}
      <div style={{
        padding: '1rem', borderBottom: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        backgroundColor: '#1a1a24'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Watch Party</h3>
            <span style={{ 
              backgroundColor: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent)', 
              padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' 
            }}>
              {usersCount} / 5
            </span>
          </div>
          
          <button 
            onClick={copyRoomLink}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent',
              border: '1px solid #444', color: '#ccc', padding: '0.4rem 0.8rem', borderRadius: '0.5rem',
              cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s'
            }}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Voice Controls */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isVoiceJoined ? (
             <button 
               onClick={startVoice}
               style={{
                 flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                 backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem',
                 borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
               }}
             >
               <Phone size={16} /> Join Voice
             </button>
          ) : (
            <>
               <button 
                 onClick={toggleMute}
                 style={{
                   flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                   backgroundColor: isMuted ? '#ef4444' : '#333', color: '#fff', border: 'none', padding: '0.5rem',
                   borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
                 }}
               >
                 {isMuted ? <MicOff size={16} /> : <Mic size={16} />} 
                 {isMuted ? 'Unmute' : 'Mute'}
               </button>
               <button 
                 onClick={stopVoice}
                 style={{
                   flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                   backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem',
                   borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
                 }}
               >
                 <PhoneOff size={16} /> Leave
               </button>
            </>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={chatContainerRef} style={{
        flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: '0.75rem', minHeight: '250px', maxHeight: '350px'
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 'auto', marginBottom: 'auto' }}>
            <p>Welcome to the Watch Party!</p>
            <p style={{ fontSize: '0.85rem' }}>Invite friends to start chatting.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ alignSelf: msg.user === userName ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{ 
                fontSize: '0.7rem', color: '#666', marginBottom: '2px',
                textAlign: msg.user === userName ? 'right' : 'left', padding: '0 4px'
              }}>
                {msg.user}
              </div>
              <div style={{
                backgroundColor: msg.user === userName ? 'var(--accent)' : '#2a2a35',
                color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '0.75rem',
                borderTopRightRadius: msg.user === userName ? '2px' : '0.75rem',
                borderTopLeftRadius: msg.user === userName ? '0.75rem' : '2px',
                fontSize: '0.9rem', wordBreak: 'break-word'
              }}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem', borderTop: '1px solid #333', backgroundColor: '#1a1a24' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1, backgroundColor: '#111', border: '1px solid #333', color: '#fff',
              padding: '0.6rem 1rem', borderRadius: '2rem', outline: 'none', fontSize: '0.9rem'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
          <button 
            type="submit" disabled={!newMessage.trim()}
            style={{
              backgroundColor: newMessage.trim() ? 'var(--accent)' : '#333',
              color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed', transition: 'background-color 0.2s'
            }}
          >
            <Send size={16} style={{ marginLeft: '2px' }} />
          </button>
        </form>
      </div>
    </div>
  );
}
