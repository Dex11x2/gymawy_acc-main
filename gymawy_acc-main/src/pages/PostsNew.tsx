import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Card, Button, Avatar } from '../components/ui';
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

  const [formData, setFormData] = useState({
    content: '',
    targetDepartment: ''
  });

  useEffect(() => {
    setPosts([]);

    const socket = (window as any).socket;
    if (socket) {
      socket.on('new-post', (data: any) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const attachments: AttachmentData[] = selectedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : 'other',
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size
    }));

    const newPost: PostData = {
      id: Date.now().toString(),
      authorId: user?.id || '',
      authorName: user?.name || '',
      content: formData.content,
      targetDepartment: formData.targetDepartment || undefined,
      likes: [],
      comments: [],
      images: selectedImages.length > 0 ? selectedImages : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date()
    };

    savePosts([newPost, ...posts]);

    addNotification({
      userId: 'all',
      type: 'system',
      title: 'منشور جديد',
      message: `${user?.name} نشر منشوراً جديداً`,
      link: '/posts'
    });

    const socket = (window as any).socket;
    if (socket) {
      socket.emit('new-post', newPost);
    }

    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ content: '', targetDepartment: '' });
    setSelectedImages([]);
    setSelectedFiles([]);
  };

  const handleLike = (postId: string) => {
    const updated = posts.map(post => {
      if (post.id === postId) {
        const likes = post.likes.includes(user?.id || '')
          ? post.likes.filter(id => id !== user?.id)
          : [...post.likes, user?.id || ''];
        return { ...post, likes };
      }
      return post;
    });
    savePosts(updated);
  };

  const handleAddComment = (postId: string) => {
    const comment = newComment[postId];
    if (!comment?.trim()) return;

    const updated = posts.map(post => {
      if (post.id === postId) {
        const newCommentData: CommentData = {
          id: Date.now().toString(),
          authorId: user?.id || '',
          authorName: user?.name || '',
          content: comment,
          createdAt: new Date()
        };
        return { ...post, comments: [...post.comments, newCommentData] };
      }
      return post;
    });

    savePosts(updated);
    setNewComment({ ...newComment, [postId]: '' });
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
            <Card key={post.id} className="overflow-hidden">
              {/* Post Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center">
                  <Avatar alt={post.authorName} size="medium" />
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
                <p className="text-gray-800 dark:text-white text-lg leading-relaxed whitespace-pre-wrap mb-4">
                  {post.content}
                </p>

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
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">{file.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                        <Download className="w-5 h-5 text-gray-400 group-hover:text-brand-500" />
                      </a>
                    ))}
                  </div>
                )}
              </Card.Body>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                    post.likes.includes(user?.id || '')
                      ? 'bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${post.likes.includes(user?.id || '') ? 'fill-current' : ''}`} />
                  <span>{post.likes.length}</span>
                </button>

                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium">
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments.length}</span>
                </button>
              </div>

              {/* Comments */}
              {post.comments.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <Avatar alt={comment.authorName} size="small" />
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">{comment.authorName}</p>
                        <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
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
                  <Avatar alt={user?.name || ''} size="small" />
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
                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-10 gap-1 z-10">
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
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-10 gap-1 z-10">
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

          {/* Image Preview */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
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
          <div className="flex items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
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
        onConfirm={() => {
          setPosts(posts.filter(p => p.id !== deletePostId));
          setDeletePostId(null);
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
