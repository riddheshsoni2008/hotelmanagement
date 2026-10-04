'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BedDouble,
  Building2,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Zap,
  Clock,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';

interface RoomItem {
  id: string;
  hotelId: string;
  hotelName: string;
  roomNumber: string;
  type: string;
  status: 'available' | 'occupied' | 'maintenance';
  floor?: string;
  pricePerDay?: number;
  maintenanceUntil?: string | null;
  maintenanceReason?: string | null;
}

export default function RoomsPage() {
  const { user, selectedHotelId, hotels } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied' | 'maintenance'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Add single room modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHotelId, setNewHotelId] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newType, setNewType] = useState('Double');
  const [newFloor, setNewFloor] = useState('1st Floor');
  const [newPrice, setNewPrice] = useState('1800');
  const [addingRoom, setAddingRoom] = useState(false);

  // Bulk room generator modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStartNumber, setBulkStartNumber] = useState('101');
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkFloor, setBulkFloor] = useState('1st Floor');
  const [bulkType, setBulkType] = useState('Double AC');
  const [bulkPrice, setBulkPrice] = useState('1500');
  const [generatingBulk, setGeneratingBulk] = useState(false);

  // Maintenance Duration Modal
  const [maintenanceRoom, setMaintenanceRoom] = useState<RoomItem | null>(null);
  const [maintenanceDuration, setMaintenanceDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [maintenanceReason, setMaintenanceReason] = useState<string>('સફાઈ (Cleaning)');
  const [settingMaintenance, setSettingMaintenance] = useState(false);

  useEffect(() => {
    if (selectedHotelId && selectedHotelId !== 'all') {
      setNewHotelId(selectedHotelId);
    } else if (hotels.length > 0) {
      setNewHotelId(hotels[0].id);
    }
  }, [selectedHotelId, hotels]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedHotelId) params.set('hotelId', selectedHotelId);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/rooms?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch {
      showToast(isGu ? 'રૂમ લોડ કરવામાં ભૂલ આવી' : 'Error loading rooms', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId, statusFilter, showToast, isGu]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('status');
      if (s && ['all', 'available', 'occupied', 'maintenance'].includes(s)) {
        setStatusFilter(s as 'all' | 'available' | 'occupied' | 'maintenance');
      }
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleStatusUpdate = async (roomId: string, newStatus: 'available' | 'occupied' | 'maintenance') => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(
          isGu
            ? `રૂમ સ્થિતિ બદલાઈ: ${newStatus === 'available' ? 'ખાલી' : newStatus === 'maintenance' ? 'સમારકામ' : 'ભરેલ'}`
            : `Room status updated to ${newStatus}`,
          'success'
        );
        fetchRooms();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update room', 'error');
      }
    } catch {
      showToast(isGu ? 'અપડેટ કરવામાં ભૂલ આવી' : 'Error updating room', 'error');
    }
  };

  // Listen for custom rooms-updated event from MaintenanceAlertModal
  useEffect(() => {
    const handleRoomsUpdated = () => fetchRooms();
    window.addEventListener('rooms-updated', handleRoomsUpdated);
    return () => window.removeEventListener('rooms-updated', handleRoomsUpdated);
  }, [fetchRooms]);

  const openMaintenanceModal = (room: RoomItem) => {
    setMaintenanceRoom(room);
    setMaintenanceDuration(30);
    setCustomDuration('');
    setMaintenanceReason('સફાઈ (Cleaning)');
  };

  const handleConfirmMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceRoom) return;

    const duration = customDuration ? Number(customDuration) : maintenanceDuration;
    if (!duration || duration <= 0) {
      showToast(isGu ? 'કૃપા કરીને માન્ય સમય દાખલ કરો' : 'Please enter a valid duration', 'error');
      return;
    }

    setSettingMaintenance(true);
    try {
      const res = await fetch(`/api/rooms/${maintenanceRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'maintenance',
          durationMinutes: duration,
          maintenanceReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to set room in maintenance', 'error');
        return;
      }

      showToast(
        isGu
          ? `🔧 રૂમ ${maintenanceRoom.roomNumber} સમારકામમાં મુકાયો! (${duration} મિનિટ પછી ઓટોમેટિક એલર્ટ આવશે)`
          : `🔧 Room ${maintenanceRoom.roomNumber} set to maintenance (${duration}m timer started)`,
        'success'
      );

      setMaintenanceRoom(null);
      fetchRooms();
    } catch {
      showToast(isGu ? 'સમારકામ સેટ કરવામાં ભૂલ આવી' : 'Error setting maintenance', 'error');
    } finally {
      setSettingMaintenance(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelId || !newRoomNumber.trim()) {
      showToast(isGu ? 'કૃપા કરીને બધી જરૂરી વિગતો ભરો' : 'Please fill all required fields', 'error');
      return;
    }

    setAddingRoom(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: newHotelId,
          roomNumber: newRoomNumber.trim(),
          type: newType,
          floor: newFloor,
          pricePerDay: Number(newPrice) || 0,
          status: 'available',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create room', 'error');
        return;
      }

      showToast(
        isGu ? `રૂમ ${newRoomNumber} સફળતાપૂર્વક ઉમેરાઈ ગયો` : `Room ${newRoomNumber} added successfully`,
        'success'
      );
      setShowAddModal(false);
      setNewRoomNumber('');
      fetchRooms();
    } catch {
      showToast(isGu ? 'રૂમ ઉમેરવામાં ભૂલ આવી' : 'Error creating room', 'error');
    } finally {
      setAddingRoom(false);
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelId) {
      showToast(isGu ? 'કૃપા કરીને હોટલ પસંદ કરો' : 'Please select a hotel', 'error');
      return;
    }

    setGeneratingBulk(true);
    try {
      const res = await fetch('/api/rooms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: newHotelId,
          startNumber: Number(bulkStartNumber) || 101,
          count: Number(bulkCount) || 10,
          floor: bulkFloor,
          type: bulkType,
          pricePerDay: Number(bulkPrice) || 1500,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to auto-generate rooms', 'error');
        return;
      }

      showToast(
        isGu
          ? `🎉 ${data.createdCount} નવા રૂમ સફળતાપૂર્વક ઓટોમેટિક બની ગયા!`
          : `🎉 ${data.createdCount} rooms successfully auto-generated!`,
        'success'
      );
      setShowBulkModal(false);
      fetchRooms();
    } catch {
      showToast(isGu ? 'ઓટો જનરેટ કરવામાં ભૂલ આવી' : 'Error auto-generating rooms', 'error');
    } finally {
      setGeneratingBulk(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.roomNumber.toLowerCase().includes(term) ||
      r.type.toLowerCase().includes(term) ||
      r.hotelName.toLowerCase().includes(term)
    );
  });

  const isOwner = user?.role === 'owner';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            <BedDouble className="w-3.5 h-3.5" />
            <span>{isGu ? 'રૂમ ઇન્વેન્ટરી અને સ્થિતિ' : 'Room Inventory'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isGu ? 'રૂમ મેનેજમેન્ટ (Rooms)' : 'Room Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isGu
              ? 'રૂમ ખાલી છે કે ભરેલ, સમારકામ (મેન્ટેનન્સ) અને રૂમ ભાડું મેનેજ કરો.'
              : 'View room occupancy, mark rooms for maintenance, or configure inventory.'}
          </p>
        </div>

        {isOwner && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white text-white" />
              <span>{isGu ? '⚡ ઓટો રૂમ (1-Click)' : '⚡ Auto Generate'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-700/20 active:scale-95 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isGu ? '+ નવો રૂમ' : '+ Add Room'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters and search */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isGu ? 'રૂમ નંબર, પ્રકાર અથવા હોટલ શોધો...' : 'Search room number, type, or hotel...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: isGu ? 'બધા (All)' : 'All Rooms' },
                  { id: 'available', label: isGu ? 'ખાલી (Available)' : 'Available' },
                  { id: 'occupied', label: isGu ? 'ભરેલ (Occupied)' : 'Occupied' },
                  { id: 'maintenance', label: isGu ? 'સમારકામ (Repair)' : 'Maintenance' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchRooms()}
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-xl transition shrink-0 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <p className="text-sm">{isGu ? 'રૂમ લોડ થઈ રહ્યા છે...' : 'Loading rooms...'}</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <BedDouble className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-semibold text-slate-800">
            {isGu ? 'કોઈ રૂમ મળ્યા નથી' : 'No rooms found'}
          </h3>
          <p className="text-xs text-slate-500">
            {isGu ? 'ફિલ્ટર બદલો અથવા નવો રૂમ ઉમેરો.' : 'Try adjusting your filters or add a new room.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredRooms.map((room) => {
            const isAvailable = room.status === 'available';
            const isOccupied = room.status === 'occupied';
            const isMaintenance = room.status === 'maintenance';

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-extrabold text-slate-900">
                      Room {room.roomNumber}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-800'
                          : isOccupied
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isAvailable
                        ? isGu ? 'ખાલી (Available)' : 'Available'
                        : isOccupied
                        ? isGu ? 'ભરેલ (Occupied)' : 'Occupied'
                        : isGu ? 'સમારકામ' : 'Maintenance'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mt-1">
                    <span className="font-semibold text-slate-800">{room.type}</span>
                    {room.floor && <span className="text-slate-400"> &bull; {room.floor}</span>}
                  </div>

                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">{room.hotelName}</div>

                  {room.pricePerDay && (
                    <div className="text-xs font-semibold text-slate-700 mt-2">
                      ₹{room.pricePerDay} / {isGu ? 'દિવસ' : 'day'}
                    </div>
                  )}
                </div>

                {/* Status Toggle Buttons */}
                <div className="pt-2 border-t border-slate-100 text-xs">
                  {isAvailable && (
                    <button
                      type="button"
                      onClick={() => openMaintenanceModal(room)}
                      className="w-full py-2 px-2.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{isGu ? 'સમારકામમાં મૂકો' : 'Set Maintenance'}</span>
                    </button>
                  )}

                  {isMaintenance && (() => {
                    const isTimeUp = room.maintenanceUntil ? new Date(room.maintenanceUntil) <= new Date() : false;
                    const remainingMins = room.maintenanceUntil
                      ? Math.max(1, Math.ceil((new Date(room.maintenanceUntil).getTime() - Date.now()) / 60000))
                      : null;

                    return (
                      <div className="space-y-1.5">
                        {/* Status/Timer Badge */}
                        <div
                          className={`p-2 rounded-xl border text-[11px] font-semibold flex items-center justify-between ${
                            isTimeUp
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 animate-pulse'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            {isTimeUp ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{isGu ? '🎉 સમય પૂર્ણ (તૈયાર)' : 'Time Up (Ready)'}</span>
                              </>
                            ) : (
                              <>
                                <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{remainingMins ? `બાકી: ~${remainingMins} મિ.` : 'સમારકામ ચાલુ'}</span>
                              </>
                            )}
                          </div>
                          {room.maintenanceReason && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                              {room.maintenanceReason}
                            </span>
                          )}
                        </div>

                        {/* Set Available Button */}
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(room.id, 'available')}
                          className={`w-full py-2 px-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                            isTimeUp
                              ? 'text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20 active:scale-95'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isGu ? 'રૂમ ખાલી જાહેર કરો' : 'Set Available'}</span>
                        </button>
                      </div>
                    );
                  })()}

                  {isOccupied && (
                    <div className="py-1 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-slate-100">
                      {isGu ? '🔒 મહેમાન રોકાયેલ છે' : '🔒 Occupied by Guest'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                <BedDouble className="w-4 h-4" />
                <span>{isGu ? 'નવો રૂમ' : 'New Room'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {isGu ? 'હોટલમાં નવો રૂમ ઉમેરો' : 'Add New Room'}
              </h3>
              <p className="text-xs text-slate-500">
                {isGu ? 'રૂમ નંબર, પ્રકાર, માળ અને દૈનિક ભાડું દાખલ કરો.' : 'Assign room number, type, and tariff.'}
              </p>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isGu ? 'હોટલ શાખા (Hotel Branch)' : 'Hotel'}
                </label>
                <select
                  aria-label="Hotel"
                  required
                  value={newHotelId}
                  onChange={(e) => setNewHotelId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                >
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'રૂમ નંબર' : 'Room Number'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 106, 204"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'પ્રકાર' : 'Room Type'}
                  </label>
                  <select
                    aria-label="Room Type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                    <option value="Family">Family</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'માળ (Floor)' : 'Floor'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Floor"
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'દૈનિક ભાડું (₹)' : 'Tariff (₹/day)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1800"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {isGu ? 'રદ કરો' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addingRoom}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow disabled:opacity-50 cursor-pointer"
                >
                  {addingRoom
                    ? (isGu ? 'ઉમેરાઈ રહ્યો છે...' : 'Creating...')
                    : (isGu ? 'રૂમ ઉમેરો' : 'Create Room')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto Bulk Room Generator Modal */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{isGu ? 'ઝડપી ઓટોમેશન' : 'Fast Bulk Setup'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {isGu ? '⚡ ઓટો રૂમ જનરેટર (Bulk Rooms)' : 'Auto Generate Rooms'}
              </h3>
              <p className="text-xs text-slate-500">
                {isGu
                  ? 'એક-એક રૂમ ટાઇપ કરવાની જરૂર નથી! 1 ક્લિકમાં બધા રૂમ ઓટોમેટિક બની જશે.'
                  : 'No need to type room by room. Generate multiple rooms at once with 1 click.'}
              </p>
            </div>

            <form onSubmit={handleBulkGenerate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isGu ? 'હોટલ શાખા' : 'Hotel'}
                </label>
                <select
                  aria-label="Hotel"
                  required
                  value={newHotelId}
                  onChange={(e) => setNewHotelId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                >
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'શરૂઆત નંબર' : 'Start Number'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="101"
                    value={bulkStartNumber}
                    onChange={(e) => setBulkStartNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                  <span className="text-[10px] text-slate-400">e.g. 101, 201</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'કેટલા રૂમ બનાવવા?' : 'How many rooms?'}
                  </label>
                  <select
                    aria-label="Room Count"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
                  >
                    <option value="5">5 {isGu ? 'રૂમ' : 'Rooms'}</option>
                    <option value="10">10 {isGu ? 'રૂમ' : 'Rooms'} (Default)</option>
                    <option value="15">15 {isGu ? 'રૂમ' : 'Rooms'}</option>
                    <option value="20">20 {isGu ? 'રૂમ' : 'Rooms'}</option>
                    <option value="30">30 {isGu ? 'રૂમ' : 'Rooms'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'માળ (Floor)' : 'Floor'}
                  </label>
                  <input
                    type="text"
                    placeholder="1st Floor"
                    value={bulkFloor}
                    onChange={(e) => setBulkFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'પ્રકાર' : 'Type'}
                  </label>
                  <select
                    aria-label="Room Type"
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="Single AC">Single AC</option>
                    <option value="Double AC">Double AC</option>
                    <option value="Deluxe AC">Deluxe AC</option>
                    <option value="Super Deluxe">Super Deluxe</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isGu ? 'દૈનિક ભાડું (₹)' : 'Tariff (₹/day)'}
                </label>
                <input
                  type="number"
                  min="100"
                  required
                  placeholder="1500"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800">
                ⚡ {isGu
                  ? `આનાથી રૂમ ${bulkStartNumber} થી શરૂ થઈને ${Number(bulkStartNumber) + Number(bulkCount) - 1} સુધી આપમેળે બની જશે.`
                  : `This will instantly create rooms from ${bulkStartNumber} to ${Number(bulkStartNumber) + Number(bulkCount) - 1}.`}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {isGu ? 'રદ કરો' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={generatingBulk}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  {generatingBulk
                    ? (isGu ? 'બની રહ્યા છે...' : 'Generating...')
                    : (isGu ? 'ઓટો જનરેટ કરો' : 'Auto Generate Now')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Maintenance Duration Modal */}
      {maintenanceRoom && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setMaintenanceRoom(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>{isGu ? 'રૂમ સમારકામ સમયગાળો' : 'Maintenance Timer'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {isGu
                  ? `Room ${maintenanceRoom.roomNumber} સમારકામમાં મૂકો`
                  : `Set Maintenance for Room ${maintenanceRoom.roomNumber}`}
              </h3>
              <p className="text-xs text-slate-500">
                {isGu
                  ? 'સમય પસંદ કરો. સમય પૂરો થતાં જ આ રૂમને ખાલી (Available) કરવાનો સ્ક્રીન પર પોપઅપ આવી જશે!'
                  : 'Choose duration. A full-screen popup will notify you when time is up!'}
              </p>
            </div>

            <form onSubmit={handleConfirmMaintenance} className="space-y-4">
              {/* Reason Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  {isGu ? 'સમારકામનો પ્રકાર / કારણ' : 'Reason / Task'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    '🧹 સફાઈ (Cleaning)',
                    '❄️ AC સર્વિસ (AC Repair)',
                    '🔧 પ્લમ્બિંગ (Plumbing)',
                    '🎨 કલરકામ (Painting)',
                    '🛏️ ચાદર/ગાદલા (Linen Change)',
                    '🔍 ઈન્સ્પેક્શન (Inspection)',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMaintenanceReason(r)}
                      className={`text-left text-xs p-2 rounded-xl border font-semibold transition cursor-pointer ${
                        maintenanceReason === r
                          ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  {isGu ? 'કેટલો સમય લાગશે? (Duration)' : 'Expected Duration'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mins: 15, label: '૧૫ મિનિટ (15m)' },
                    { mins: 30, label: '૩૦ મિનિટ (30m)' },
                    { mins: 45, label: '૪૫ મિનિટ (45m)' },
                    { mins: 60, label: '૧ કલાક (1h)' },
                    { mins: 120, label: '૨ કલાક (2h)' },
                    { mins: 240, label: '૪ કલાક (4h)' },
                  ].map((d) => (
                    <button
                      key={d.mins}
                      type="button"
                      onClick={() => {
                        setMaintenanceDuration(d.mins);
                        setCustomDuration('');
                      }}
                      className={`py-2 px-1 text-center text-xs rounded-xl border font-bold transition cursor-pointer ${
                        !customDuration && maintenanceDuration === d.mins
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Custom Minutes Input */}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium shrink-0">
                    {isGu ? 'અથવા કસ્ટમ મિનિટ:' : 'Or custom minutes:'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    placeholder="e.g. 20"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    {isGu ? 'મિનિટ' : 'mins'}
                  </span>
                </div>
              </div>

              {/* Informative Preview Card */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isGu ? 'ઓટોમેટિક પોપઅપ એલર્ટ:' : 'Automatic Alert Notification:'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {isGu
                    ? `રૂમ ${maintenanceRoom.roomNumber} નું સમારકામ પૂરું થતાં જ આખી સ્ક્રીન પર પોપઅપ આવશે જેથી તમે ૧ ક્લિકમાં આ રૂમ ખાલી જાહેર કરી શકશો.`
                    : `When time is up, a full-screen notification will appear allowing you to mark Room ${maintenanceRoom.roomNumber} available in 1 click.`}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceRoom(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {isGu ? 'રદ કરો' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={settingMaintenance}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  {settingMaintenance
                    ? (isGu ? 'સેટ થઈ રહ્યું છે...' : 'Setting...')
                    : (isGu ? 'સમારકામ શરૂ કરો (Start Timer)' : 'Start Maintenance Timer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
