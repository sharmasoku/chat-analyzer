import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import axios from 'axios';
import './ChatPanel.css';

/**
 * Converts basic markdown formatting to React elements.
 * Supports: **bold**, *italic*, `code`, and line breaks.
 */
function formatMarkdown(text) {
  if (!text) return text;

  // Split by line breaks first
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    // Tokenize the line for bold, italic, and code
    const parts = [];
    // Regex to match **bold**, *italic*, or `code`
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      // Push text before the match
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      if (match[2]) {
        // **bold**
        parts.push(<strong key={`${lineIndex}-b-${match.index}`}>{match[2]}</strong>);
      } else if (match[3]) {
        // *italic*
        parts.push(<em key={`${lineIndex}-i-${match.index}`}>{match[3]}</em>);
      } else if (match[4]) {
        // `code`
        parts.push(<code key={`${lineIndex}-c-${match.index}`} style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.9em' }}>{match[4]}</code>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Push remaining text
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    // If line is empty, just return a line break
    if (parts.length === 0) {
      return <br key={`br-${lineIndex}`} />;
    }

    return (
      <span key={`line-${lineIndex}`}>
        {lineIndex > 0 && <br />}
        {parts}
      </span>
    );
  });
}

const API_BASE = 'http://localhost:8000/api';

const SUGGESTIONS = [
  "Who is the most active user?",
  "What time is the group most active?",
  "Summarize the chat activity",
  "Who sends the longest messages?",
  "What are the most discussed topics?",
];

export default function ChatPanel({ sessionId, selectedUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hey! 👋 I'm your AI Chat Analyst, powered by Google Gemini. Ask me anything about your WhatsApp data — who's most active, busiest hours, common topics, and more!",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (text) => {
    const question = text || input.trim();
    if (!question || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/chat/${sessionId}`, {
        question,
        selected_user: selectedUser,
      });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: "Oops! Something went wrong. Please try again. 😅",
      }]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="chat-fab"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Ask AI about your chat"
          >
            <Sparkles size={26} />
            <span className="chat-fab-badge">AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-panel"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <div className="chat-header-icon">
                  <Bot size={22} />
                </div>
                <div>
                  <h3>AI Chat Analyst</h3>
                  <span className="chat-header-status">
                    <span className="status-dot"></span>
                    Powered by Gemini
                  </span>  
                </div>
              </div>
              <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`chat-bubble ${msg.role}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="chat-avatar">
                    {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className="chat-bubble-content">
                    {msg.role === 'ai' ? formatMarkdown(msg.text) : msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  className="chat-bubble ai"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="chat-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="chat-bubble-content">
                    <div className="chat-typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (show only if just the welcome message exists) */}
            {messages.length <= 1 && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="chat-suggestion-btn"
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="chat-input-area">
              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                placeholder="Ask about your chat data..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button
                className="chat-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
