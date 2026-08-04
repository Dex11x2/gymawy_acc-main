import React, { useState } from "react";
import Logo from "../components/Logo";
import { useDataStore } from "../store/dataStore";

const Registration: React.FC = () => {
  const { addRegistrationRequest } = useDataStore();
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    password: "",
    role: "admin" as "admin" | "employee",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Check if email exists via API
    addRegistrationRequest({ ...formData, attempts: 1 });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen brand-hero flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="pattern-overlay" />
        <header className="brand-header">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Logo variant="wordmark" height={40} />
            <a href="/" className="btn btn-outline px-5 py-2 text-sm">
              العودة للصفحة الرئيسية
            </a>
          </div>
        </header>
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-purple-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">
            تم إرسال طلب التسجيل
          </h2>
          <p className="text-gray-600 mb-6">
            سنقوم بمراجعة طلبك والتواصل معك قريبًا
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full btn btn-primary py-3"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen brand-hero flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="pattern-overlay" />
      <header className="brand-header">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo variant="wordmark" height={40} />
          <a href="/" className="btn btn-outline px-5 py-2 text-sm">
            الرئيسية
          </a>
        </div>
      </header>
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8 max-w-md w-full border border-purple-100">
        <div className="flex justify-center mb-6">
          <Logo variant="mark" height={48} />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
            تسجيل شركتك معنا
          </h1>
          <p className="text-gray-600">املأ البيانات التالية</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم الشركة
            </label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-gray-900"
              placeholder="أدخل اسم الشركة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المسؤول
            </label>
            <input
              type="text"
              required
              value={formData.contactName}
              onChange={(e) =>
                setFormData({ ...formData, contactName: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-gray-900"
              placeholder="أدخل اسم المسؤول"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-gray-900"
              placeholder="example@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-gray-900"
              placeholder="+20 1XX XXX XXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-gray-900"
              placeholder="أدخل كلمة المرور"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الحساب
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as "admin" | "employee",
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-gray-900"
            >
              <option value="admin">مسؤول</option>
              <option value="employee">موظف</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full btn btn-primary py-3 font-medium"
          >
            إرسال الطلب
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-brand-600 hover:text-brand-700 text-sm">
            العودة للصفحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
};

export default Registration;
