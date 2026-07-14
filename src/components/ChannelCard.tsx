import React from "react";
import { Star, Tv, Languages, Globe } from "lucide-react";
import { Channel } from "../types";
import { motion } from "motion/react";

interface ChannelCardProps {
  channel: Channel;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

export default function ChannelCard({ 
  channel, 
  isActive, 
  isFavorite, 
  onSelect, 
  onToggleFavorite 
}: ChannelCardProps) {
  // Get primary language name
  const primaryLang = channel.languages && channel.languages.length > 0 
    ? channel.languages[0] 
    : null;

  return (
    <motion.div
      id={`channel-card-${channel.id}`}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`relative group rounded-xl p-4 bg-[#16181D] border transition-all duration-300 cursor-pointer overflow-hidden ${
        isActive 
          ? "border-blue-500 shadow-xl shadow-blue-500/10 bg-gradient-to-br from-[#16181D] to-[#1E2129]" 
          : "border-white/5 hover:border-blue-500/40 bg-[#16181D]/80 hover:bg-[#16181D]"
      }`}
    >
      {/* Decorative Corner Glow */}
      {isActive && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
      )}

      {/* Action Buttons: Favorites */}
      <button
        id={`btn-fav-toggle-${channel.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`absolute top-3 right-3 p-2 rounded-lg transition-colors z-10 ${
          isFavorite 
            ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" 
            : "bg-black/40 text-slate-400 hover:text-white hover:bg-black/60"
        }`}
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      >
        <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-amber-400" : ""}`} />
      </button>

      {/* Channel Logo and Core Info */}
      <div className="flex items-start gap-3.5">
        <div className="relative w-14 h-14 flex-shrink-0 bg-black rounded-lg border border-white/10 p-1.5 flex items-center justify-center overflow-hidden group-hover:border-blue-500/30 transition">
          {channel.logo ? (
            <img 
              src={channel.logo} 
              alt={`${channel.name} logo`}
              className="w-full h-full object-contain rounded"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=80`;
              }}
            />
          ) : (
            <div className="w-full h-full rounded bg-blue-500/5 text-blue-400 flex items-center justify-center font-bold text-lg">
              {channel.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Active Status Ring (If currently selected) */}
          {isActive && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-black animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-slate-200 font-bold text-sm sm:text-base leading-snug group-hover:text-blue-400 transition truncate uppercase tracking-tight">
            {channel.name}
          </h4>

          {/* Country Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 truncate">
            <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate text-[11px] uppercase tracking-wider">{channel.country?.name || "Global / Online"}</span>
          </div>

          {/* Language Indicator */}
          {primaryLang && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 truncate">
              <Languages className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="truncate text-[11px] uppercase tracking-wider">{primaryLang}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info: Stream Count Badge */}
      <div className="flex items-center justify-between border-t border-white/5 mt-4 pt-3 text-[10px] font-mono">
        <span className="text-slate-500 flex items-center gap-1 uppercase tracking-widest font-bold">
          <Tv className="w-3.5 h-3.5 text-blue-500" /> 
          STREAM FEED
        </span>
        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
          {channel.streams.length} {channel.streams.length === 1 ? 'SOURCE' : 'SOURCES'}
        </span>
      </div>
    </motion.div>
  );
}
