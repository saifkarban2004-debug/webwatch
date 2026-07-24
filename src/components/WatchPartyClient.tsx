'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Send, Copy, Check } from 'lucide-react';

interface WatchPartyClientProps {
  roomId: string;
}

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

export default function WatchPartyClient({ roomId }: WatchPartyClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [usersCount, setUsersCount] = useState(1);
  const [userName, setUserName] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate a random name if not set
  useEffect(() => {
    setUserName(`User-${Math.floor(Math.random() * 10000)}`);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!userName || !supabase) return;

    // Create a channel for this specific room
    const room = supabase.channel(`room_${roomId}`, {
      config: {
        presence: {
          key: userName,
        },
      },
    });

    // Listen for Presence state changes (users joining/leaving)
    room
      .on('presence', { event: 'sync' }, () => {
        const state = room.presenceState();
        const activeUsers = Object.keys(state).length;
        setUsersCount(activeUsers > 0 ? activeUsers : 1);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Optional: show system message "User X joined"
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Optional: show system message "User X left"
      });

    // Listen for broadcast chat messages
    room.on('broadcast', { event: 'chat' }, (payload) => {
      setMessages((prev) => [...prev, payload.payload as Message]);
    });

    // Subscribe to the channel
    room.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await room.track({ user: userName, onlineAt: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(room);
    };
  }, [roomId, userName]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !supabase) return;

    const msg: Message = {
      id: Math.random().toString(36).substring(7),
      user: userName,
      text: newMessage.trim(),
      timestamp: Date.now(),
    };

    // Optimistically add to our own UI
    setMessages((prev) => [...prev, msg]);
    setNewMessage('');

    // Broadcast to others in the room
    await supabase.channel(`room_${roomId}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    });
  };

  const copyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--surface)',
      borderRadius: '0.75rem',
      border: '1px solid #333',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1a1a24'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Watch Party</h3>
          <span style={{ 
            backgroundColor: 'rgba(99, 102, 241, 0.2)', 
            color: 'var(--accent)', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            fontSize: '0.75rem',
            fontWeight: 'bold' 
          }}>
            {usersCount} Online
          </span>
        </div>
        
        <button 
          onClick={copyRoomLink}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'transparent',
            border: '1px solid #444',
            color: '#ccc',
            padding: '0.4rem 0.8rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#444'}
        >
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        padding: '1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minHeight: '300px',
        maxHeight: '400px'
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 'auto', marginBottom: 'auto' }}>
            <p>Welcome to the Watch Party!</p>
            <p style={{ fontSize: '0.85rem' }}>Invite friends to start chatting.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{
              alignSelf: msg.user === userName ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}>
              <div style={{ 
                fontSize: '0.7rem', 
                color: '#666', 
                marginBottom: '2px',
                textAlign: msg.user === userName ? 'right' : 'left',
                padding: '0 4px'
              }}>
                {msg.user}
              </div>
              <div style={{
                backgroundColor: msg.user === userName ? 'var(--accent)' : '#2a2a35',
                color: '#fff',
                padding: '0.6rem 0.8rem',
                borderRadius: '0.75rem',
                borderTopRightRadius: msg.user === userName ? '2px' : '0.75rem',
                borderTopLeftRadius: msg.user === userName ? '0.75rem' : '2px',
                fontSize: '0.9rem',
                wordBreak: 'break-word'
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
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              backgroundColor: '#111',
              border: '1px solid #333',
              color: '#fff',
              padding: '0.6rem 1rem',
              borderRadius: '2rem',
              outline: 'none',
              fontSize: '0.9rem'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            style={{
              backgroundColor: newMessage.trim() ? 'var(--accent)' : '#333',
              color: '#fff',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s'
            }}
          >
            <Send size={16} style={{ marginLeft: '2px' }} />
          </button>
        </form>
      </div>
    </div>
  );
}
