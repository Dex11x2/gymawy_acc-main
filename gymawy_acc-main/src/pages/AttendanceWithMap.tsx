import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Toast from '../components/Toast';

const AttendanceWithMap: React.FC = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as any, isOpen: false });
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [nearestBranch, setNearestBranch] = useState<any>(null);

  useEffect(() => {
    getCurrentLocation();
    loadTodayRecord();
    loadBranches();
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

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          let message = 'فشل الحصول على الموقع';
          if (error.code === 1) {
            if (error.message.includes('secure origins')) {
              message = '❌ يجب استخدام HTTPS أو localhost لتفعيل الموقع. استخدم http://localhost:5173 بدلاً من IP';
            } else {
              message = '❌ يرجى السماح بالوصول للموقع في إعدادات المتصفح';
            }
          } else if (error.code === 2) {
            message = '❌ الموقع غير متاح';
          } else if (error.code === 3) {
            message = '❌ انتهى وقت الطلب';
          }
          setToast({ message, type: 'warning', isOpen: true });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setToast({ message: '❌ المتصفح لا يدعم تحديد الموقع', type: 'error', isOpen: true });
    }
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

  const handleCheckIn = async () => {
    if (!location) {
      setToast({ message: 'يرجى تفعيل الموقع', type: 'error', isOpen: true });
      return;
    }

    if (!nearestBranch) {
      setToast({ message: '❌ لا يوجد فرع قريب منك', type: 'error', isOpen: true });
      return;
    }

    if (nearestBranch.distance > nearestBranch.radius) {
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
        branchId: nearestBranch._id
      });
      setToast({ message: `✅ تم تسجيل الحضور بنجاح في ${nearestBranch.name}`, type: 'success', isOpen: true });
      await loadTodayRecord();
    } catch (error: any) {
      console.error('Check-in error:', error);
      setToast({ message: error.response?.data?.message || 'فشل تسجيل الحضور', type: 'error', isOpen: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!location) {
      setToast({ message: 'يرجى تفعيل الموقع', type: 'error', isOpen: true });
      return;
    }

    if (!nearestBranch) {
      setToast({ message: '❌ لا يوجد فرع قريب منك', type: 'error', isOpen: true });
      return;
    }

    if (nearestBranch.distance > nearestBranch.radius) {
      setToast({ 
        message: `❌ أنت خارج نطاق الفرع (${Math.round(nearestBranch.distance)}م من ${nearestBranch.radius}م)`, 
        type: 'error', 
        isOpen: true 
      });
      return;
    }

    setLoading(true);
    try {
      await api.post('/attendance-records/check-out', {
        latitude: location.lat,
        longitude: location.lng,
        branchId: nearestBranch._id
      });
      setToast({ message: `✅ تم تسجيل الانصراف بنجاح من ${nearestBranch.name}`, type: 'success', isOpen: true });
      await loadTodayRecord();
    } catch (error: any) {
      console.error('Check-out error:', error);
      setToast({ message: error.response?.data?.message || 'فشل تسجيل الانصراف', type: 'error', isOpen: true });
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
            <span className="text-3xl">📍</span>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">حالة الموقع</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {location ? `✅ تم تحديد الموقع` : '⏳ جاري تحديد الموقع...'}
              </p>
            </div>
          </div>
          {!location && (
            <button onClick={getCurrentLocation} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              🔄 إعادة تحديد الموقع
            </button>
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

      {/* Check In/Out Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={handleCheckIn}
          disabled={loading || !location || todayRecord?.checkIn}
          className="p-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-6xl mb-3">✅</div>
          <h3 className="text-2xl font-bold mb-2">تسجيل الحضور</h3>
          <p className="text-sm opacity-90">
            {todayRecord?.checkIn ? `تم التسجيل: ${new Date(todayRecord.checkIn).toLocaleTimeString('ar-EG')}` : 'اضغط لتسجيل الحضور'}
          </p>
        </button>

        <button
          onClick={handleCheckOut}
          disabled={loading || !location || !todayRecord?.checkIn || todayRecord?.checkOut}
          className="p-8 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-6xl mb-3">🚪</div>
          <h3 className="text-2xl font-bold mb-2">تسجيل الانصراف</h3>
          <p className="text-sm opacity-90">
            {todayRecord?.checkOut ? `تم التسجيل: ${new Date(todayRecord.checkOut).toLocaleTimeString('ar-EG')}` : 'اضغط لتسجيل الانصراف'}
          </p>
        </button>
      </div>

      {/* Today's Record */}
      {todayRecord && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">📋 سجل اليوم</h3>
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
        </div>
      )}

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

export default AttendanceWithMap;
