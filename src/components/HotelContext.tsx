'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'staff';
  hotelIds: string[];
}

export interface HotelItem {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
}

interface HotelContextType {
  user: UserSession | null;
  hotels: HotelItem[];
  selectedHotelId: string;
  setSelectedHotelId: (id: string) => void;
  loading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [hotels, setHotels] = useState<HotelItem[]>([]);
  const [selectedHotelId, setSelectedHotelIdState] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setHotels(data.hotels || []);

        const savedHotelId = localStorage.getItem('selected_hotel_id');

        if (data.user.role === 'owner') {
          if (savedHotelId && (savedHotelId === 'all' || data.hotels.some((h: HotelItem) => h.id === savedHotelId))) {
            setSelectedHotelIdState(savedHotelId);
          } else {
            setSelectedHotelIdState('all');
          }
        } else {
          // Staff can only pick from their hotels
          if (savedHotelId && data.hotels.some((h: HotelItem) => h.id === savedHotelId)) {
            setSelectedHotelIdState(savedHotelId);
          } else if (data.hotels.length > 0) {
            setSelectedHotelIdState(data.hotels[0].id);
          }
        }
      } else {
        setUser(null);
        setHotels([]);
      }
    } catch (e) {
      console.error('Failed to load user session:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  const setSelectedHotelId = (id: string) => {
    setSelectedHotelIdState(id);
    localStorage.setItem('selected_hotel_id', id);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      localStorage.removeItem('selected_hotel_id');
      router.push('/login');
    }
  };

  return (
    <HotelContext.Provider
      value={{
        user,
        hotels,
        selectedHotelId,
        setSelectedHotelId,
        loading,
        logout,
        refreshAuth: fetchAuth,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
}
