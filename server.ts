import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Fallback high-quality sports channels if external API fetching is slow or fails
const FALLBACK_CHANNELS = [
  {
    id: "RedBullTV.at",
    name: "Red Bull TV",
    logo: "https://i.imgur.com/uRovb1P.png",
    country: { code: "AT", name: "Austria" },
    languages: ["English"],
    website: "https://www.redbull.com",
    streams: [
      {
        url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-YSTN-CH01-RED/master.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "CBSNewsSports.us",
    name: "CBS Sports HQ",
    logo: "https://i.imgur.com/Y36ZzGf.png",
    country: { code: "US", name: "United States" },
    languages: ["English"],
    website: "https://www.cbssports.com",
    streams: [
      {
        url: "https://cbssports-cbssports-1-us.samsung.wurl.com/manifest/playlist.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "FuboSportsNetwork.us",
    name: "Fubo Sports Network",
    logo: "https://i.imgur.com/Q7bBqis.png",
    country: { code: "US", name: "United States" },
    languages: ["English"],
    website: "https://fubotv-fubo-sports-network-1-us.lg.amagi.tv",
    streams: [
      {
        url: "https://fubotv-fubo-sports-network-1-us.lg.amagi.tv/playlist.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "MotorsportTV.us",
    name: "Motorsport.tv",
    logo: "https://i.imgur.com/3VlW2w9.png",
    country: { code: "US", name: "United States" },
    languages: ["English"],
    website: "https://motorsport.tv",
    streams: [
      {
        url: "https://motorsport-motorsporttv-1-us.lg.amagi.tv/playlist.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "ACMilanTV.it",
    name: "AC Milan TV",
    logo: "https://i.imgur.com/vHqYlV9.png",
    country: { code: "IT", name: "Italy" },
    languages: ["Italian", "English"],
    website: "https://www.acmilan.com",
    streams: [
      {
        url: "https://milan-acmilan-1-us.lg.amagi.tv/playlist.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "WorldPokerTour.us",
    name: "World Poker Tour",
    logo: "https://i.imgur.com/v2U5X9A.png",
    country: { code: "US", name: "United States" },
    languages: ["English"],
    website: "https://worldpokertour.com",
    streams: [
      {
        url: "https://wurl-worldpokertour-1-us.samsung.wurl.com/manifest/playlist.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "FTFSports.us",
    name: "FTF Sports (For the Fans)",
    logo: "https://i.imgur.com/2YyT9wZ.png",
    country: { code: "US", name: "United States" },
    languages: ["English"],
    website: "https://ftfnext.com",
    streams: [
      {
        url: "https://ftf-ftfnews-1-us.lg.amagi.tv/playlist.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "RealMadridTV.es",
    name: "Real Madrid TV",
    logo: "https://i.imgur.com/PZ2Z3V5.png",
    country: { code: "ES", name: "Spain" },
    languages: ["Spanish"],
    website: "https://www.realmadrid.com/en/real-madrid-tv",
    streams: [
      {
        url: "https://realmadrid-realmadridtvspain-1-us.samsung.wurl.com/manifest/playlist.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "Sports18-1-HD.in",
    name: "Sports18 1 HD",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Sports18_Logo.svg",
    country: { code: "IN", name: "India" },
    languages: ["English", "Hindi"],
    website: "https://www.sports18.com",
    streams: [
      {
        url: "https://edge-sports18-delhi.tataplay.com/hls/sports18/master.m3u8",
        status: "online"
      },
      {
        url: "https://sports18-jiocinema.akamaized.net/hls/live/sports18_hd/index.m3u8",
        status: "online"
      },
      {
        url: "http://rmtv.live/sports18.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "Sports18-Khel.in",
    name: "Sports18 Khel",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Sports18_Logo.svg",
    country: { code: "IN", name: "India" },
    languages: ["Hindi"],
    website: "https://www.sports18.com",
    streams: [
      {
        url: "https://edge-sports18khel.tataplay.com/hls/sports18khel/master.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "DDSports.in",
    name: "DD Sports",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/cb/DD_Sports_logo.png",
    country: { code: "IN", name: "India" },
    languages: ["Hindi", "English"],
    website: "https://prasarbharati.gov.in/dd-sports",
    streams: [
      {
        url: "https://linear-pb.simplestream.com/ddsports/index.m3u8",
        status: "online"
      },
      {
        url: "https://linear-pb.live.simplestream.com/ddsports/index.m3u8",
        status: "online"
      },
      {
        url: "https://prasarbharati.gov.in/hls/ddsports/index.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "DDNational.in",
    name: "DD National",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Doordarshan_Logo.svg",
    country: { code: "IN", name: "India" },
    languages: ["Hindi", "English"],
    website: "https://prasarbharati.gov.in/dd-national",
    streams: [
      {
        url: "https://linear-pb.simplestream.com/ddnational/index.m3u8",
        status: "online"
      },
      {
        url: "https://linear-pb.live.simplestream.com/ddnational/index.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "SonySportsTen1.in",
    name: "Sony Sports Ten 1 HD",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/Sony_Sports_Network_logo.svg",
    country: { code: "IN", name: "India" },
    languages: ["English"],
    website: "https://www.sonyliv.com",
    streams: [
      {
        url: "https://edge-sonysportsten1.tataplay.com/hls/ten1/master.m3u8",
        status: "online"
      },
      {
        url: "http://rmtv.live/sony_ten_1.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "SonySportsTen2.in",
    name: "Sony Sports Ten 2 HD",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/Sony_Sports_Network_logo.svg",
    country: { code: "IN", name: "India" },
    languages: ["English", "Hindi"],
    website: "https://www.sonyliv.com",
    streams: [
      {
        url: "https://edge-sonysportsten2.tataplay.com/hls/ten2/master.m3u8",
        status: "online"
      },
      {
        url: "http://rmtv.live/sony_ten_2.m3u8",
        status: "online"
      }
    ]
  },
  {
    id: "SonySportsTen5.in",
    name: "Sony Sports Ten 5 HD",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/Sony_Sports_Network_logo.svg",
    country: { code: "IN", name: "India" },
    languages: ["English"],
    website: "https://www.sonyliv.com",
    streams: [
      {
        url: "https://edge-sonysportsten5.tataplay.com/hls/ten5/master.m3u8",
        status: "online"
      },
      {
        url: "http://rmtv.live/sony_ten_5.m3u8",
        status: "online"
      }
    ]
  }
];

let cachedChannels: any[] = FALLBACK_CHANNELS;
let isLoaded = false;
let isLoading = false;
let loadError: string | null = null;
let lastFetched: Date | null = null;

async function fetchIPTVData() {
  if (isLoading) return;
  isLoading = true;
  loadError = null;
  console.log("Starting IPTV-org data fetching...");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const fetchJson = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    };

    console.log("Fetching channels, streams, countries, and languages from iptv-org API...");
    const [channelsRes, streamsRes, countriesRes, languagesRes] = await Promise.all([
      fetchJson("https://iptv-org.github.io/api/channels.json"),
      fetchJson("https://iptv-org.github.io/api/streams.json"),
      fetchJson("https://iptv-org.github.io/api/countries.json"),
      fetchJson("https://iptv-org.github.io/api/languages.json")
    ]);

    clearTimeout(timeoutId);
    console.log(`Received raw data: ${channelsRes.length} channels, ${streamsRes.length} streams.`);

    // Index maps for instant lookups
    const countryMap = new Map<string, string>();
    countriesRes.forEach((c: any) => {
      if (c.code && c.name) countryMap.set(c.code.toUpperCase(), c.name);
    });

    const languageMap = new Map<string, string>();
    languagesRes.forEach((l: any) => {
      if (l.code && l.name) languageMap.set(l.code.toLowerCase(), l.name);
    });

    // Group streams by channel ID (online only)
    const streamsMap = new Map<string, any[]>();
    streamsRes.forEach((s: any) => {
      if (s.channel && (s.status === "online" || !s.status)) {
        const existing = streamsMap.get(s.channel) || [];
        existing.push({
          url: s.url,
          http_referrer: s.http_referrer || null,
          user_agent: s.user_agent || null,
          status: s.status || "online"
        });
        streamsMap.set(s.channel, existing);
      }
    });

    // Filter channels to only those categorized as 'sports' and having valid active streams
    const sportsChannels = channelsRes
      .filter((c: any) => {
        const isSports = c.categories && c.categories.includes("sports");
        const hasStreams = streamsMap.has(c.id);
        const isClosed = !!c.closed;
        return isSports && hasStreams && !isClosed;
      })
      .map((c: any) => {
        const streamList = streamsMap.get(c.id) || [];
        const countryCode = c.country ? c.country.toUpperCase() : null;
        const countryName = countryCode ? countryMap.get(countryCode) || countryCode : null;
        const languagesList = c.languages
          ? c.languages.map((lang: string) => languageMap.get(lang.toLowerCase()) || lang)
          : [];

        return {
          id: c.id,
          name: c.name,
          logo: c.logo || null,
          country: countryCode ? { code: countryCode, name: countryName } : null,
          languages: languagesList,
          streams: streamList,
          website: c.website || null
        };
      });

    // Include fallbacks first if they are not already present to guarantee their visibility
    const sportsMap = new Map<string, any>();
    sportsChannels.forEach((sc: any) => sportsMap.set(sc.id, sc));
    
    // Add fallback channels back if they aren't fetched (often fallbacks are more stable)
    FALLBACK_CHANNELS.forEach((fb) => {
      if (!sportsMap.has(fb.id)) {
        sportsMap.set(fb.id, fb);
      }
    });

    cachedChannels = Array.from(sportsMap.values());
    isLoaded = true;
    lastFetched = new Date();
    console.log(`Success! Indexed ${cachedChannels.length} sports channels.`);
  } catch (error: any) {
    console.error("Failed to load IPTV data. Keeping fallback channels.", error);
    loadError = error.message || "Failed to load data from server";
    // Keep fallback list as cached channels so app still works
    if (cachedChannels.length === 0) {
      cachedChannels = FALLBACK_CHANNELS;
    }
  } finally {
    isLoading = false;
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initial trigger of data fetching in background
  fetchIPTVData();

  // API endpoints
  app.get("/api/channels", (req, res) => {
    res.json({
      success: true,
      count: cachedChannels.length,
      isLoaded,
      isLoading,
      lastFetched,
      error: loadError,
      channels: cachedChannels
    });
  });

  app.post("/api/refresh", async (req, res) => {
    if (isLoading) {
      return res.status(409).json({ success: false, message: "Refresh already in progress" });
    }
    fetchIPTVData();
    res.json({ success: true, message: "IPTV refresh started in background" });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", channelsCount: cachedChannels.length });
  });

  // Vite dev server integration or static file server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
