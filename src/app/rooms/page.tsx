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
}

export default function RoomsPage() {
  const { user, selectedHotelId, hotels } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied' | 'maintenance'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Add room modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHotelId, setNewHotelId] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newType, setNewType] = useState('Double');
  const [newFloor, setNewFloor] = useState('1st Floor');
  const [newPrice, setNewPrice] = useState('1800');
  const [addingRoom, setAddingRoom] = useState(false);

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
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-700/20 active:scale-95 transition self-stretch sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isGu ? '+ નવો રૂમ ઉમેરો (Add Room)' : 'Add New Room'}</span>
          </button>
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
                      onClick={() => handleStatusUpdate(room.id, 'maintenance')}
                      className="w-full py-2 px-2.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{isGu ? 'સમારકામમાં મૂકો' : 'Set Maintenance'}</span>
                    </button>
                  )}

                  {isMaintenance && (
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(room.id, 'available')}
                      className="w-full py-2 px-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isGu ? 'રૂમ ખાલી જાહેર કરો' : 'Set Available'}</span>
                    </button>
                  )}

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
    </div>
  );
}
