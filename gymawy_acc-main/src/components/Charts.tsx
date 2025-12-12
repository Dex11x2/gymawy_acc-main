import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#F97316', '#12b76a', '#f59e0b', '#f04438', '#7a5af8', '#ee46bc'];

export const RevenueExpenseChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip contentStyle={{ fontSize: 12 }} />
      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: 14 }} />
      <Line type="monotone" dataKey="revenue" stroke="#10b981" name="الإيرادات" strokeWidth={2} />
      <Line type="monotone" dataKey="expense" stroke="#ef4444" name="المصروفات" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const DepartmentPerformanceChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip contentStyle={{ fontSize: 12 }} />
      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: 14 }} />
      <Bar dataKey="revenue" fill="#F97316" name="الإيرادات" />
      <Bar dataKey="expense" fill="#ef4444" name="المصروفات" />
    </BarChart>
  </ResponsiveContainer>
);

export const CategoryPieChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="40%"
        labelLine={{ stroke: '#666', strokeWidth: 1 }}
        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
        style={{ fontSize: 11 }}
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={{ fontSize: 12 }} />
    </PieChart>
  </ResponsiveContainer>
);
