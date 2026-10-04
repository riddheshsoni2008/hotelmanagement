'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'gu' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  t: (key: string, fallbackEn?: string, fallbackGu?: string) => string;
  isGu: boolean;
}

const translations: Record<string, { en: string; gu: string }> = {
  // Navigation
  dashboard: { en: 'Dashboard', gu: 'ડેશબોર્ડ' },
  newCheckIn: { en: 'New Check-in', gu: 'નવો ચેક-ઇન' },
  stays: { en: 'Stays', gu: 'રોકાણ / મહેમાનો' },
  rooms: { en: 'Rooms', gu: 'રૂમ' },
  staff: { en: 'Staff', gu: 'સ્ટાફ' },
  reports: { en: 'Reports', gu: 'રિપોર્ટ્સ / હિસાબ' },
  hotels: { en: 'Hotels', gu: 'હોટલ શાખાઓ' },
  settings: { en: 'Settings', gu: 'સેટિંગ્સ' },
  adminPanel: { en: 'Admin Panel', gu: 'એડમિન પેનલ' },
  manage: { en: 'Manage', gu: 'મેનેજ કરો' },
  logout: { en: 'Logout', gu: 'લૉગઆઉટ' },
  allHotels: { en: 'All Hotels (Combined)', gu: 'બધી હોટલો (સંયુક્ત)' },

  // Roles
  owner: { en: 'Hotel Owner / Admin', gu: 'હોટલ માલિક (એડમિન)' },
  staffRole: { en: 'Front Desk Staff', gu: 'રિસેપ્શન સ્ટાફ' },

  // Dashboard KPIs
  currentlyCheckedIn: { en: 'Currently Checked-In', gu: 'હાલમાં રોકાયેલા' },
  availableRooms: { en: 'Available Rooms', gu: 'ખાલી રૂમ (ઉપલબ્ધ)' },
  occupiedRooms: { en: 'Occupied Rooms', gu: 'ભરેલા રૂમ' },
  todayCheckIns: { en: "Today's Check-ins", gu: 'આજના નવા ચેક-ઇન' },
  todayCheckOuts: { en: "Today's Check-outs", gu: 'આજના ચેક-આઉટ' },
  overstayAlerts: { en: 'Overstay Alerts', gu: 'વધુ રોકાણ (સમય પૂરો)' },
  totalRooms: { en: 'Total Rooms', gu: 'કુલ રૂમ' },
  activeStaysTitle: { en: 'Active Guest Stays', gu: 'હાલમાં રહેલા મહેમાનોની યાદી' },
  searchGuestPlaceholder: { en: 'Search by guest name, phone, or room...', gu: 'મહેમાનનું નામ, મોબાઈલ અથવા રૂમ નંબર શોધો...' },

  // Check-in
  guestRegistration: { en: 'Fast Guest Registration', gu: 'ઝડપી મહેમાન નોંધણી' },
  step1Guest: { en: '1. Guest Details', gu: '૧. મહેમાનની વિગતો' },
  step2Docs: { en: '2. Aadhaar Verification', gu: '૨. આધાર કાર્ડ ચકાસણી' },
  step3Room: { en: '3. Room & Duration', gu: '૩. રૂમ અને રોકાણનો સમય' },
  fullName: { en: 'Guest Full Name', gu: 'મહેમાનનું પૂરું નામ' },
  phone: { en: 'Mobile Number', gu: 'મોબાઈલ નંબર' },
  email: { en: 'Email Address', gu: 'ઈમેઈલ એડ્રેસ' },
  address: { en: 'Address', gu: 'સરનામું' },
  city: { en: 'City', gu: 'શહેર' },
  idLast4: { en: 'Aadhaar Last 4 Digits', gu: 'આધાર કાર્ડના છેલ્લા ૪ આંકડા' },
  numberOfGuests: { en: 'Number of Guests', gu: 'મહેમાનોની સંખ્યા' },
  duration: { en: 'Stay Duration', gu: 'રોકાણનો સમયગાળો' },
  hours: { en: 'Hours', gu: 'કલાક' },
  days: { en: 'Days', gu: 'દિવસ' },
  roomAllocation: { en: 'Select Room', gu: 'રૂમ પસંદ કરો' },
  amount: { en: 'Amount (₹)', gu: 'રકમ (₹)' },
  paymentMode: { en: 'Payment Mode', gu: 'ચુકવણીનો પ્રકાર' },
  cash: { en: 'Cash', gu: 'રોકડ' },
  upi: { en: 'UPI (GPay / PhonePe)', gu: 'UPI (ગૂગલ પે / ફોન પે)' },
  card: { en: 'Card', gu: 'કાર્ડ' },
  confirmCheckIn: { en: 'Confirm & Check-In', gu: 'ચેક-ઇન કન્ફર્મ કરો' },

  // Actions
  checkOutGuest: { en: 'Check Out Guest', gu: 'ચેક-આઉટ કરો (બિલ પૂર્ણ)' },
  extendStay: { en: 'Extend Stay', gu: 'સમય લંબાવો' },
  viewStay: { en: 'View Details', gu: 'વિગત જુઓ' },
  cancel: { en: 'Cancel', gu: 'રદ કરો' },
  save: { en: 'Save', gu: 'સેવ કરો' },
  delete: { en: 'Delete', gu: 'કાઢી નાખો' },

  // Status
  checkedIn: { en: 'Checked In', gu: 'હાજર (રોકાયેલ)' },
  checkedOut: { en: 'Checked Out', gu: 'ચેક-આઉટ થયેલ' },
  overstay: { en: 'Overstay', gu: 'સમય સમાપ્ત' },
  available: { en: 'Available', gu: 'ઉપલબ્ધ (ખાલી)' },
  occupied: { en: 'Occupied', gu: 'ભરેલ' },
  maintenance: { en: 'Maintenance', gu: 'સમારકામ' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Gujarati 'gu' for friendly Gujarati client experience
  const [lang, setLangState] = useState<Language>('gu');

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as Language;
    if (saved === 'en' || saved === 'gu') {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('app_language', l);
  };

  const toggleLang = () => {
    const next = lang === 'gu' ? 'en' : 'gu';
    setLang(next);
  };

  const t = (key: string, fallbackEn?: string, fallbackGu?: string): string => {
    const item = translations[key];
    if (lang === 'gu') {
      // In Gujarati mode, show Gujarati with English subtitle or Gujarati directly
      return item ? item.gu : fallbackGu || fallbackEn || key;
    }
    return item ? item.en : fallbackEn || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, isGu: lang === 'gu' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
