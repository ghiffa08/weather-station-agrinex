import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  startIndex: number;
  endIndex: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (newPage: number) => void;
  onItemsPerPageChange: (newLimit: number) => void;
  itemLabel?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  startIndex,
  endIndex,
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemLabel = 'log telemetry',
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-3 border-t border-gray-300/40 text-xs">
      {/* Range Info */}
      <div className="text-[11px] text-gray-500 font-medium text-center sm:text-left">
        Menampilkan <span className="font-bold text-gray-800">{startIndex}-{endIndex}</span> dari{' '}
        <span className="font-bold text-gray-800">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-3">
        {/* Limit Selector */}
        <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
          <span>Baris:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="p-1 rounded-lg neo-pressed bg-transparent font-bold text-gray-800 cursor-pointer focus:outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Prev / Next controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              currentPage === 1
                ? 'neo-pressed opacity-40 cursor-not-allowed text-gray-400'
                : 'neo-pressed hover:bg-gray-200/60 active:scale-90 text-gray-700 cursor-pointer'
            }`}
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="px-3 py-1 rounded-xl neo-pressed text-[11px] font-bold text-gray-800 font-mono">
            {currentPage} / {totalPages}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              currentPage === totalPages
                ? 'neo-pressed opacity-40 cursor-not-allowed text-gray-400'
                : 'neo-pressed hover:bg-gray-200/60 active:scale-90 text-gray-700 cursor-pointer'
            }`}
            title="Halaman Selanjutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
