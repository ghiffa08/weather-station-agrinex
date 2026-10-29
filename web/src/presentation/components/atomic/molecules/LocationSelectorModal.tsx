import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, X, Check, Search, Globe, AlertCircle, RefreshCw, Sparkles, RotateCcw } from 'lucide-react';
import { 
  LocationService, 
  BMKG_LOCATION_CATALOG, 
  DEFAULT_LOCATION,
  type LocationItem 
} from '../../../../core/services/LocationService';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected?: (location: LocationItem) => void;
}

// Rekomendasi Wilayah Populer untuk Satu Klik Cepat
const POPULAR_LOCATIONS: { label: string; adm4: string }[] = [
  { label: 'Kuningan Kota', adm4: '32.08.09.1002' },
  { label: 'Kel. Cijoho', adm4: '32.08.09.1005' },
  { label: 'Kadugede', adm4: '32.08.01.2001' },
  { label: 'Cilimus', adm4: '32.08.13.2001' },
  { label: 'Darma', adm4: '32.08.20.2001' },
  { label: 'Kota Cirebon', adm4: '32.74.01.1001' },
  { label: 'Kota Bandung', adm4: '32.73.01.1001' },
  { label: 'DKI Jakarta', adm4: '31.71.01.1001' },
];

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  onLocationSelected,
}) => {
  const [activeLoc, setActiveLoc] = useState<LocationItem>(LocationService.getActiveLocation());
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cascading Selection State
  const [selectedDistrict, setSelectedDistrict] = useState<string>(activeLoc.district);
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<string>(activeLoc.subdistrict);
  const [selectedAdm4, setSelectedAdm4] = useState<string>(activeLoc.adm4);

  // Custom manual input state
  const [customAdm4, setCustomAdm4] = useState<string>('');
  const [isValidatingCustom, setIsValidatingCustom] = useState<boolean>(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const cur = LocationService.getActiveLocation();
      setActiveLoc(cur);
      setSelectedDistrict(cur.district);
      setSelectedSubdistrict(cur.subdistrict);
      setSelectedAdm4(cur.adm4);
      setSearchQuery('');
      setCustomError(null);
      // Lock background scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Distinct lists for cascading selection
  const districts = useMemo(() => {
    return Array.from(new Set(BMKG_LOCATION_CATALOG.map(l => l.district)));
  }, []);

  const subdistricts = useMemo(() => {
    return Array.from(
      new Set(
        BMKG_LOCATION_CATALOG
          .filter(l => l.district === selectedDistrict)
          .map(l => l.subdistrict)
      )
    );
  }, [selectedDistrict]);

  const villages = useMemo(() => {
    return BMKG_LOCATION_CATALOG.filter(
      l => l.district === selectedDistrict && l.subdistrict === selectedSubdistrict
    );
  }, [selectedDistrict, selectedSubdistrict]);

  // Filtered catalog by free search
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return BMKG_LOCATION_CATALOG.filter(
      l =>
        l.village.toLowerCase().includes(q) ||
        l.subdistrict.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        l.adm4.includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectLocation = (loc: LocationItem) => {
    LocationService.setActiveLocation(loc);
    setActiveLoc(loc);
    setSelectedDistrict(loc.district);
    setSelectedSubdistrict(loc.subdistrict);
    setSelectedAdm4(loc.adm4);
    onLocationSelected?.(loc);
    onClose();
  };

  const handleResetDefault = () => {
    handleSelectLocation(DEFAULT_LOCATION);
  };

  // Change District -> auto select first subdistrict & village
  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    const availableSubs = Array.from(
      new Set(
        BMKG_LOCATION_CATALOG
          .filter(l => l.district === newDistrict)
          .map(l => l.subdistrict)
      )
    );
    const firstSub = availableSubs[0] || '';
    setSelectedSubdistrict(firstSub);

    const availableVils = BMKG_LOCATION_CATALOG.filter(
      l => l.district === newDistrict && l.subdistrict === firstSub
    );
    setSelectedAdm4(availableVils[0]?.adm4 || '');
  };

  // Change Subdistrict -> auto select first village
  const handleSubdistrictChange = (newSub: string) => {
    setSelectedSubdistrict(newSub);
    const availableVils = BMKG_LOCATION_CATALOG.filter(
      l => l.district === selectedDistrict && l.subdistrict === newSub
    );
    setSelectedAdm4(availableVils[0]?.adm4 || '');
  };

  // Apply cascading selection
  const handleApplyCascading = () => {
    const loc = BMKG_LOCATION_CATALOG.find(l => l.adm4 === selectedAdm4);
    if (loc) {
      handleSelectLocation(loc);
    }
  };

  // Validate custom ADM4 online via BMKG API
  const handleValidateCustomAdm4 = async () => {
    if (!customAdm4.trim()) {
      setCustomError('Masukkan kode adm4 Kemendagri 10-digit (contoh: 32.08.09.1002)');
      return;
    }
    setIsValidatingCustom(true);
    setCustomError(null);
    try {
      const resolved = await LocationService.resolveAdm4FromApi(customAdm4);
      if (resolved) {
        handleSelectLocation(resolved);
      } else {
        setCustomError(`Kode "${customAdm4}" tidak ditemukan pada database BMKG.`);
      }
    } catch {
      setCustomError('Koneksi ke BMKG gagal. Periksa jaringan internet Anda.');
    } finally {
      setIsValidatingCustom(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto neo-card p-4 sm:p-6 space-y-4 shadow-2xl border border-white/80 rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-300/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl neo-pressed text-sky-700 shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight">
                Pilih Wilayah Referensi BMKG
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Sinkronisasi data cuaca makro regional secara dinamis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl neo-pressed hover:bg-gray-200/80 text-gray-600 cursor-pointer active:scale-95 transition"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Active Location Banner */}
        <div className="p-3 sm:p-3.5 rounded-2xl neo-pressed flex items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                Wilayah Aktif Saat Ini
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-700">
                ADM4: {activeLoc.adm4}
              </span>
            </div>
            <p className="font-extrabold text-gray-800 text-xs sm:text-sm mt-0.5">
              {activeLoc.village}, {activeLoc.subdistrict}
            </p>
            <p className="text-[10px] text-gray-500 font-medium">
              {activeLoc.district}, {activeLoc.province} • Elevasi {activeLoc.elevation_m} mdpl
            </p>
          </div>
          {activeLoc.adm4 !== DEFAULT_LOCATION.adm4 && (
            <button
              onClick={handleResetDefault}
              className="px-2.5 py-1.5 rounded-xl neo-flat hover:neo-pressed text-[10px] font-bold text-gray-700 flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 shadow-sm"
              title="Kembalikan ke Default Kuningan"
            >
              <RotateCcw size={12} className="text-gray-500" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Quick Popular Location Chips */}
        <div className="space-y-1.5">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-500 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500" />
            <span>Pilihan Cepat Wilayah Populer</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_LOCATIONS.map(item => {
              const isSelected = activeLoc.adm4 === item.adm4;
              return (
                <button
                  key={item.adm4}
                  onClick={() => {
                    const found = BMKG_LOCATION_CATALOG.find(l => l.adm4 === item.adm4);
                    if (found) handleSelectLocation(found);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                    isSelected
                      ? 'neo-pressed bg-sky-500/10 text-sky-800 border border-sky-500/30 font-extrabold'
                      : 'neo-flat hover:neo-pressed text-gray-700'
                  }`}
                >
                  <span>{item.label}</span>
                  {isSelected && <span className="ml-1 text-sky-600">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama desa, kelurahan, kecamatan, atau kabupaten..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl neo-pressed bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Search Results (Live Filter) */}
        {searchQuery.trim() !== '' && (
          <div className="space-y-1 max-h-52 overflow-y-auto p-1 neo-pressed rounded-2xl">
            <div className="p-2 border-b border-gray-300/30 flex justify-between items-center text-[10px] uppercase font-extrabold text-gray-500">
              <span>Hasil Pencarian</span>
              <span>{filteredCatalog.length} Ditemukan</span>
            </div>
            {filteredCatalog.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Wilayah tidak ada di katalog lokal. Anda dapat memasukkan kode adm4 manual di bawah.
              </p>
            ) : (
              filteredCatalog.map(loc => {
                const isSelected = activeLoc.adm4 === loc.adm4;
                return (
                  <button
                    key={loc.adm4}
                    onClick={() => handleSelectLocation(loc)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 font-extrabold text-sky-900 border border-sky-500/30'
                        : 'hover:bg-white/60 text-gray-700'
                    }`}
                  >
                    <div>
                      <p className="font-bold">{loc.village}, {loc.subdistrict}</p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {loc.district} • ADM4: {loc.adm4}
                      </p>
                    </div>
                    {isSelected && <Check size={16} className="text-sky-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Cascading Selection (Kabupaten -> Kecamatan -> Desa) */}
        {searchQuery.trim() === '' && (
          <div className="p-3.5 rounded-2xl neo-pressed space-y-3">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-600 block">
              Pilih Berdasarkan Wilayah Administratif
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Kab / Kota */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">1. Kabupaten / Kota</label>
                <select
                  value={selectedDistrict}
                  onChange={e => handleDistrictChange(e.target.value)}
                  className="w-full p-2 rounded-xl neo-flat text-xs font-semibold text-gray-800 bg-[#e0e5ec] border border-gray-300/40 focus:outline-none cursor-pointer"
                >
                  {districts.map(d => (
                    <option key={d} value={d} className="bg-white text-gray-900">{d}</option>
                  ))}
                </select>
              </div>

              {/* 2. Kecamatan */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">2. Kecamatan</label>
                <select
                  value={selectedSubdistrict}
                  onChange={e => handleSubdistrictChange(e.target.value)}
                  className="w-full p-2 rounded-xl neo-flat text-xs font-semibold text-gray-800 bg-[#e0e5ec] border border-gray-300/40 focus:outline-none cursor-pointer"
                >
                  {subdistricts.map(s => (
                    <option key={s} value={s} className="bg-white text-gray-900">{s}</option>
                  ))}
                </select>
              </div>

              {/* 3. Kelurahan / Desa */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">3. Kelurahan / Desa</label>
                <select
                  value={selectedAdm4}
                  onChange={e => setSelectedAdm4(e.target.value)}
                  className="w-full p-2 rounded-xl neo-flat text-xs font-semibold text-gray-800 bg-[#e0e5ec] border border-gray-300/40 focus:outline-none cursor-pointer"
                >
                  {villages.map(v => (
                    <option key={v.adm4} value={v.adm4} className="bg-white text-gray-900">
                      {v.village} ({v.adm4.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyCascading}
              className="w-full py-2.5 px-4 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-sky-800 flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm mt-1"
            >
              <Check size={14} className="text-sky-600" />
              <span>Terapkan Wilayah Terpilih</span>
            </button>
          </div>
        )}

        {/* Custom ADM4 Code Input Section */}
        <div className="p-3.5 rounded-2xl neo-pressed space-y-2 border-t border-gray-300/30">
          <div className="flex items-center gap-1.5">
            <Globe size={14} className="text-purple-600 shrink-0" />
            <span className="text-xs font-extrabold text-gray-800">
              Input Manual Kode Kemendagri ADM4 (Nasional)
            </span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Mendukung seluruh kode wilayah 10-digit di Indonesia. Sistem akan langsung mengambil data prakiraan resmi BMKG.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={customAdm4}
              onChange={e => setCustomAdm4(e.target.value)}
              placeholder="Contoh: 32.08.09.1002"
              className="flex-1 p-2.5 rounded-xl neo-flat bg-transparent font-mono text-xs text-gray-800 focus:outline-none"
            />
            <button
              onClick={handleValidateCustomAdm4}
              disabled={isValidatingCustom}
              className="px-3.5 py-2 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-purple-800 flex items-center gap-1.5 cursor-pointer transition shrink-0"
            >
              {isValidatingCustom ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-purple-600" />
                  <span>Validasi...</span>
                </>
              ) : (
                <span>Terapkan</span>
              )}
            </button>
          </div>

          {customError && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold pt-1">
              <AlertCircle size={14} className="shrink-0" />
              <span>{customError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
