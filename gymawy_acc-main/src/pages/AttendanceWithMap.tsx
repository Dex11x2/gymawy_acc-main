import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Toast from '../components/Toast';
import { useAuthStore } from '../store/authStore';

const AttendanceWithMap: React.FC = () => {
  const { user } = useAuthStore();

  // ✅ Check if user is a manager (can see exact times)
  const isManager = ['dev', 'general_manager', 'administrative_manager'].includes(user?.role || '');

  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as any, isOpen: false });
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [nearestBranch, setNearestBranch] = useState<any>(null);
  const [bypassLocationCheck, setBypassLocationCheck] = useState(false);

  // حالات كاميرا السيلفي
  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [selfieTimestamp, setSelfieTimestamp] = useState<Date | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const MAX_RETRIES = 3;

  useEffect(() => {
    getLocation();
    loadTodayRecord();
    loadBranches();

    // Cleanup on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (location && branches.length > 0) {
      checkNearestBranch();
    }
  }, [location, branches]);

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const checkNearestBranch = () => {
    if (!location) return;

    console.log('🔍 Checking branches:', branches);
    console.log('📍 Current location:', location);

    let nearest = null;
    let minDistance = Infinity;

    branches.forEach(branch => {
      console.log('🏢 Branch:', branch.name, 'Lat:', branch.latitude, 'Lng:', branch.longitude);
      if (branch.latitude && branch.longitude) {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          branch.latitude,
          branch.longitude
        );

        console.log('📏 Distance to', branch.name, ':', Math.round(distance), 'm');

        if (distance < minDistance) {
          minDistance = distance;
          nearest = { ...branch, distance };
        }
      }
    });

    console.log('✅ Nearest branch:', nearest);
    setNearestBranch(nearest);
  };

  // دالة للحصول على الموقع
  const getLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    retryCountRef.current = 0;

    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم تحديد الموقع');
      setLocationLoading(false);
      setToast({ message: '❌ المتصفح لا يدعم تحديد الموقع', type: 'error', isOpen: true });
      return;
    }

    // محاولة الحصول على الموقع
    attemptGetLocation(false);
  };

  const attemptGetLocation = (highAccuracy: boolean) => {
    console.log(`📍 Attempting location (highAccuracy: ${highAccuracy}, attempt: ${retryCountRef.current + 1})`);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 Location obtained:', position.coords);
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationLoading(false);
        setLocationError(null);
      },
      (error) => {
        console.warn('Location error:', error.code, error.message);

        // لو رفض الصلاحية، نوقف فوراً
        if (error.code === error.PERMISSION_DENIED) {
          handleFinalError(error);
          return;
        }

        retryCountRef.current++;

        // لو لسه عندنا محاولات
        if (retryCountRef.current < MAX_RETRIES) {
          console.log(`🔄 Retrying... (${retryCountRef.current}/${MAX_RETRIES})`);

          // ننتظر ثانيتين ثم نحاول بدقة عالية
          setTimeout(() => {
            attemptGetLocation(true);
          }, 2000);
        } else {
          // خلصت المحاولات
          handleFinalError(error);
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 15000 : 8000,
        maximumAge: highAccuracy ? 0 : 60000
      }
    );
  };

  const handleFinalError = (error: GeolocationPositionError) => {
    let message = 'فشل الحصول على الموقع';

    if (error.code === error.PERMISSION_DENIED) {
      message = '❌ يرجى السماح بالوصول للموقع في إعدادات المتصفح';
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      message = '❌ الموقع غير متاح - تأكد من تفعيل GPS';
    } else if (error.code === error.TIMEOUT) {
      message = '❌ انتهى وقت الطلب - حاول مرة أخرى';
    }

    console.log('❌ Final error:', message);
    setLocationError(message);
    setLocationLoading(false);
    setToast({ message, type: 'error', isOpen: true });
  };

  // إعادة تحديد الموقع يدوياً
  const getCurrentLocation = () => {
    getLocation();
  };

  const loadTodayRecord = async () => {
    try {
      const res = await api.get('/attendance-records/today');
      setTodayRecord(res.data.data);
    } catch (error) {
      console.error('Error loading today record:', error);
      setTodayRecord(null);
    }
  };

  const handleCheckIn = async (forceBypass = false) => {
    if (!location) {
      setToast({ message: 'يرجى تفعيل الموقع', type: 'error', isOpen: true });
      return;
    }

    if (!nearestBranch) {
      setToast({ message: '❌ لا يوجد فرع قريب منك', type: 'error', isOpen: true });
      return;
    }

    // حساب النطاق الفعلي مع مراعاة دقة GPS
    // نضيف تسامح 50 متر + نصف دقة الـ GPS
    const gpsTolerance = Math.min(location.accuracy || 0, 100) / 2 + 50;
    const effectiveRadius = nearestBranch.radius + gpsTolerance;

    // لو خارج النطاق الفعلي ومش عامل bypass
    if (nearestBranch.distance > effectiveRadius && !forceBypass && !bypassLocationCheck) {
      setToast({
        message: `❌ أنت خارج نطاق الفرع (${Math.round(nearestBranch.distance)}م من ${nearestBranch.radius}م)`,
        type: 'error',
        isOpen: true
      });
      return;
    }

    setLoading(true);
    try {
      await api.post('/attendance-records/check-in', {
        latitude: location.lat,
        longitude: location.lng,
        branchId: nearestBranch._id,
        clientTime: new Date().toISOString(),
        bypassLocation: forceBypass || bypassLocationCheck, // إرسال علامة التجاوز
        accuracy: location.accuracy // إرسال دقة الموقع
      });
      setToast({ message: `✅ تم تسجيل الحضور بنجاح في ${nearestBranch.name}`, type: 'success', isOpen: true });
      setBypassLocationCheck(false);
      await loadTodayRecord();
    } catch (error: any) {
      console.error('Check-in error:', error);
      setToast({ message: error.response?.data?.message || 'فشل تسجيل الحضور', type: 'error', isOpen: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (forceBypass = false) => {
    if (!location) {
      setToast({ message: 'يرجى تفعيل الموقع', type: 'error', isOpen: true });
      return;
    }

    // تسجيل الخروج متاح بدون فحص موقع صارم
    // نسجل الموقع للـ records بس مش بنمنع التسجيل

    setLoading(true);
    try {
      await api.post('/attendance-records/check-out', {
        latitude: location.lat,
        longitude: location.lng,
        branchId: nearestBranch?._id,
        clientTime: new Date().toISOString(),
        bypassLocation: forceBypass || bypassLocationCheck,
        accuracy: location.accuracy
      });
      setToast({ message: `✅ تم تسجيل الانصراف بنجاح${nearestBranch ? ` من ${nearestBranch.name}` : ''}`, type: 'success', isOpen: true });
      setBypassLocationCheck(false);
      await loadTodayRecord();
    } catch (error: any) {
      console.error('Check-out error:', error);
      setToast({ message: error.response?.data?.message || 'فشل تسجيل الانصراف', type: 'error', isOpen: true });
    } finally {
      setLoading(false);
    }
  };

  // هل الموقع غير دقيق (أكتر من 100 متر) أو خارج النطاق؟
  const isLocationInaccurate = location && location.accuracy && location.accuracy > 100;
  const isOutsideRange = nearestBranch && nearestBranch.distance > nearestBranch.radius;

  // فتح الكاميرا
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setCameraStream(stream);
      setShowSelfieCamera(true);
      setSelfiePhoto(null);

      // تأخير بسيط للتأكد من تحميل الفيديو
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error: any) {
      console.error('Camera error:', error);
      setToast({
        message: '❌ فشل فتح الكاميرا - تأكد من إعطاء صلاحية الكاميرا',
        type: 'error',
        isOpen: true
      });
    }
  };

  // التقاط الصورة
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // عكس الصورة أفقياً (مرآة)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);

      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      setSelfiePhoto(photoData);
      setSelfieTimestamp(new Date());

      // إيقاف الكاميرا
      stopCamera();
    }
  };

  // إيقاف الكاميرا
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // إغلاق نافذة السيلفي
  const closeSelfieModal = () => {
    stopCamera();
    setShowSelfieCamera(false);
    setSelfiePhoto(null);
    setSelfieTimestamp(null);
  };

  // إعادة التقاط
  const retakePhoto = async () => {
    setSelfiePhoto(null);
    setSelfieTimestamp(null);
    await openCamera();
  };

  // تأكيد وتسجيل الحضور مع السيلفي
  const confirmBypassWithSelfie = async () => {
    if (!selfiePhoto || !selfieTimestamp) {
      setToast({ message: '❌ يرجى التقاط صورة أولاً', type: 'error', isOpen: true });
      return;
    }

    setLoading(true);
    try {
      await api.post('/attendance-records/check-in', {
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
        branchId: nearestBranch?._id,
        clientTime: new Date().toISOString(),
        bypassLocation: true,
        accuracy: location?.accuracy,
        selfiePhoto: selfiePhoto,
        selfieTimestamp: selfieTimestamp.toISOString(),
        selfieDeviceInfo: navigator.userAgent
      });

      setToast({
        message: `✅ تم تسجيل الحضور بنجاح (تجاوز مع صورة)`,
        type: 'success',
        isOpen: true
      });
      closeSelfieModal();
      await loadTodayRecord();
    } catch (error: any) {
      console.error('Check-in error:', error);
      setToast({
        message: error.response?.data?.message || 'فشل تسجيل الحضور',
        type: 'error',
        isOpen: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">📍 تسجيل الحضور بالموقع</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">سجل حضورك وانصرافك باستخدام موقعك الجغرافي</p>
      </div>

      {/* Location & Branch Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{locationLoading ? '⏳' : location ? '📍' : '❌'}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">حالة الموقع</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {locationLoading ? '⏳ جاري تحديد الموقع...' :
                 location ? `✅ تم تحديد الموقع ${location.accuracy ? `(دقة: ${Math.round(location.accuracy)}م)` : ''}` :
                 locationError || '❌ فشل تحديد الموقع'}
              </p>
              {location && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={getCurrentLocation}
            disabled={locationLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locationLoading ? '⏳ جاري التحديد...' : '🔄 إعادة تحديد الموقع'}
          </button>
          {locationError && !locationLoading && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{locationError}</p>
              <p className="text-xs text-red-500 dark:text-red-500 mt-1">
                💡 نصائح: تأكد من تفعيل GPS وإعطاء صلاحية الموقع للمتصفح
              </p>
            </div>
          )}
        </div>

        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${
          nearestBranch && nearestBranch.distance <= nearestBranch.radius 
            ? 'border-2 border-green-500' 
            : 'border-2 border-red-500'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🏢</span>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">أقرب فرع</h3>
              {nearestBranch ? (
                <>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{nearestBranch.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    المسافة: {Math.round(nearestBranch.distance)}م / النطاق: {nearestBranch.radius}م
                  </p>
                  {nearestBranch.distance <= nearestBranch.radius ? (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">✅ داخل النطاق</p>
                  ) : nearestBranch.allowedIPs && nearestBranch.allowedIPs.length > 0 ? (
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">📡 يمكن التسجيل عبر شبكة WiFi</p>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">❌ خارج النطاق</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">لا يوجد فروع قريبة</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      {location && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">🗺️ موقعك الحالي</h3>
          <div className="w-full h-96 rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* تحذير الموقع غير الدقيق أو خارج النطاق */}
      {(isLocationInaccurate || isOutsideRange) && !todayRecord?.checkIn && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-yellow-800 dark:text-yellow-200">
                {isOutsideRange ? 'أنت خارج نطاق الفرع' : 'دقة الموقع ضعيفة'}
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {isOutsideRange
                  ? `المسافة: ${Math.round(nearestBranch?.distance || 0)}م - النطاق المسموح: ${nearestBranch?.radius || 0}م`
                  : `دقة الموقع: ${Math.round(location?.accuracy || 0)}م (الأجهزة بدون GPS قد تعطي موقع غير دقيق)`
                }
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                💡 إذا كنت متأكد أنك في مكان العمل، يمكنك التسجيل مع تجاوز فحص الموقع
              </p>
              <button
                onClick={openCamera}
                disabled={loading || todayRecord?.checkIn}
                className="mt-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? '⏳ جاري التسجيل...' : '📸 تسجيل الحضور (تجاوز مع صورة سيلفي)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check In/Out Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => handleCheckIn()}
          disabled={loading || !location || (todayRecord?.checkIn || todayRecord?.hasCheckedIn)}
          className="p-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-6xl mb-3">✅</div>
          <h3 className="text-2xl font-bold mb-2">تسجيل الحضور</h3>
          <p className="text-sm opacity-90">
            {(todayRecord?.checkIn || todayRecord?.hasCheckedIn)
              ? (isManager && todayRecord?.checkIn
                  ? `تم التسجيل: ${new Date(todayRecord.checkIn).toLocaleTimeString('ar-EG')}`
                  : 'تم التسجيل بنجاح ✓')
              : 'اضغط لتسجيل الحضور'}
          </p>
        </button>

        <button
          onClick={() => handleCheckOut()}
          disabled={loading || !location || !(todayRecord?.checkIn || todayRecord?.hasCheckedIn) || (todayRecord?.checkOut || todayRecord?.hasCheckedOut)}
          className="p-8 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-6xl mb-3">🚪</div>
          <h3 className="text-2xl font-bold mb-2">تسجيل الانصراف</h3>
          <p className="text-sm opacity-90">
            {(todayRecord?.checkOut || todayRecord?.hasCheckedOut)
              ? (isManager && todayRecord?.checkOut
                  ? `تم التسجيل: ${new Date(todayRecord.checkOut).toLocaleTimeString('ar-EG')}`
                  : 'تم التسجيل بنجاح ✓')
              : 'اضغط لتسجيل الانصراف'}
          </p>
        </button>
      </div>

      {/* Today's Record */}
      {todayRecord && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">📋 سجل اليوم</h3>

          {/* ✅ Show detailed times only to managers */}
          {isManager ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">وقت الحضور</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString('ar-EG') : '-'}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">وقت الانصراف</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString('ar-EG') : '-'}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ساعات العمل</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {todayRecord.workHours ? `${todayRecord.workHours.toFixed(2)} ساعة` : '-'}
                </p>
              </div>
            </div>
          ) : (
            /* ✅ Show simplified status for employees (no exact times) */
            <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 mb-2">
                تم تسجيل حضورك اليوم
              </p>
              {(todayRecord.checkOut || todayRecord.hasCheckedOut) && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  تم تسجيل الانصراف أيضاً
                </p>
              )}
              {todayRecord.workHours && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  ساعات العمل: {todayRecord.workHours.toFixed(2)} ساعة
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* نافذة التقاط السيلفي */}
      {showSelfieCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  📸 التقاط صورة سيلفي للتحقق
                </h3>
                <button
                  onClick={closeSelfieModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                يجب التقاط صورة سيلفي للتحقق من هويتك عند استخدام التجاوز اليدوي
              </p>
            </div>

            <div className="p-4">
              {!selfiePhoto ? (
                <div className="space-y-4">
                  {/* عرض الكاميرا */}
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* زر التقاط */}
                  <button
                    onClick={capturePhoto}
                    className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-lg font-bold flex items-center justify-center gap-2"
                  >
                    📷 التقاط الصورة
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* عرض الصورة الملتقطة */}
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img
                      src={selfiePhoto}
                      alt="Selfie"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      📅 {selfieTimestamp?.toLocaleString('ar-EG')}
                    </div>
                  </div>

                  {/* أزرار التأكيد */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={retakePhoto}
                      className="py-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      🔄 إعادة التقاط
                    </button>
                    <button
                      onClick={confirmBypassWithSelfie}
                      disabled={loading}
                      className="py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold disabled:opacity-50"
                    >
                      {loading ? '⏳ جاري التسجيل...' : '✅ تأكيد وتسجيل'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">ℹ️</span>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">لماذا نطلب صورة؟</p>
                  <p className="mt-1">للتحقق من هويتك وضمان صحة التسجيل. الصورة تحتوي على وقت التقاطها ولا يمكن التلاعب بها.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

export default AttendanceWithMap;
