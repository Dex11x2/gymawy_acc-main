import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Search, Send, Paperclip, Smile, FileText, X,
  MoreVertical, Users, Phone, Video, Info, MoreHorizontal,
  Image as ImageIcon, Mic, ChevronDown, Bell, Calendar, Mail
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: MessageAttachment[];
}

interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  size: number;
}

const EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨', '👏', '🙌', '💪', '🚀', '⭐', '✅', '📊', '💼', '📈', '💰', '🎯', '🏆'];

// Avatar colors for initials
const AVATAR_COLORS = [
  'bg-brand-500',
  'bg-success-500',
  'bg-warning-500',
  'bg-error-500',
  'bg-theme-purple-500',
  'bg-theme-pink-500',
  'bg-blue-light-500',
  'bg-orange-500'
];

const getAvatarColor = (index: number) => {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
};

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Chat: React.FC = () => {
  const authStore = useAuthStore();
  const user = authStore.user;
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfileSidebar, setShowProfileSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { getUserNotifications, deleteNotification } = useNotificationStore();

  useEffect(() => {
    if (user) {
      const messageNotifications = getUserNotifications(user.id).filter(n => n.type === 'message');
      messageNotifications.forEach(n => deleteNotification(n.id));
    }
  }, [user?.id]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await api.get('/messages');
        const messages = response.data.map((m: any) => ({
          id: m._id,
          senderId: m.senderId._id || m.senderId,
          receiverId: m.receiverId._id || m.receiverId,
          content: m.content,
          timestamp: new Date(m.createdAt),
          isRead: m.isRead
        }));
        setAllMessages(messages);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    if (user) {
      loadMessages();
    }

    const loadAllUsers = async () => {
      try {
        const response = await api.get('/users');
        const allUsersData = response.data || [];

        const users = allUsersData
          .filter((u: any) => {
            const isSameUser = String(u._id) === String(user?.id) || u.email === user?.email;
            return !isSameUser;
          })
          .map((u: any, index: number) => {
            const userId = u._id || u.id;
            return {
              id: userId,
              name: u.name,
              email: u.email,
              role: u.role || 'User',
              isOnline: Math.random() > 0.3, // Mock online status if not real
              avatarColor: getAvatarColor(index),
              initials: getInitials(u.name)
            };
          });

        setAllUsers(users);
        if (users.length > 0 && !selectedUser) {
          setSelectedUser(users[0]);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadAllUsers();

    const socket = (window as any).socket;
    if (socket) {
      const handleNewMessage = async (data: any) => {
        const isForMe = String(data.receiverId) === String(user?.id);
        const isFromMe = String(data.senderId) === String(user?.id);

        if (isForMe && !isFromMe) {
          const newMsg: Message = {
            id: Date.now().toString() + Math.random(),
            senderId: data.senderId,
            receiverId: user?.id || '',
            content: data.content,
            timestamp: new Date(data.timestamp || new Date()),
            isRead: false
          };
          setAllMessages(prev => [...prev, newMsg]);
        }
      };

      socket.on('new-message', handleNewMessage);
      return () => {
        socket.off('new-message', handleNewMessage);
      };
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUser, allMessages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setSelectedFiles(prev => [...prev, ...Array.from(files)]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || !selectedUser) return;

    const attachments: MessageAttachment[] = [
      ...selectedImages.map(img => ({
        id: Date.now().toString() + Math.random(),
        type: 'image' as const,
        name: 'image.jpg',
        url: img,
        size: 0
      })),
      ...selectedFiles.map(file => ({
        id: Date.now().toString() + Math.random(),
        type: 'file' as const,
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size
      }))
    ];

    try {
      const response = await api.post('/messages', {
        receiverId: selectedUser.id,
        content: newMessage.trim()
      });

      const savedMessage: Message = {
        id: response.data._id,
        senderId: user?.id || '',
        receiverId: selectedUser.id,
        content: newMessage,
        timestamp: new Date(response.data.createdAt),
        isRead: false,
        attachments: attachments.length > 0 ? attachments : undefined
      };

      setAllMessages(prev => [...prev, savedMessage]);

      const socket = (window as any).socket;
      if (socket && socket.connected) {
        socket.emit('send-message', {
          senderId: user?.id,
          receiverId: selectedUser.id,
          content: newMessage,
          senderName: user?.name,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }

    setNewMessage('');
    setSelectedImages([]);
    setSelectedFiles([]);
  };

  const getConversationMessages = () => {
    if (!selectedUser || !user) return [];
    return allMessages.filter(msg =>
      (msg.senderId === user.id && msg.receiverId === selectedUser.id) ||
      (msg.senderId === selectedUser.id && msg.receiverId === user.id)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getLastMessage = (userId: string) => {
    const messages = allMessages.filter(msg =>
      (msg.senderId === user?.id && msg.receiverId === userId) ||
      (msg.senderId === userId && msg.receiverId === user?.id)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return messages[0];
  };

  // Format time like "1:55pm"
  const formatTime = (date: Date) => {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr}${ampm}`;
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conversationMessages = getConversationMessages();

  const handleDeleteConversation = () => {
    const updated = allMessages.filter(msg =>
      !(msg.senderId === selectedUser.id || msg.receiverId === selectedUser.id)
    );
    setAllMessages(updated);
    setShowDeleteConfirm(false);
  };

  // Get active conversations count
  const activeConversationsCount = allUsers.filter(u => {
    const lastMsg = getLastMessage(u.id);
    return lastMsg !== undefined;
  }).length || 0;

  return (
    <div className="h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex font-outfit">
      
      {/* Left Sidebar - Active Conversations */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Conversations</h2>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium px-2 py-1 rounded-full">
              {activeConversationsCount}
            </span>
          </div>

          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 border border-transparent focus:border-brand-500 transition-all placeholder-gray-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-1">
          {filteredUsers.map((chatUser, idx) => {
            const lastMsg = getLastMessage(chatUser.id);
            const isSelected = selectedUser?.id === chatUser.id;
            
            return (
              <div
                key={chatUser.id || idx}
                onClick={() => setSelectedUser(chatUser)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                  isSelected 
                    ? 'bg-brand-50 dark:bg-brand-600/10 border border-brand-200 dark:border-brand-500/20' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full ${chatUser.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {chatUser.initials}
                  </div>
                  {chatUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-brand-900 dark:text-white' : 'text-gray-900 dark:text-gray-200'}`}>
                      {chatUser.name}
                    </h3>
                    {lastMsg && (
                      <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                        {formatTime(lastMsg.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${isSelected ? 'text-brand-700 dark:text-brand-200' : 'text-gray-500'}`}>
                    {lastMsg ? lastMsg.content : 'Start a conversation'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 relative">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-20 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full ${selectedUser.avatarColor} flex items-center justify-center text-white font-semibold shadow-md`}>
                    {selectedUser.initials}
                  </div>
                  {selectedUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{selectedUser.name}</h3>
                  <p className="text-brand-600 dark:text-brand-400 text-xs font-medium">
                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowProfileSidebar(!showProfileSidebar)}
                  className={`p-2 rounded-full transition-colors ${showProfileSidebar ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <Info className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white dark:bg-gray-900">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-50">
                  <Send className="w-16 h-16 mb-4" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                conversationMessages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
                        {/* Avatar for received messages */}
                        {!isMe && (
                          <div className={`w-8 h-8 rounded-full ${selectedUser.avatarColor} flex-shrink-0 flex items-center justify-center text-xs text-white font-bold`}>
                            {selectedUser.initials}
                          </div>
                        )}
                        
                        <div className={`group relative`}>
                          <div 
                            className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                              isMe 
                                ? 'bg-brand-600 text-white rounded-br-none' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
                            }`}
                          >
                            {msg.content}
                            
                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {msg.attachments.map(att => (
                                  <div key={att.id} className="bg-black/10 dark:bg-black/20 rounded p-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs underline truncate max-w-[150px]">{att.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] text-gray-500 mt-1 block ${isMe ? 'text-right' : 'text-left'}`}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              {/* Preview */}
              {(selectedImages.length > 0 || selectedFiles.length > 0) && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {selectedImages.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group">
                      <FileText className="w-8 h-8 text-gray-400" />
                      <button 
                        onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/50 transition-all">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type something here..."
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none px-2 py-2"
                />

                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-xl transition-colors relative"
                  >
                    <Smile className="w-5 h-5" />
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 w-72 grid grid-cols-8 gap-2 z-50">
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </button>
                  
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() && selectedImages.length === 0 && selectedFiles.length === 0}
                    className="p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 ml-1"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
              
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-pulse-slow">
              <Send className="w-10 h-10 text-brand-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Chat</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">Select a conversation from the left sidebar to start messaging with your team.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Profile */}
      {showProfileSidebar && selectedUser && (
        <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hidden xl:flex flex-col animate-slideInRight">
          <div className="p-8 flex flex-col items-center text-center border-b border-gray-200 dark:border-gray-800">
            <div className="relative mb-6">
              <div className={`w-28 h-28 rounded-full ${selectedUser.avatarColor} flex items-center justify-center text-white font-bold text-4xl shadow-2xl ring-4 ring-white dark:ring-gray-800`}>
                {selectedUser.initials}
              </div>
              {selectedUser.isOnline && (
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-success-500 border-4 border-white dark:border-gray-900 rounded-full"></div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{selectedUser.name}</h2>
            <p className="text-brand-600 dark:text-brand-400 text-sm font-medium mb-4">{selectedUser.role || 'UI/UX Designer'}</p>
            
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque so ferme.
            </p>

            <div className="flex items-center gap-2 mb-6">
              <button className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-brand-500/20">
                Follow
              </button>
              <button className="p-2.5 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-4 justify-center w-full">
               {/* Social Icons Mockup */}
               {['facebook', 'twitter', 'linkedin', 'globe'].map((icon, i) => (
                 <div key={i} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white hover:bg-brand-600 transition-all cursor-pointer">
                   <span className="text-xs">•</span>
                 </div>
               ))}
            </div>
          </div>

          <div className="p-6 space-y-6">
             <div className="space-y-4">
               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Information</h4>
               <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                 <Mail className="w-4 h-4 text-gray-500" />
                 <span className="truncate">{selectedUser.email}</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                 <Phone className="w-4 h-4 text-gray-500" />
                 <span>+1 234 567 890</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                 <Calendar className="w-4 h-4 text-gray-500" />
                 <span>Joined Nov 2023</span>
               </div>
             </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConversation}
        title="Delete Conversation"
        message={`Are you sure you want to delete all messages with ${selectedUser?.name}?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Chat;
