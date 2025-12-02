
import React from 'react';
import { Check, X, ArrowLeft } from 'lucide-react';

interface ReviewModalProps {
  originalText: string;
  correctedText: string;
  onAccept: () => void;
  onDiscard: () => void;
  visible: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  originalText,
  correctedText,
  onAccept,
  onDiscard,
  visible,
}) => {
  if (!visible) return null;

  return (
    <div className="absolute bottom-16 left-0 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden font-sans animate-in fade-in zoom-in duration-200">
      <div className="bg-teal-600 px-4 py-2 flex justify-between items-center text-white">
        <span className="text-xs font-bold">پیشنهاد هوش مصنوعی</span>
        <button onClick={onDiscard} className="hover:bg-teal-700 rounded p-1">
          <X size={14} />
        </button>
      </div>
      
      <div className="p-4 space-y-3">
        {/* Comparison - Simple diff visualization */}
        <div className="text-sm space-y-2">
           <div className="bg-red-50 p-2 rounded border border-red-100 text-red-800 line-through opacity-70 text-xs">
            {originalText.length > 60 ? originalText.substring(0, 60) + '...' : originalText}
           </div>
           <div className="flex justify-center">
             <ArrowLeft size={14} className="text-gray-400 rotate-90" />
           </div>
           <div className="bg-teal-50 p-2 rounded border border-teal-100 text-teal-900 text-sm font-medium leading-relaxed">
            {correctedText}
           </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={onDiscard}
            className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
          >
            نادیده گرفتن
          </button>
          <button
            onClick={onAccept}
            className="flex-[2] py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-md shadow-teal-200 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={14} />
            جایگزین کن
          </button>
        </div>
      </div>
    </div>
  );
};