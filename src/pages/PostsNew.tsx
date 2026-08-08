import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Card, Button, Avatar } from '../components/ui';
import api from '../services/api';

const REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];
import {
  Megaphone,
  Plus,
  Lock,
  Heart,
  MessageCircle,
  Image,
  Paperclip,
  Send,
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  Smile,
  X
} from 'lucide-react';

interface PostData {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  targetDepartment?: string;
  likes: string[];
  comments: CommentData[];
  images?: string[];
  attachments?: AttachmentData[];
  createdAt: Date;
}

interface CommentData {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  image?: string;
  createdAt: Date;
}

interface AttachmentData {
  id: string;
  type: 'pdf' | 'excel' | 'word' | 'other';
  name: string;
  url: string;
  size: number;
}

const EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨', '👏', '🙌', '💪', '🚀', '⭐', '✅', '📊', '💼', '📈', '💰', '🎯', '🏆'];

const Posts: React.FC = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { canRead, canWrite, canDelete } = usePermissions();
  const canViewPosts = canRead('posts');
  const canWritePosts = canWrite('posts');
  const canDeletePosts = canDelete('posts');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isManager = ['dev', 'general_manager', 'administrative_manager'].includes(user?.role || '');
  const [pollOptions, setPollOptions] = useState<string[]>([]); // خيارات الاستطلاع (فاضية = مفيش استطلاع)

  const [formData, setFormData] = useState({
    content: '',
    targetDepartment: ''
  });

  // تحميل المنشورات من السيرفر (بتتحفظ فعلاً)
  const loadPosts = async () => {
    try {
      const res = await api.get('/posts');
      const list = (res.data || []).map((p: any) => ({ ...p, id: String(p.id || p._id) }));
      setPosts(list);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadPosts();

    const socket = (window as any).socket;
    if (socket) {
      socket.on('new-post', (data: any) => {
        loadPosts();
        if (data.authorId !== user?.id) {
          addNotification({
            userId: user?.id || '',
            type: 'system',
            title: 'منشور جديد',
            message: `${data.authorName} نشر منشوراً جديداً`,
            link: '/posts'
          });
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('new-post');
      }
    };
  }, [user]);

  const savePosts = (newPosts: PostData[]) => {
    setPosts(newPosts);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const attachments: AttachmentData[] = selectedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : 'other',
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size
    }));

    // استطلاع رأي (لو المستخدم ضاف خيارين على الأقل)
    const validPollOpts = pollOptions.map((t) => t.trim()).filter(Boolean);
    const poll = validPollOpts.length >= 2
      ? { question: formData.content, options: validPollOpts.map((text, i) => ({ id: `o${i}`, text, votes: [] })) }
      : undefined;

    try {
      await api.post('/posts', {
        content: formData.content,
        targetDepartment: formData.targetDepartment || undefined,
        images: selectedImages.length > 0 ? selectedImages : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        poll,
      });
      const socket = (window as any).socket;
      if (socket) socket.emit('new-post', { authorId: user?.id });
      setShowModal(false);
      resetForm();
      await loadPosts();
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setFormData({ content: '', targetDepartment: '' });
    setSelectedImages([]);
    setSelectedFiles([]);
    setPollOptions([]);
  };

  // تفاعل بإيموجي (متعدد)
  const handleReact = async (postId: string, emoji: string) => {
    try { await api.post(`/posts/${postId}/react`, { emoji }); await loadPosts(); } catch { /* ignore */ }
    setShowEmojiPicker(null);
  };

  const handlePin = async (postId: string) => {
    try { await api.post(`/posts/${postId}/pin`, {}); await loadPosts(); } catch { /* ignore */ }
  };

  const handleVote = async (postId: string, optionId: string) => {
    try { await api.post(`/posts/${postId}/vote`, { optionId }); await loadPosts(); } catch { /* ignore */ }
  };

  const handleAddComment = async (postId: string) => {
    const comment = newComment[postId];
    if (!comment?.trim()) return;
    try {
      await api.post(`/posts/${postId}/comments`, { content: comment });
      setNewComment({ ...newComment, [postId]: '' });
      await loadPosts();
    } catch { /* ignore */ }
  };

  const insertEmoji = (emoji: string, postId?: string) => {
    if (postId) {
      setNewComment(prev => ({
        ...prev,
        [postId]: (prev[postId] || '') + emoji
      }));
    } else {
      setFormData(prev => ({ ...prev, content: prev.content + emoji }));
    }
    setShowEmojiPicker(null);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-error-500" />;
      case 'excel': return <FileSpreadsheet className="w-8 h-8 text-success-500" />;
      case 'word': return <FileText className="w-8 h-8 text-info-500" />;
      default: return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Permission Guard
  if (!canViewPosts) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى المنشورات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            المنشورات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">شارك أفكارك وملفاتك مع الفريق</p>
        </div>
        {canWritePosts && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            منشور جديد
          </Button>
        )}
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <Card>
            <Card.Body className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                  <Megaphone className="w-10 h-10 text-brand-500" />
                </div>
                <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد منشورات بعد</h3>
                <p className="text-gray-500 dark:text-gray-500 mb-6">كن أول من يشارك شيئاً مع الفريق</p>
                {canWritePosts && (
                  <Button onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4" />
                    إنشاء منشور
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className={`overflow-hidden ${(post as any).pinned ? 'ring-2 ring-amber-300 dark:ring-amber-500/40' : ''}`}>
              {(post as any).pinned && (
                <div className="bg-amber-50 dark:bg-amber-500/10 px-6 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  📌 منشور مثبّت
                </div>
              )}
              {/* Post Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center">
                  <Avatar src={post.authorAvatar || (post.authorId as any)?.avatar} alt={post.authorName} size="medium" />
                  <div className="mr-4 flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{post.authorName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(post.createdAt).toLocaleString('ar-EG', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {post.authorId === user?.id && canDeletePosts && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletePostId(post.id)}
                      className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <Card.Body className="p-6">
                <p className="text-gray-800 dark:text-white text-lg leading-relaxed whitespace-pre-wrap break-words mb-4">
                  {post.content}
                </p>

                {/* استطلاع رأي */}
                {(post as any).poll?.options?.length > 0 && (() => {
                  const poll = (post as any).poll;
                  const total = poll.options.reduce((s: number, o: any) => s + (o.votes?.length || 0), 0);
                  const myVote = poll.options.find((o: any) => (o.votes || []).some((v: any) => String(v) === String(user?.id)))?.id;
                  return (
                    <div className="mb-4 space-y-2">
                      {poll.options.map((o: any) => {
                        const n = o.votes?.length || 0;
                        const pct = total ? Math.round((n / total) * 100) : 0;
                        const mine = myVote === o.id;
                        return (
                          <button key={o.id} onClick={() => handleVote(post.id, o.id)}
                            className={`relative w-full overflow-hidden rounded-lg border text-start ${mine ? 'border-brand-400 dark:border-brand-500/50' : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="absolute inset-y-0 start-0 bg-brand-100 dark:bg-brand-500/20 transition-all" style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center justify-between px-3 py-2.5">
                              <span className="font-medium text-gray-800 dark:text-gray-100">{mine ? '✓ ' : ''}{o.text}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{pct}% ({n})</span>
                            </div>
                          </button>
                        );
                      })}
                      <p className="text-xs text-gray-400">{total} صوت · اضغط للتصويت أو التغيير</p>
                    </div>
                  );
                })()}

                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div className={`grid gap-2 mb-4 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Post"
                        className="w-full rounded-xl object-cover max-h-96 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                )}

                {/* Attachments */}
                {post.attachments && post.attachments.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {post.attachments.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        download={file.name}
                        className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group border border-gray-100 dark:border-gray-700"
                      >
                        <span className="mr-3">{getFileIcon(file.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 break-words">{file.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                        <Download className="w-5 h-5 text-gray-400 group-hover:text-brand-500" />
                      </a>
                    ))}
                  </div>
                )}
              </Card.Body>

              {/* Actions — تفاعلات إيموجي */}
              {(() => {
                const reactions: any[] = (post as any).reactions || [];
                const myReaction = reactions.find((r) => String(r.userId) === String(user?.id))?.emoji;
                const counts: Record<string, number> = {};
                reactions.forEach((r) => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
                const shown = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                return (
                  <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 flex-wrap relative">
                    {/* عدّادات التفاعلات الظاهرة */}
                    {shown.map(([emoji, n]) => (
                      <button key={emoji} onClick={() => handleReact(post.id, emoji)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-all ${
                          myReaction === emoji ? 'bg-brand-50 dark:bg-brand-500/15 ring-1 ring-brand-300 dark:ring-brand-500/40' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                        <span>{emoji}</span><span className="text-gray-600 dark:text-gray-300 font-medium">{n}</span>
                      </button>
                    ))}
                    {/* زر إضافة تفاعل */}
                    <div className="relative">
                      <button onClick={() => setShowEmojiPicker(showEmojiPicker === `react-${post.id}` ? null : `react-${post.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
                        <Heart className="w-4 h-4" /> تفاعل
                      </button>
                      {showEmojiPicker === `react-${post.id}` && (
                        <div className="absolute bottom-full mb-2 z-20 flex gap-1 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                          {REACTIONS.map((e) => (
                            <button key={e} onClick={() => handleReact(post.id, e)} className={`text-2xl hover:scale-125 transition-transform ${myReaction === e ? 'scale-110' : ''}`}>{e}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="flex items-center gap-1 px-2 text-sm text-gray-500 dark:text-gray-400">
                      <MessageCircle className="w-4 h-4" /> {post.comments.length}
                    </span>
                    {isManager && (
                      <button onClick={() => handlePin(post.id)}
                        className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${(post as any).pinned ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200'}`}>
                        📌 {(post as any).pinned ? 'مثبّت' : 'تثبيت'}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Comments */}
              {post.comments.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <Avatar src={comment.authorAvatar || (comment.authorId as any)?.avatar} alt={comment.authorName} size="small" />
                      <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">{comment.authorName}</p>
                        <p className="text-gray-700 dark:text-gray-300 break-words">{comment.content}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {new Date(comment.createdAt).toLocaleString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                <div className="flex items-center gap-3">
                  <Avatar src={user?.avatar} alt={user?.name || ''} size="small" />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newComment[post.id] || ''}
                      onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 pl-12"
                      placeholder="اكتب تعليقاً..."
                    />
                    <button
                      onClick={() => setShowEmojiPicker(showEmojiPicker === post.id ? null : post.id)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    {showEmojiPicker === post.id && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-5 sm:grid-cols-10 gap-1 z-10 max-w-[calc(100vw-2rem)]">
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => insertEmoji(emoji, post.id)}
                            className="text-xl hover:scale-125 transition-transform p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => handleAddComment(post.id)} size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Post Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title="إنشاء منشور جديد"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
              placeholder="ماذا تريد أن تشارك؟"
              rows={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(showEmojiPicker === 'modal' ? null : 'modal')}
              className="absolute left-3 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Smile className="w-5 h-5" />
            </button>
            {showEmojiPicker === 'modal' && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-5 sm:grid-cols-10 gap-1 z-10 max-w-[calc(100vw-2rem)]">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="text-xl hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* استطلاع رأي (اختياري) */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">📊 استطلاع رأي (اختياري)</span>
              {pollOptions.length === 0 ? (
                <button type="button" onClick={() => setPollOptions(['', ''])} className="text-xs font-medium text-brand-600 dark:text-brand-400">+ إضافة استطلاع</button>
              ) : (
                <button type="button" onClick={() => setPollOptions([])} className="text-xs font-medium text-rose-500">إزالة</button>
              )}
            </div>
            {pollOptions.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-400">نص المنشور فوق = سؤال الاستطلاع.</p>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={opt} onChange={(e) => { const c = [...pollOptions]; c[i] = e.target.value; setPollOptions(c); }}
                      placeholder={`خيار ${i + 1}`} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white" />
                    {pollOptions.length > 2 && <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-rose-500 px-2">✕</button>}
                  </div>
                ))}
                {pollOptions.length < 6 && <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-medium text-brand-600 dark:text-brand-400">+ خيار آخر</button>}
              </div>
            )}
          </div>

          {/* Image Preview */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 bg-error-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* File Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Paperclip className="w-5 h-5 text-gray-400 ml-2" />
                  <span className="flex-1 font-medium text-gray-700 dark:text-gray-200 text-sm">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                    className="text-error-500 hover:text-error-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
            >
              <Image className="w-4 h-4" />
              صور
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
              ملفات
            </Button>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.doc,.docx"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Megaphone className="w-4 h-4" />
              نشر
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="flex-1"
            >
              <X className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletePostId}
        onClose={() => setDeletePostId(null)}
        onConfirm={async () => {
          try { await api.delete(`/posts/${deletePostId}`); } catch { /* ignore */ }
          setDeletePostId(null);
          await loadPosts();
        }}
        title="حذف المنشور"
        message="هل أنت متأكد من حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default Posts;
