import React, { useState, useEffect } from 'react';
import api from '../services/api';

const OccasionsPopup: React.FC = () => {
  const [occasions, setOccasions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    checkTodayOccasions();
  }, []);

  const checkTodayOccasions = async () => {
    try {
      const res = await api.get('/occasions/today');
      if (res.data.data.length > 0) {
        setOccasions(res.data.data);
        setIsOpen(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!isOpen || occasions.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-3xl shadow-2xl w-full max-w-lg p-8 text-white relative animate-bounce-in">
        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-white text-2xl hover:scale-110 transition-transform">✕</button>
        
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold mb-2">مناسبات اليوم!</h2>
          <p className="text-white/90">لدينا مناسبات خاصة اليوم</p>
        </div>

        <div className="space-y-4">
          {occasions.map((occasion, index) => (
            <div key={index} className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{occasion.type === 'birthday' ? '🎂' : '🎉'}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{occasion.title}</h3>
                  {occasion.description && <p className="text-sm text-white/90 mt-1">{occasion.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setIsOpen(false)} className="w-full mt-6 px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:scale-105 transition-transform">
          شكراً! 🎊
        </button>
      </div>
    </div>
  );
};

export default OccasionsPopup;
