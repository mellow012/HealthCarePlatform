// components/emergency/EmergencyServiceCard.tsx
'use client';

import React from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmergencyServicesCardProps {
  className?: string;
}

const EmergencyServicesCard: React.FC<EmergencyServicesCardProps> = ({ className = '' }) => {
  const router = useRouter();

  return (
    <div 
      className={`bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer ${className}`}
      onClick={() => router.push('/patient/emergency-services')}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Emergency Services</p>
          <p className="text-2xl font-bold text-gray-900">Quick Access</p>
        </div>
        <div className="p-3 rounded-full bg-blue-100">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
        View Services <ArrowRight className="w-4 h-4 ml-1" />
      </div>
    </div>
  );
};

export default EmergencyServicesCard;