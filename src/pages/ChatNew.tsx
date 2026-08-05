import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Search, Send, Paperclip, Smile, FileText, X,
  MoreHorizontal, ArrowRight
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
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [typingFrom, setTypingFrom] = useState<string | null>(null);
  const typingTimer = React.useRef<any>(null);
  const lastTypingEmit = React.useRef<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
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
              initials: getInitials(u.name),
              avatar: u.avatar || ''
            };
          });

        setAllUsers(users);
        // على الموبايل نسيب القايمة تبان الأول؛ الاختيار التلقائي للشاشات الكبيرة بس
        if (users.length > 0 && !selectedUser && window.innerWidth >= 640) {
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

      const handlePresence = (ids: string[]) => {
        setOnlineIds(new Set((ids || []).map((x) => String(x))));
      };
      const handleUserTyping = (data: any) => {
        setTypingFrom(String(data?.userId));
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingFrom(null), 2500);
      };

      socket.on('new-message', handleNewMessage);
      socket.on('presence', handlePresence);
      socket.on('user-typing', handleUserTyping);
      socket.emit('get-presence');

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('presence', handlePresence);
        socket.off('user-typing', handleUserTyping);
      };
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUser, allMessages]);

  // فتح محادثة محددة عند القدوم من إشعار (/chat?user=<id>)
  useEffect(() => {
    const uid = searchParams.get('user');
    if (!uid || !allUsers.length) return;
    const target = allUsers.find(u => String(u.id) === String(uid));
    if (target) {
      setSelectedUser(target);
      const next = new URLSearchParams(searchParams);
      next.delete('user');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsers, searchParams]);

  // علّم رسائل المحادثة مقروءة عند فتحها (يصفّي شارة غير المقروء)
  useEffect(() => {
    if (!selectedUser || !user) return;
    const hasUnread = allMessages.some(m => String(m.senderId) === String(selectedUser.id) && String(m.receiverId) === String(user.id) && !m.isRead);
    if (!hasUnread) return;
    setAllMessages(prev => prev.map(m =>
      (String(m.senderId) === String(selectedUser.id) && String(m.receiverId) === String(user.id) && !m.isRead)
        ? { ...m, isRead: true } : m
    ));
    api.put(`/messages/conversation/${selectedUser.id}/read`).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

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

  // عدد الرسائل غير المقروءة من مستخدم معيّن
  const unreadFrom = (userId: string) =>
    allMessages.filter(m => String(m.senderId) === String(userId) && String(m.receiverId) === String(user?.id) && !m.isRead).length;

  const filteredUsers = allUsers
    .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // اللي بعتولي رسائل غير مقروءة يطلعوا فوق، بعدين الأحدث محادثة
      const ua = unreadFrom(a.id), ub = unreadFrom(b.id);
      if ((ua > 0) !== (ub > 0)) return ua > 0 ? -1 : 1;
      const la = getLastMessage(a.id), lb = getLastMessage(b.id);
      const ta = la ? new Date(la.timestamp).getTime() : 0;
      const tb = lb ? new Date(lb.timestamp).getTime() : 0;
      if (ta !== tb) return tb - ta;
      return (a.name || '').localeCompare(b.name || '');
    });

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
      <div className={`${selectedUser ? 'hidden sm:flex' : 'flex'} w-full sm:w-64 lg:w-80 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900`}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">المحادثات</h2>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium px-2 py-1 rounded-full">
              {activeConversationsCount}
            </span>
          </div>

          <div className="relative mb-2 block">
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

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-4 pb-4 space-y-1">
          {filteredUsers.map((chatUser, idx) => {
            const lastMsg = getLastMessage(chatUser.id);
            const isSelected = selectedUser?.id === chatUser.id;
            const unread = unreadFrom(chatUser.id);

            return (
              <div
                key={chatUser.id || idx}
                onClick={() => setSelectedUser(chatUser)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-start gap-3 ${
                  isSelected 
                    ? 'bg-brand-50 dark:bg-brand-600/10 border border-brand-200 dark:border-brand-500/20' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="relative">
                  {chatUser.avatar ? (
                    <img src={chatUser.avatar} alt={chatUser.name} className="w-12 h-12 rounded-full object-cover shadow-lg" />
                  ) : (
                    <div className={`w-12 h-12 rounded-full ${chatUser.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {chatUser.initials}
                    </div>
                  )}
                  {onlineIds.has(String(chatUser.id)) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={`text-sm truncate ${unread > 0 ? 'font-extrabold text-gray-900 dark:text-white' : `font-semibold ${isSelected ? 'text-brand-900 dark:text-white' : 'text-gray-900 dark:text-gray-200'}`}`}>
                      {chatUser.name}
                    </h3>
                    {lastMsg && (
                      <span className={`text-[10px] whitespace-nowrap ml-2 ${unread > 0 ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-gray-500'}`}>
                        {formatTime(lastMsg.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${unread > 0 ? 'font-bold text-gray-800 dark:text-gray-100' : isSelected ? 'text-brand-700 dark:text-brand-200' : 'text-gray-500'}`}>
                      {lastMsg ? lastMsg.content : 'Start a conversation'}
                    </p>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${selectedUser ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-white dark:bg-gray-900 relative`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-20 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 sm:px-6 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                {/* زر الرجوع لقائمة الموظفين (موبايل) */}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="sm:hidden p-2 -ms-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="رجوع"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div className="relative">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-10 h-10 rounded-full object-cover shadow-md" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full ${selectedUser.avatarColor} flex items-center justify-center text-white font-semibold shadow-md`}>
                      {selectedUser.initials}
                    </div>
                  )}
                  {onlineIds.has(String(selectedUser.id)) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg leading-tight truncate">{selectedUser.name}</h3>
                  {typingFrom && String(typingFrom) === String(selectedUser.id) ? (
                    <p className="text-success-600 dark:text-success-400 text-xs font-medium animate-pulse">بيكتب الآن...</p>
                  ) : (
                    <p className="text-brand-600 dark:text-brand-400 text-xs font-medium">
                      {onlineIds.has(String(selectedUser.id)) ? 'متصل الآن' : 'غير متصل'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-6 bg-white dark:bg-gray-900">
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
                      <div className={`flex max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 sm:gap-3`}>
                        {/* Avatar for received messages */}
                        {!isMe && (
                          <div className={`w-8 h-8 rounded-full ${selectedUser.avatarColor} flex-shrink-0 flex items-center justify-center text-xs text-white font-bold`}>
                            {selectedUser.initials}
                          </div>
                        )}
                        
                        <div className={`group relative`}>
                          <div 
                            className={`px-4 sm:px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed break-words ${
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
            <div className="p-3 sm:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
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
                  {selectedFiles.map((_file, i) => (
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
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    const socket = (window as any).socket;
                    const now = Date.now();
                    if (socket && selectedUser && now - lastTypingEmit.current > 900) {
                      lastTypingEmit.current = now;
                      socket.emit('typing', { receiverId: selectedUser.id, senderId: user?.id });
                    }
                  }}
                  placeholder="اكتب رسالتك هنا..."
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
                      <div className="absolute bottom-full right-0 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 w-72 max-w-[calc(100vw-2rem)] grid grid-cols-8 gap-2 z-50">
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
