import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const LiveClock: React.FC = () => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB'
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="px-3.5 py-1.5 rounded-full neo-pressed flex items-center gap-2 text-xs font-mono font-bold text-gray-800 select-none shadow-inner"
      title="Waktu Lokal Stasiun (WIB)"
    >
      <Clock size={13} className="text-gray-700 animate-pulse shrink-0" />
      <span>{timeString || '--:--:-- WIB'}</span>
    </div>
  );
};
