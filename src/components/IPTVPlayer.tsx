import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Tv, 
  RefreshCw, 
  Activity, 
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Laptop
} from "lucide-react";
import { Channel, Stream } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface IPTVPlayerProps {
  channel: Channel;
  selectedStreamIndex: number;
  onStreamIndexChange: (index: number) => void;
  onClose?: () => void;
}

export default function IPTVPlayer({ 
  channel, 
  selectedStreamIndex, 
  onStreamIndexChange,
  onClose 
}: IPTVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("iptv_volume");
    return saved ? parseFloat(saved) : 1.0;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPAvailable, setIsPiPAvailable] = useState(false);
  const [isInPiP, setIsInPiP] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showStreamDropdown, setShowStreamDropdown] = useState(false);
  
  // Stats
  const [streamStats, setStreamStats] = useState({
    resolution: "Loading...",
    latency: "Calculating...",
    type: "HLS (m3u8)",
    fps: 0
  });

  const activeStream = channel.streams[selectedStreamIndex] || channel.streams[0];

  // Monitor Picture-in-Picture availability
  useEffect(() => {
    setIsPiPAvailable(
      document.pictureInPictureEnabled && 
      !!videoRef.current && 
      typeof videoRef.current.requestPictureInPicture === "function"
    );
  }, [videoRef.current]);

  // Handle stream initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeStream) return;

    setStreamError(null);
    setIsBuffering(true);
    setIsInPiP(false);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = activeStream.url;

    // Check if browser has native HLS support (Safari)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      
      const onPlay = () => {
        setIsPlaying(true);
        setIsBuffering(false);
      };
      const onWaiting = () => setIsBuffering(true);
      const onPlaying = () => setIsBuffering(false);
      const onError = (e: any) => {
        console.error("Native HLS video element error:", e);
        setStreamError("This stream failed to load. Please try another link or refresh.");
        setIsBuffering(false);
      };

      video.addEventListener("play", onPlay);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("error", onError);

      // Attempt autoplay
      video.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.log("Autoplay blocked. User gesture needed:", err);
          setIsPlaying(false);
          setIsBuffering(false);
        });

      // Update resolution from video metadata when available
      const onLoadedMetadata = () => {
        setStreamStats(prev => ({
          ...prev,
          resolution: `${video.videoWidth}x${video.videoHeight}`,
          type: "Native HLS"
        }));
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);

      return () => {
        video.removeEventListener("play", onPlay);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("error", onError);
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
      };
    } 
    // Otherwise use hls.js
    else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferSize: 30 * 1024 * 1024, // 30MB
        maxBufferLength: 20, // 20 seconds
        lowLatencyMode: true,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
        setIsBuffering(false);
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        const level = hls.levels[data.level];
        if (level) {
          setStreamStats(prev => ({
            ...prev,
            resolution: level.width && level.height ? `${level.width}x${level.height}` : "HD (HLS)",
            latency: data.details.live ? "Live Stream" : "VOD Buffer"
          }));
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn("HLS.js error event:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Fatal network error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Fatal media error, attempting recovery...");
              hls.recoverMediaError();
              break;
            default:
              setStreamError("Unable to connect to the stream. Click retry or choose a different source.");
              hls.destroy();
              hlsRef.current = null;
              setIsBuffering(false);
              break;
          }
        }
      });

      // Handle buffering states in HLS
      const onWaiting = () => setIsBuffering(true);
      const onPlaying = () => setIsBuffering(false);
      
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);

      return () => {
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else {
      setStreamError("Your browser does not support HLS stream playback.");
      setIsBuffering(false);
    }
  }, [activeStream]);

  // Handle PiP event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsInPiP(true);
    const handleLeavePiP = () => setIsInPiP(false);

    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, [videoRef.current]);

  // Sync volume state with HTML5 video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Controls Visibility Timer
  useEffect(() => {
    if (!isPlaying || !showControls) return;

    const handle = setTimeout(() => {
      setShowControls(false);
      setShowStreamDropdown(false);
    }, 4000);

    return () => clearTimeout(handle);
  }, [showControls, isPlaying]);

  // Volume slider helper
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    localStorage.setItem("iptv_volume", val.toString());
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Error enabling fullscreen:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  // Sync fullscreen state when changes are triggered by ESC key
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const togglePiP = async () => {
    if (!videoRef.current || !isPiPAvailable) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsInPiP(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsInPiP(true);
      }
    } catch (err) {
      console.error("Picture-in-Picture error:", err);
    }
  };

  const triggerReload = () => {
    setStreamError(null);
    setIsBuffering(true);
    if (hlsRef.current && activeStream) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    // Simple state toggle to re-trigger useEffect stream load
    onStreamIndexChange(selectedStreamIndex);
  };

  return (
    <div 
      id="iptv-player-container"
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/5 shadow-2xl group focus:outline-none"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
    >
      {/* Video Stream Element */}
      <video
        id="iptv-html5-video"
        ref={videoRef}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Buffering Loading Overlay */}
      <AnimatePresence>
        {isBuffering && !streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none">
            <div className="relative w-16 h-16">
              {/* Outer glowing pulsing ring */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 animate-ping" />
              {/* Spinning active ring */}
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            <p className="mt-4 text-blue-400 font-medium tracking-widest text-xs animate-pulse flex items-center gap-1.5 font-mono uppercase">
              <Activity className="w-3.5 h-3.5 animate-spin" /> Tuning live feed...
            </p>
          </div>
        )}
      </AnimatePresence>

      {/* Stream Error Overlay */}
      <AnimatePresence>
        {streamError && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#0C0D12]/95 text-center p-6"
            onClick={(e) => e.stopPropagation()} // stop event bubbling so it doesn't try to play
          >
            <div className="p-3 bg-red-500/10 rounded-full text-red-500 mb-4 animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h4 className="text-white font-bold text-lg mb-2 uppercase tracking-tight">Live Stream Connection Failed</h4>
            <p className="text-slate-400 text-xs max-w-md mb-6 leading-relaxed">
              {streamError}
              <br />
              <span className="text-[11px] text-slate-500 mt-2 block italic uppercase tracking-wider font-mono">
                Note: Live streams can sometimes be geo-restricted or temporarily offline.
              </span>
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                id="btn-retry-stream"
                onClick={triggerReload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try Reconnecting
              </button>
              
              {channel.website && (
                <a
                  id="link-channel-web"
                  href={channel.website}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs uppercase tracking-widest rounded-lg transition duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Website
                </a>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Control Overlay Bar & Info */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/80 p-4 select-none pointer-events-auto"
            onClick={(e) => {
              // Clicking the control container background shouldn't pause the video
              if (e.target === e.currentTarget) togglePlay();
            }}
          >
            {/* Top Bar: Channel Details */}
            <div 
              className="flex items-center justify-between pointer-events-auto w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                {channel.logo ? (
                  <img 
                    src={channel.logo} 
                    alt={channel.name}
                    className="w-10 h-10 object-contain rounded bg-black border border-white/10 p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=80`;
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20">
                    {channel.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2 leading-none uppercase tracking-tight">
                    {channel.name}
                    <span className="inline-flex items-center gap-1 text-[9px] bg-red-600 text-white font-black tracking-widest px-1.5 py-0.5 rounded uppercase font-mono animate-pulse">
                      ● LIVE
                    </span>
                  </h3>
                  <div className="flex gap-2 items-center text-[10px] text-slate-300 mt-1 font-mono uppercase tracking-wider">
                    {channel.country && (
                      <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-slate-300">
                        {channel.country.name}
                      </span>
                    )}
                    {channel.languages.length > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-slate-400">
                        {channel.languages[0]}
                      </span>
                    )}
                    <span className="text-blue-400 text-[9px] bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold">
                      {streamStats.resolution}
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Button or Stats indicator */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded border border-white/5 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  <span>Stats: {streamStats.resolution} | Live</span>
                </div>
                {onClose && (
                  <button
                    id="btn-player-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onClose) onClose();
                    }}
                    className="p-2 bg-black/60 hover:bg-[#1C2029] rounded text-slate-400 hover:text-white border border-white/5 cursor-pointer"
                    title="Close player"
                  >
                    <Minimize className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Middle Play Button HUD (Optional, visible on hover when paused) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isPlaying && !isBuffering && (
                <div className="p-5 rounded-full bg-blue-600 text-white animate-pulse scale-110 shadow-lg shadow-blue-500/40">
                  <Play className="w-8 h-8 fill-current ml-0.5" />
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div 
              className="flex items-center justify-between gap-4 pointer-events-auto w-full pt-2 bg-gradient-to-t from-black/60 to-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Play/Pause Button */}
                <button
                  id="btn-play-toggle"
                  onClick={togglePlay}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer border border-white/10"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                {/* Reload Stream */}
                <button
                  id="btn-stream-reload"
                  onClick={triggerReload}
                  className="p-2 bg-black/60 hover:bg-[#1C2029] text-slate-300 hover:text-blue-400 rounded-lg transition border border-white/5 cursor-pointer"
                  title="Reconnect Live Stream"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Volume Section */}
                <div className="flex items-center gap-2">
                  <button
                    id="btn-volume-toggle"
                    onClick={toggleMute}
                    className="p-2 bg-black/60 hover:bg-[#1C2029] text-slate-300 hover:text-white rounded-lg border border-white/5 cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    id="slider-volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-14 sm:w-20 accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>

              {/* Right side: Stream selector, PiP, Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Multi-Stream Quality/Source dropdown */}
                {channel.streams.length > 1 && (
                  <div className="relative">
                    <button
                      id="btn-stream-selector"
                      onClick={() => setShowStreamDropdown(!showStreamDropdown)}
                      className="px-2.5 py-1.5 bg-black/60 text-[10px] font-bold text-blue-400 hover:text-white border border-white/5 hover:border-white/10 rounded-lg flex items-center gap-1.5 transition cursor-pointer font-mono uppercase tracking-wider"
                    >
                      <span>Feed {selectedStreamIndex + 1}/{channel.streams.length}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showStreamDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showStreamDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 w-44 bg-[#0F1117] border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50 p-1 flex flex-col gap-0.5"
                        >
                          <div className="px-2.5 py-1.5 border-b border-white/5 text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">
                            Alternative Feeds
                          </div>
                          {channel.streams.map((stream, idx) => (
                            <button
                              id={`btn-select-feed-${idx}`}
                              key={idx}
                              onClick={() => {
                                onStreamIndexChange(idx);
                                setShowStreamDropdown(false);
                              }}
                              className={`w-full px-2.5 py-1.5 text-left text-xs rounded transition-colors flex items-center justify-between cursor-pointer font-mono ${
                                idx === selectedStreamIndex
                                  ? "bg-blue-500/10 text-blue-400 font-bold"
                                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                              }`}
                            >
                              <span>Feed #{idx + 1}</span>
                              <span className="text-[10px] opacity-60">Live</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Picture in Picture Button */}
                {isPiPAvailable && (
                  <button
                    id="btn-pip-toggle"
                    onClick={togglePiP}
                    className={`p-2 rounded-lg border transition cursor-pointer ${
                      isInPiP 
                        ? "bg-blue-600 border-blue-600 text-white font-bold" 
                        : "bg-black/60 border-white/10 text-slate-300 hover:text-white"
                    }`}
                    title="Toggle Picture-in-Picture"
                  >
                    <Tv className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen Button */}
                <button
                  id="btn-fullscreen-toggle"
                  onClick={toggleFullscreen}
                  className="p-2 bg-black/60 hover:bg-[#1C2029] text-slate-300 hover:text-white rounded-lg border border-white/5 cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
