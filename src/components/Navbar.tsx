'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  CalendarCheck,
  ClipboardList,
  BedDouble,
  Users2,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Clock,
  Menu,
  X,
  PlusCircle,
  Languages,
  Crown,
  MapPin,
} from 'lucide-react';
import { useHotel } from './HotelContext';
import { useLanguage } from './LanguageContext';
import { formatToIST, formatTimeIST } from '@/lib/time';

interface NavItem {
  href: string;
  label: string;
  labelGu: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

export function Navbar() {
  const pathname = usePathname();
  const { user, hotels, selectedHotelId, setSelectedHotelId, logout } = useHotel();
  const { lang, setLang, toggleLang, isGu } = useLanguage();
  const [currentTimeFull, setCurrentTimeFull] = useState<string>('');
  const [currentTimeShort, setCurrentTimeShort] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Keep IST clock updated every 30 seconds
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeFull(formatToIST(now));
      setCurrentTimeShort(formatTimeIST(now));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
  }, [pathname]);

  // Close more menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  if (!user) return null;

  const isOwner = user.role === 'owner';

  const coreNavLinks: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', labelGu: 'ડેશબોર્ડ', icon: CalendarCheck },
    { href: '/check-in', label: 'New Check-in', labelGu: '+ નવો ચેક-ઇન', icon: PlusCircle, highlight: true },
    { href: '/stays', label: 'Stays', labelGu: 'રોકાણ', icon: ClipboardList },
    { href: '/rooms', label: 'Rooms', labelGu: 'રૂમ', icon: BedDouble },
  ];

  const ownerNavLinks: NavItem[] = [
    { href: '/hotels', label: 'Hotels', labelGu: 'હોટલો', icon: Building2 },
    { href: '/staff', label: 'Staff', labelGu: 'સ્ટાફ', icon: Users2 },
    { href: '/reports', label: 'Reports', labelGu: 'રિપોર્ટ્સ', icon: BarChart3 },
    { href: '/settings', label: 'Settings', labelGu: 'સેટિંગ્સ', icon: Settings },
  ];

  const allNavLinks: NavItem[] = isOwner ? [...coreNavLinks, ...ownerNavLinks] : coreNavLinks;
  const isOwnerMenuActive = ownerNavLinks.some((l) => pathname.startsWith(l.href));

  // Clean user display name
  const displayName = user.name.replace(/\s*\(Owner\)|\s*\(Receptionist\)/gi, '').trim();

  // Selected hotel name for single hotel staff
  const currentAssignedHotel = !isOwner && hotels.length === 1 ? hotels[0] : null;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Top Main Bar */}
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Left: Brand Logo & Hotel Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30 group-hover:bg-blue-500 transition shrink-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="shrink-0">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white block leading-tight">
                  Atithi<span className="text-blue-400">Stay</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 block leading-none font-medium">
                  {isGu ? 'હોટલ મેનેજમેન્ટ' : 'PMS'}
                </span>
              </div>
            </Link>

            {/* Hotel Switcher Dropdown (Shown on Tablet & Desktop >= 640px sm) */}
            <div className="hidden sm:flex items-center shrink-0">
              {currentAssignedHotel ? (
                <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-700/60 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-emerald-300 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="max-w-[140px] xl:max-w-[190px] truncate">
                    {currentAssignedHotel.name} ({currentAssignedHotel.city})
                  </span>
                  <span className="text-[9px] bg-emerald-800/80 text-emerald-200 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                    {isGu ? 'શાખા' : 'Branch'}
                  </span>
                </div>
              ) : (
                <div className="relative flex items-center shrink-0">
                  <div className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-2.5 py-1.5 transition text-xs sm:text-sm font-medium">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <select
                      aria-label="Hotel selector"
                      value={selectedHotelId}
                      onChange={(e) => setSelectedHotelId(e.target.value)}
                      className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-4 appearance-none text-xs sm:text-sm max-w-[130px] sm:max-w-[170px] xl:max-w-[210px] truncate"
                    >
                      {isOwner && (
                        <option value="all" className="bg-slate-900 text-white">
                          {isGu ? '🏨 બધી હોટલો (All)' : 'All Hotels (Combined)'}
                        </option>
                      )}
                      {hotels.map((h) => (
                        <option key={h.id} value={h.id} className="bg-slate-900 text-white">
                          {h.name} ({h.city})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none -ml-3 shrink-0" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Desktop Navigation (>= 1024px) */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {coreNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
              const displayLabel = isGu ? link.labelGu : link.label;

              if (link.highlight) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/25 transition mx-1 shrink-0 whitespace-nowrap active:scale-95"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{displayLabel}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{displayLabel}</span>
                </Link>
              );
            })}

            {/* Owner Navigation Links */}
            {isOwner && (
              <>
                <div className="hidden min-[1340px]:flex items-center gap-1">
                  {ownerNavLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname.startsWith(link.href);
                    const displayLabel = isGu ? link.labelGu : link.label;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                          isActive
                            ? 'bg-slate-800 text-white font-semibold shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span>{displayLabel}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="relative min-[1340px]:hidden shrink-0" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap cursor-pointer ${
                      isOwnerMenuActive
                        ? 'bg-slate-800 text-blue-400 font-semibold border border-blue-500/40 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{isGu ? 'એડમિન પેનલ ▾' : 'Admin Panel ▾'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                        moreMenuOpen ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </button>

                  {moreMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider border-b border-slate-800 mb-1 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>{isGu ? 'એડમિન કંટ્રોલ' : 'Owner Admin'}</span>
                      </div>
                      {ownerNavLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMoreMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition ${
                              isActive
                                ? 'bg-slate-800 text-blue-400 font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                            <span>{isGu ? link.labelGu : link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Right: Language Toggle, IST Clock, Avatar & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Dual Language Switcher (Crystal Clear - Never Inverted) */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => setLang('gu')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  isGu
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="ગુજરાતી ભાષા પસંદ કરો"
              >
                <span>ગુજરાતી</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  !isGu
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to English"
              >
                <span>English</span>
              </button>
            </div>

            {/* IST Clock (Desktop only) */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60 shrink-0 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="hidden xl:inline">{currentTimeFull}</span>
              <span className="xl:hidden">{currentTimeShort}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">IST</span>
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden sm:flex flex-col text-right shrink-0">
                <span className="text-xs font-semibold text-white leading-tight max-w-[100px] xl:max-w-[140px] truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-blue-300 capitalize font-medium leading-none">
                  {isOwner ? (isGu ? 'માલિક' : 'Owner') : (isGu ? 'સ્ટાફ' : 'Staff')}
                </span>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-700/80 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-white shadow shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Logout button (Desktop) */}
            <button
              onClick={() => logout()}
              title={isGu ? 'લૉગઆઉટ' : 'Logout'}
              aria-label="Logout"
              className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile menu button (< 1024px lg) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 shrink-0 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-2.5 animate-in slide-in-from-top-2">
          {/* Mobile Hotel Switcher or Locked Hotel display */}
          <div className="pb-2 border-b border-slate-800 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isGu ? 'હોટલ પ્રોપર્ટી:' : 'Selected Hotel:'}
            </span>
            {currentAssignedHotel ? (
              <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-700/60 rounded-xl p-2 text-xs font-semibold text-emerald-300">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{currentAssignedHotel.name} ({currentAssignedHotel.city})</span>
              </div>
            ) : (
              <select
                aria-label="Select Hotel"
                value={selectedHotelId}
                onChange={(e) => {
                  setSelectedHotelId(e.target.value);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none"
              >
                {isOwner && (
                  <option value="all">
                    {isGu ? '🏨 બધી હોટલો (All Combined)' : 'All Hotels (Combined)'}
                  </option>
                )}
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* User info row & Clock */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>IST: {currentTimeShort}</span>
            </div>
            <span className="capitalize text-blue-400 font-bold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/40">
              {isOwner ? (isGu ? 'હોટલ માલિક' : 'Owner') : (isGu ? 'રિસેપ્શન સ્ટાફ' : 'Staff')}
            </span>
          </div>

          {/* Nav links */}
          <div className="space-y-1">
            {allNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
              const displayLabel = isGu ? link.labelGu : link.label;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    link.highlight
                      ? 'bg-blue-600 text-white'
                      : isActive
                      ? 'bg-slate-800 text-blue-400 font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${link.highlight ? 'text-white' : 'text-blue-400'}`} />
                  <span>{displayLabel}</span>
                </Link>
              );
            })}

            {/* Mobile Logout Button */}
            <button
              onClick={() => logout()}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-red-400 hover:bg-red-500/10 transition mt-2 border-t border-slate-800 pt-3"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>{isGu ? 'લૉગઆઉટ કરો (Logout)' : 'Logout'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Optimized for Thumb Access on Phone) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-md border-t border-slate-800 px-1 py-1 flex items-center justify-around shadow-2xl safe-area-bottom">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition ${
            pathname === '/dashboard' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <CalendarCheck className="w-5 h-5 mb-0.5" />
          <span>{isGu ? 'ડેશબોર્ડ' : 'Dashboard'}</span>
        </Link>

        <Link
          href="/check-in"
          className="flex flex-col items-center -mt-5 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-xl shadow-blue-600/40 border-2 border-slate-900 active:scale-95 transition"
          title={isGu ? 'નવો ચેક-ઇન' : 'New Check-in'}
        >
          <PlusCircle className="w-6 h-6" />
        </Link>

        <Link
          href="/stays"
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition ${
            pathname.startsWith('/stays') ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          <span>{isGu ? 'રોકાણ' : 'Stays'}</span>
        </Link>

        <Link
          href="/rooms"
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition ${
            pathname.startsWith('/rooms') ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <BedDouble className="w-5 h-5 mb-0.5" />
          <span>{isGu ? 'રૂમ' : 'Rooms'}</span>
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
