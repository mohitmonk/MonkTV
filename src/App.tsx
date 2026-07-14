import React, { useState, useEffect, useMemo } from "react";
import { 
  Tv, 
  Search, 
  Star, 
  RefreshCw, 
  Globe, 
  Languages, 
  Activity, 
  ChevronRight, 
  History, 
  AlertCircle, 
  Filter, 
  X, 
  Radio, 
  Compass,
  Play,
  Share2,
  Bookmark,
  Info,
  SlidersHorizontal,
  Wifi
} from "lucide-react";
import { Channel, FilterState, ServerState } from "./types";
import IPTVPlayer from "./components/IPTVPlayer";
import ChannelCard from "./components/ChannelCard";
import { motion, AnimatePresence } from "motion/react";

// Standard popular country choices for sports
const POPULAR_COUNTRIES = [
  { code: "ALL", name: "Global" },
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "FR", name: "France" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" }
];

export default function App() {
  // Main states
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(0);
  
  // Storage states
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("iptv_favorites");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [recentChannelIds, setRecentChannelIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("iptv_recents");
    return saved ? JSON.parse(saved) : [];
  });

  // Filter & UI states
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    countryCode: "ALL",
    language: "ALL",
    sortBy: "name",
    favoritesOnly: false
  });

  const [serverState, setServerState] = useState<ServerState>({
    isLoaded: false,
    isLoading: true,
    lastFetched: null,
    error: null,
    count: 0
  });

  const [activeMobileTab, setActiveMobileTab] = useState<"browse" | "favorites" | "recents" | "guide">("browse");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load Channels on Mount
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    setServerState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/channels");
      const data = await response.json();
      
      if (data.success) {
        setChannels(data.channels);
        setServerState({
          isLoaded: data.isLoaded,
          isLoading: false,
          lastFetched: data.lastFetched,
          error: data.error,
          count: data.count
        });

        // Set default active channel (prefer Red Bull TV or first stream) if none active
        if (data.channels.length > 0 && !activeChannel) {
          const redBull = data.channels.find((c: Channel) => c.id.includes("RedBullTV"));
          const defaultChan = redBull || data.channels[0];
          setActiveChannel(defaultChan);
          setSelectedStreamIndex(0);
        }
      } else {
        throw new Error(data.message || "Failed to fetch channels");
      }
    } catch (err: any) {
      console.error("Error fetching channels:", err);
      setServerState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "Could not connect to fullstack IPTV backend server"
      }));
    }
  };

  const handleRefreshServerCache = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        // Poll for completion or just re-fetch after 3 seconds
        setTimeout(() => {
          fetchChannels();
          setIsRefreshing(false);
        }, 3000);
      } else {
        setIsRefreshing(false);
      }
    } catch (err) {
      console.error("Refresh cache failed:", err);
      setIsRefreshing(false);
    }
  };

  // Sync Favorites with LocalStorage
  useEffect(() => {
    localStorage.setItem("iptv_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Sync Recents with LocalStorage
  useEffect(() => {
    localStorage.setItem("iptv_recents", JSON.stringify(recentChannelIds));
  }, [recentChannelIds]);

  const toggleFavorite = (channelId: string) => {
    setFavorites(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const selectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setSelectedStreamIndex(0);

    // Save to recents (move to top, max 8 items)
    setRecentChannelIds(prev => {
      const filtered = prev.filter(id => id !== channel.id);
      return [channel.id, ...filtered].slice(0, 8);
    });

    // Scroll player into view on mobile
    const playerContainer = document.getElementById("iptv-player-container");
    if (playerContainer && window.innerWidth < 1024) {
      playerContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Extract unique languages for filter dropdown
  const availableLanguages = useMemo(() => {
    const langsSet = new Set<string>();
    channels.forEach(c => {
      if (c.languages) {
        c.languages.forEach(l => langsSet.add(l));
      }
    });
    return Array.from(langsSet).sort();
  }, [channels]);

  // Extract unique countries for filter dropdown
  const availableCountries = useMemo(() => {
    const countriesMap = new Map<string, string>();
    channels.forEach(c => {
      if (c.country && c.country.code && c.country.name) {
        countriesMap.set(c.country.code.toUpperCase(), c.country.name);
      }
    });
    return Array.from(countriesMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [channels]);

  // Map recent IDs back to Channel objects
  const recentChannels = useMemo(() => {
    return recentChannelIds
      .map(id => channels.find(c => c.id === id))
      .filter((c): c is Channel => !!c);
  }, [recentChannelIds, channels]);

  // Core filtering logic
  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      // 1. Search Query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesCountry = c.country?.name.toLowerCase().includes(query) || false;
        const matchesLang = c.languages.some(l => l.toLowerCase().includes(query));
        if (!matchesName && !matchesCountry && !matchesLang) return false;
      }

      // 2. Country Filter
      if (filters.countryCode !== "ALL" && c.country?.code !== filters.countryCode) {
        return false;
      }

      // 3. Language Filter
      if (filters.language !== "ALL" && !c.languages.includes(filters.language)) {
        return false;
      }

      // 4. Favorites Only
      if (filters.favoritesOnly && !favorites.includes(c.id)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        const countryA = a.country?.name || "";
        const countryB = b.country?.name || "";
        return countryA.localeCompare(countryB);
      }
    });
  }, [channels, filters, favorites]);

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-200 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* HEADER SECTION */}
      <header id="app-header" className="sticky top-0 z-40 bg-[#0F1117] border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-lg text-white border border-white/10 shadow-lg">
              <Tv className="w-5.5 h-5.5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tighter text-blue-500">
                  MONK<span className="text-white">TV</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-mono ml-2 font-bold">SPORTS</span>
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Free Live Sports Broadcast Navigator</p>
            </div>
          </div>

          {/* Sync Stats & Quick Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-3.5">
            
            {/* Live Counter */}
            <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2.5">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              <span className="text-[10px] font-mono uppercase tracking-tighter text-slate-300">
                System Active: {channels.length} Streams
              </span>
            </div>

            {/* Refresh Action */}
            <button
              id="btn-header-refresh"
              onClick={handleRefreshServerCache}
              disabled={isRefreshing || serverState.isLoading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-full border border-white/10 transition flex items-center gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-widest"
              title="Sync fresh feeds from IPTV-org API database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Sync Feeds"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT FRAME */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COMPONENT: Stream Player Panel & Guide (Width: 60%) */}
        <section className="flex-1 flex flex-col gap-6 min-w-0 lg:max-w-[65%]">
          
          {/* Featured Hero Spotlight Section */}
          <div className="h-52 sm:h-60 rounded-xl p-6 sm:p-8 relative overflow-hidden border border-white/5 shadow-2xl bg-[#0C0D12]">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/70 via-blue-900/30 to-transparent z-10"></div>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
            <div className="relative z-20 h-full flex flex-col justify-end">
              <div className="inline-flex items-center gap-2 bg-red-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-3 w-fit tracking-wider shadow-lg text-white">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Spotlight Event
              </div>
              <h1 className="text-3xl sm:text-4xl font-black italic uppercase leading-none tracking-tighter mb-2 text-white">
                UEFA CHAMPIONS <span className="text-blue-500">LEAGUE LIVE</span>
              </h1>
              <p className="text-slate-300 text-xs max-w-md leading-relaxed line-clamp-2">
                Real Madrid vs. Manchester City — Live multi-angle premium coverage. Select streaming feeds below to start.
              </p>
            </div>
          </div>

          {/* Active Player Box */}
          {activeChannel ? (
            <div className="flex flex-col gap-4">
              <IPTVPlayer
                channel={activeChannel}
                selectedStreamIndex={selectedStreamIndex}
                onStreamIndexChange={setSelectedStreamIndex}
                onClose={() => {
                  // Fallback to redbull or first channel if closed
                  const fallback = channels.find(c => c.id !== activeChannel.id) || channels[0];
                  if (fallback) {
                    setActiveChannel(fallback);
                    setSelectedStreamIndex(0);
                  }
                }}
              />

              {/* Feed Meta description & Support box */}
              <div className="bg-[#16181D] border border-white/5 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                      {activeChannel.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed uppercase tracking-wider font-semibold">
                      Broadcasting from: <span className="text-blue-400">{activeChannel.country?.name || "Global / Online"}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      id="btn-active-fav"
                      onClick={() => toggleFavorite(activeChannel.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                        favorites.includes(activeChannel.id)
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-black/40 border-white/5 text-slate-300 hover:bg-[#1C2029] hover:text-white"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${favorites.includes(activeChannel.id) ? "fill-amber-400" : ""}`} />
                      {favorites.includes(activeChannel.id) ? "Starred" : "Star Feed"}
                    </button>

                    {activeChannel.website && (
                      <a
                        id="btn-active-website"
                        href={activeChannel.website}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-black/40 hover:bg-[#1C2029] border border-white/5 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5"
                      >
                        <Compass className="w-3.5 h-3.5 text-blue-500" />
                        Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Stream stats & Diagnostics details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
                  <div className="bg-[#0C0D12] border border-white/5 p-3.5 rounded-lg">
                    <h5 className="text-slate-500 font-bold uppercase tracking-widest font-mono mb-2 text-[9px]">Active Feed Stream Link</h5>
                    <div className="font-mono text-blue-400 bg-black/60 p-2 rounded-md border border-white/5 select-all truncate text-[11px]">
                      {activeChannel.streams[selectedStreamIndex]?.url || "None available"}
                    </div>
                  </div>

                  <div className="bg-[#0C0D12] border border-white/5 p-3.5 rounded-lg flex flex-col justify-between">
                    <div>
                      <h5 className="text-slate-500 font-bold uppercase tracking-widest font-mono mb-1 text-[9px]">Diagnostics & Controls</h5>
                      <p className="text-slate-400 leading-relaxed text-[11px]">
                        If this live feed buffers or hangs, try selecting an alternative feed source from the player control bar or tap retry.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Player Placeholder */
            <div className="aspect-video bg-[#16181D]/40 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center p-6">
              <Tv className="w-12 h-12 text-slate-700 mb-4 animate-pulse" />
              <h3 className="text-white font-bold text-lg mb-1 uppercase tracking-tight">No Active Feed</h3>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">Select a live sports channel from the guide to start streaming instantly.</p>
            </div>
          )}

          {/* RECENT STREAMS ROW */}
          {recentChannels.length > 0 && (
            <div className="bg-[#16181D]/30 border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3 font-mono">
                <History className="w-3.5 h-3.5 text-blue-500" />
                RECENTLY PLAYED SPORTS FEEDS
              </h3>
              <div className="flex flex-wrap gap-2">
                {recentChannels.map(chan => (
                  <button
                    id={`btn-recent-channel-${chan.id}`}
                    key={chan.id}
                    onClick={() => selectChannel(chan)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 border transition cursor-pointer uppercase text-[11px] ${
                      activeChannel?.id === chan.id
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400 font-bold"
                        : "bg-black/40 border-white/5 text-slate-400 hover:bg-[#16181D] hover:text-white"
                    }`}
                  >
                    {chan.logo ? (
                      <img src={chan.logo} alt="" className="w-3.5 h-3.5 object-contain rounded-sm" onError={(e)=>(e.currentTarget.style.display='none')} />
                    ) : (
                      <Tv className="w-3.5 h-3.5 text-blue-500/60" />
                    )}
                    <span>{chan.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TROUBLESHOOTING GUIDE & FAQ */}
          <div className="bg-[#16181D]/30 border border-white/5 rounded-xl p-6 text-xs text-slate-400 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-blue-500" />
              Tuning Guide & Troubleshooting
            </h3>
            <ul className="space-y-3 list-disc list-inside">
              <li>
                <strong className="text-slate-200 uppercase tracking-wide text-[11px]">Picture-in-Picture Support:</strong> Click the <Tv className="w-3.5 h-3.5 inline mx-0.5 text-blue-400" /> screen icon in the player controls. This detaches the stream so you can browse other apps or multitask.
              </li>
              <li>
                <strong className="text-slate-200 uppercase tracking-wide text-[11px]">Alternate Feeds:</strong> Some sports channels feature multiple active live streams. Toggle "Feed 1/2" in the player controls if the current feed drops out.
              </li>
              <li>
                <strong className="text-slate-200 uppercase tracking-wide text-[11px]">Loading Times:</strong> IPTV streams may take up to 3-5 seconds to cache and start playing depending on live stadium latency.
              </li>
              <li>
                <strong className="text-slate-200 uppercase tracking-wide text-[11px]">Geo-restrictions:</strong> Specific feeds are maintained by global contributors and may be temporarily geo-locked. Please select another country code or channel if connection fails.
              </li>
            </ul>
          </div>
        </section>

        {/* RIGHT COMPONENT: Channel Browsing, Search, Filters Sidebar (Width: 40%) */}
        <section className="w-full lg:w-[35%] flex flex-col gap-4">
          
          {/* SEARCH & FILTERS BOX */}
          <div className="bg-[#16181D] border border-white/5 rounded-xl p-4 flex flex-col gap-4">
            
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="input-channel-search"
                type="text"
                placeholder="Search channels, countries, languages..."
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full pl-10 pr-10 py-2.5 bg-black/40 border border-white/5 hover:border-white/10 focus:border-blue-500 rounded-lg text-xs placeholder-slate-500 text-white outline-none transition uppercase tracking-wide"
              />
              {filters.searchQuery && (
                <button
                  id="btn-clear-search"
                  onClick={() => setFilters(prev => ({ ...prev, searchQuery: "" }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Country Filters Horizontal Scroll */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                BROWSE REGION LEAGUES
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-thin">
                {POPULAR_COUNTRIES.map(c => (
                  <button
                    id={`btn-country-chip-${c.code}`}
                    key={c.code}
                    onClick={() => setFilters(prev => ({ ...prev, countryCode: c.code }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border cursor-pointer uppercase tracking-tight text-[11px] ${
                      filters.countryCode === c.code
                        ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-500/10"
                        : "bg-black/40 border-white/5 text-slate-300 hover:bg-[#1C2029]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Selector: Languages & Stars */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              
              {/* Language Selector */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="select-lang" className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  LANGUAGE FEED
                </label>
                <select
                  id="select-lang"
                  value={filters.language}
                  onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-black/40 border border-white/5 rounded-lg text-xs text-slate-300 outline-none hover:border-white/10 transition uppercase tracking-wide text-[11px]"
                >
                  <option value="ALL">All Languages</option>
                  {availableLanguages.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Starred Switch toggle */}
              <button
                id="btn-starred-filter-toggle"
                onClick={() => setFilters(prev => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 self-end cursor-pointer uppercase tracking-wider text-[10px] ${
                  filters.favoritesOnly
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "bg-[#0C0D12] border-white/5 text-slate-300 hover:bg-[#16181D]"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${filters.favoritesOnly ? "fill-current" : ""}`} />
                <span>Starred ({favorites.length})</span>
              </button>
            </div>
          </div>

          {/* CHANNEL LIST FEED */}
          <div className="flex-1 bg-[#0C0D12] border border-white/5 rounded-xl flex flex-col overflow-hidden min-h-[400px] lg:max-h-[700px]">
            
            {/* List Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-[#0F1117] flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                LIVE SPORTS FEEDS ({filteredChannels.length})
              </span>
              <span className="text-[9px] bg-black/60 border border-white/5 px-2 py-0.5 rounded text-slate-400 font-mono">
                TOTAL: {channels.length}
              </span>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {serverState.isLoading ? (
                /* Loading Skeleton */
                <div className="space-y-3 py-4">
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className="bg-[#16181D]/40 border border-white/5 rounded-lg p-4 animate-pulse flex items-center gap-4">
                      <div className="w-12 h-12 bg-black rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-black/40 rounded w-2/3" />
                        <div className="h-3 bg-black/40 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-[10px] text-slate-500 font-mono tracking-widest uppercase animate-pulse">TUNING BROADCAST FEED DIRECTORY...</p>
                </div>
              ) : filteredChannels.length > 0 ? (
                /* Channel Cards list */
                filteredChannels.map(channel => (
                  <ChannelCard
                     key={channel.id}
                     channel={channel}
                     isActive={activeChannel?.id === channel.id}
                     isFavorite={favorites.includes(channel.id)}
                     onSelect={() => selectChannel(channel)}
                     onToggleFavorite={() => toggleFavorite(channel.id)}
                  />
                ))
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl bg-black/10 min-h-[250px]">
                  <Compass className="w-9 h-9 text-slate-600 mb-3" />
                  <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">No Sports Feeds Found</h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
                    Try clearing your search query or selecting a different country chip.
                  </p>
                  <button
                    id="btn-reset-filters"
                    onClick={() => setFilters({
                      searchQuery: "",
                      countryCode: "ALL",
                      language: "ALL",
                      sortBy: "name",
                      favoritesOnly: false
                    })}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest text-white transition cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER BAR */}
      <footer id="app-footer" className="mt-auto border-t border-white/5 bg-[#0C0D12] py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a 
              href="https://github.com/iptv-org/api" 
              target="_blank" 
              rel="noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 font-bold"
            >
              iptv-org API
            </a>
          </div>
          <div>
            <span>Picture-in-Picture Multitasking Active</span>
          </div>
          <div>
            <span>Copyright Mohit Kumar (Monk Creations)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
