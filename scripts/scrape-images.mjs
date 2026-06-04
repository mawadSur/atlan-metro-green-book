#!/usr/bin/env node
/**
 * Atlan Metro Green Book — Location Image Scraper
 *
 * LEGAL WARNING: This script attempts to scrape Google Maps images without an API key,
 * which violates Google's Terms of Service. Photos obtained may be copyrighted.
 * The script falls back to license-clean sources (Wikimedia Commons, stock images).
 * Use at your own risk, with --limit set to a small number. By running this script
 * you accept full responsibility for compliance with applicable laws and ToS.
 *
 * Default behavior: processes only 5 locations with missing images as a safe test.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration & Constants
// ============================================================================

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Stock fallback images (Wikimedia Commons / Unsplash, CC0/Public Domain)
const STOCK_IMAGES = {
  mosque: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Dome_of_the_Rock_at_sunset.jpg/800px-Dome_of_the_Rock_at_sunset.jpg',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
  park: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Central_Park_New_York_City.jpg/800px-Central_Park_New_York_City.jpg',
  market: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Spice_Bazaar_Istanbul.jpg/800px-Spice_Bazaar_Istanbul.jpg',
  museum: 'https://images.unsplash.com/photo-1566127444979-b3d2b89c6112?w=800',
  mall: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800',
  attraction: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800',
  garments: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
  coffee: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800',
  stadium: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
  default: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800'
};

// ============================================================================
// Supabase Client
// ============================================================================

function loadSupabaseConfig() {
  const envPath = join(__dirname, '..', '.secrets', 'supabase.env');
  const content = readFileSync(envPath, 'utf-8');
  const config = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      config[key.trim()] = valueParts.join('=').trim();
    }
  }

  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in .secrets/supabase.env');
  }

  return {
    url: config.SUPABASE_URL,
    serviceRole: config.SUPABASE_SERVICE_ROLE
  };
}

class SupabaseClient {
  constructor(url, serviceRole) {
    this.url = url;
    this.serviceRole = serviceRole;
    this.headers = {
      'apikey': serviceRole,
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'application/json'
    };
  }

  async getLocations(filters = {}) {
    let query = `${this.url}/rest/v1/locations?select=id,name_en,type,address,lat,lng,image_url&order=name_en`;

    const response = await fetch(query, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Supabase locations query failed: ${response.status} ${response.statusText}`);
    }

    let locations = await response.json();

    // Apply filters
    if (filters.onlyMissing) {
      locations = locations.filter(loc => !loc.image_url || loc.image_url.trim() === '');
    }

    if (filters.type) {
      locations = locations.filter(loc => loc.type === filters.type);
    }

    if (filters.limit) {
      locations = locations.slice(0, filters.limit);
    }

    return locations;
  }

  async uploadImage(locationId, imageBytes) {
    const fileName = `${locationId}.jpg`;
    const uploadUrl = `${this.url}/storage/v1/object/location-photos/${fileName}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': this.serviceRole,
        'Authorization': `Bearer ${this.serviceRole}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      },
      body: imageBytes
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload failed: ${response.status} ${text}`);
    }

    return `${this.url}/storage/v1/object/public/location-photos/${fileName}`;
  }

  async updateLocationImage(locationId, imageUrl) {
    const updateUrl = `${this.url}/rest/v1/locations?id=eq.${locationId}`;

    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        ...this.headers,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ image_url: imageUrl })
    });

    if (!response.ok) {
      throw new Error(`Update failed: ${response.status} ${response.statusText}`);
    }
  }
}

// ============================================================================
// Image Sourcing
// ============================================================================

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryGoogleMapsImage(location) {
  try {
    const query = encodeURIComponent(`${location.name_en} ${location.address || ''}`);
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${query}&hl=en`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Check for consent page
    if (html.includes('consent.google.com') || html.includes('Before you continue')) {
      return null;
    }

    // Google Maps embeds URLs in various formats. Try multiple extraction patterns:

    // Pattern 1: Direct URLs in JSON (most common)
    // Look for: "https://lh3.googleusercontent.com/..." or "https://lh5.googleusercontent.com/..."
    const directPattern = /https:\/\/(lh[35])\.googleusercontent\.com\/[a-zA-Z0-9_-]{20,}(?:=w\d+-h\d+-[a-z-]+)?/g;
    const directMatches = html.match(directPattern);

    if (directMatches && directMatches.length > 0) {
      let photoUrl = directMatches[0];

      // Upgrade or add size params
      if (photoUrl.includes('=w')) {
        photoUrl = photoUrl.replace(/=w\d+-h\d+-[a-z-]+/g, '=w800-h600-k-no');
      } else {
        photoUrl += '=w800-h600-k-no';
      }

      return photoUrl;
    }

    // Pattern 2: Escaped URLs in JavaScript
    const escapedPattern = /https:\\\/\\\/(lh[35])\.googleusercontent\.com\\\/[a-zA-Z0-9_-]{20,}(?:=w\d+-h\d+-[a-z-]+)?/g;
    const escapedMatches = html.match(escapedPattern);

    if (escapedMatches && escapedMatches.length > 0) {
      let photoUrl = escapedMatches[0].replace(/\\\//g, '/');

      if (photoUrl.includes('=w')) {
        photoUrl = photoUrl.replace(/=w\d+-h\d+-[a-z-]+/g, '=w800-h600-k-no');
      } else {
        photoUrl += '=w800-h600-k-no';
      }

      return photoUrl;
    }

    // Pattern 3: Look for data URLs in script tags
    const scriptPattern = /"(https:\/\/lh[35]\.googleusercontent\.com\/[^"]+)"/g;
    let match;
    while ((match = scriptPattern.exec(html)) !== null) {
      let photoUrl = match[1];

      // Clean up any escape sequences
      photoUrl = photoUrl.replace(/\\u003d/g, '=').replace(/\\/g, '');

      // Upgrade size
      if (photoUrl.includes('=w')) {
        photoUrl = photoUrl.replace(/=w\d+-h\d+-[a-z-]+/g, '=w800-h600-k-no');
      } else if (!photoUrl.includes('=s')) { // Don't add if it has =s (square crop)
        photoUrl += '=w800-h600-k-no';
      }

      return photoUrl;
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function tryWikimediaImage(location) {
  try {
    // Try geosearch first
    if (location.lat && location.lng) {
      const geoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=geosearch&ggsradius=500&ggscoord=${location.lat}|${location.lng}&ggslimit=5&prop=imageinfo&iiprop=url&iiurlwidth=800`;

      const geoResponse = await fetch(geoUrl, {
        headers: { 'User-Agent': USER_AGENT }
      });

      if (geoResponse.ok) {
        const data = await geoResponse.json();
        if (data.query && data.query.pages) {
          const pages = Object.values(data.query.pages);
          for (const page of pages) {
            if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].thumburl) {
              return page.imageinfo[0].thumburl;
            }
          }
        }
      }
    }

    // Try name search
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(location.name_en)}&srnamespace=6&srlimit=3`;

    const searchResponse = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data.query && data.query.search && data.query.search.length > 0) {
        const title = data.query.search[0].title;

        const imageUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&iiurlwidth=800`;

        const imageResponse = await fetch(imageUrl, {
          headers: { 'User-Agent': USER_AGENT }
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.query && imageData.query.pages) {
            const pages = Object.values(imageData.query.pages);
            if (pages[0] && pages[0].imageinfo && pages[0].imageinfo[0]) {
              return pages[0].imageinfo[0].thumburl || pages[0].imageinfo[0].url;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

function getStockImage(type) {
  const typeLower = (type || '').toLowerCase();
  return STOCK_IMAGES[typeLower] || STOCK_IMAGES.default;
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Not an image: ${contentType}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength < 2048) {
    throw new Error('Image too small (< 2KB)');
  }

  return arrayBuffer;
}

async function resolveImageForLocation(location, sourceOrder) {
  for (const source of sourceOrder) {
    let imageUrl = null;

    try {
      switch (source) {
        case 'google':
          imageUrl = await tryGoogleMapsImage(location);
          break;
        case 'wikimedia':
          imageUrl = await tryWikimediaImage(location);
          break;
        case 'stock':
          imageUrl = getStockImage(location.type);
          break;
      }

      if (imageUrl) {
        return { url: imageUrl, source };
      }
    } catch (error) {
      // Continue to next source
    }
  }

  // Ultimate fallback
  return { url: STOCK_IMAGES.default, source: 'stock' };
}

async function resolveAndDownloadImage(location, sourceOrder) {
  for (const source of sourceOrder) {
    let imageUrl = null;

    try {
      switch (source) {
        case 'google':
          imageUrl = await tryGoogleMapsImage(location);
          break;
        case 'wikimedia':
          imageUrl = await tryWikimediaImage(location);
          break;
        case 'stock':
          imageUrl = getStockImage(location.type);
          break;
      }

      if (imageUrl) {
        // Try to download it
        try {
          const imageBytes = await downloadImage(imageUrl);
          return { url: imageUrl, source, bytes: imageBytes };
        } catch (downloadError) {
          // URL found but not downloadable, try next source
          continue;
        }
      }
    } catch (error) {
      // Continue to next source
    }
  }

  // Ultimate fallback - try stock image
  const stockUrl = STOCK_IMAGES.default;
  const imageBytes = await downloadImage(stockUrl);
  return { url: stockUrl, source: 'stock', bytes: imageBytes };
}

// ============================================================================
// Main Processing
// ============================================================================

async function processLocation(client, location, options) {
  const { sourceOrder, dryRun } = options;

  console.log(`\n[${location.id}] ${location.name_en} (${location.type || 'unknown'})`);

  if (dryRun) {
    // Dry run - just resolve, don't download
    const resolution = await resolveImageForLocation(location, sourceOrder);
    console.log(`  → Source: ${resolution.source}`);
    console.log(`  → URL: ${resolution.url.substring(0, 80)}...`);
    console.log('  → [DRY RUN] Skipping upload');
    return { success: true, source: resolution.source, dryRun: true };
  }

  try {
    // Resolve and download image (with automatic fallback)
    console.log('  → Resolving image source...');
    const resolution = await resolveAndDownloadImage(location, sourceOrder);

    console.log(`  → Source: ${resolution.source}`);
    console.log(`  → Downloaded ${(resolution.bytes.byteLength / 1024).toFixed(1)} KB`);

    // Upload to Supabase
    console.log('  → Uploading to Supabase...');
    const publicUrl = await client.uploadImage(location.id, resolution.bytes);

    // Update location record
    console.log('  → Updating location record...');
    await client.updateLocationImage(location.id, publicUrl);

    console.log(`  ✓ Success: ${publicUrl}`);
    return { success: true, source: resolution.source, url: publicUrl };

  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    return { success: false, source: 'none', error: error.message };
  }
}

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const options = {
    limit: 5,
    onlyMissing: true,
    type: null,
    sourceOrder: ['google', 'wikimedia', 'stock'],
    dryRun: false,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--only-missing') {
      options.onlyMissing = args[i + 1] !== 'false';
      if (i + 1 < args.length && (args[i + 1] === 'true' || args[i + 1] === 'false')) {
        i++;
      }
    } else if (arg === '--type' && i + 1 < args.length) {
      options.type = args[++i];
    } else if (arg === '--source-order' && i + 1 < args.length) {
      options.sourceOrder = args[++i].split(',');
    } else if (arg === '--dry') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
      options.onlyMissing = false;
    }
  }

  console.log('='.repeat(80));
  console.log('Atlan Metro Green Book — Image Scraper');
  console.log('='.repeat(80));
  console.log('Configuration:');
  console.log(`  Limit: ${options.limit}`);
  console.log(`  Only Missing: ${options.onlyMissing}`);
  console.log(`  Type Filter: ${options.type || 'none'}`);
  console.log(`  Source Order: ${options.sourceOrder.join(' → ')}`);
  console.log(`  Dry Run: ${options.dryRun}`);
  console.log('');

  // Load Supabase config
  const config = loadSupabaseConfig();
  const client = new SupabaseClient(config.url, config.serviceRole);

  // Fetch locations
  console.log('Fetching locations...');
  const locations = await client.getLocations({
    onlyMissing: options.onlyMissing,
    type: options.type,
    limit: options.limit
  });

  console.log(`Found ${locations.length} location(s) to process\n`);

  if (locations.length === 0) {
    console.log('No locations to process. Exiting.');
    return;
  }

  // Process locations with politeness delay
  const results = {
    google: 0,
    wikimedia: 0,
    stock: 0,
    failed: 0,
    total: locations.length
  };

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];

    // Polite delay (1.5-3s) between locations, except first
    if (i > 0) {
      const delayMs = 1500 + Math.random() * 1500;
      await delay(delayMs);
    }

    const result = await processLocation(client, location, options);

    if (result.success) {
      results[result.source]++;
    } else {
      results.failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('Summary:');
  console.log(`  Total: ${results.total}`);
  console.log(`  Google: ${results.google}`);
  console.log(`  Wikimedia: ${results.wikimedia}`);
  console.log(`  Stock: ${results.stock}`);
  console.log(`  Failed: ${results.failed}`);
  console.log('='.repeat(80));

  if (options.dryRun) {
    console.log('\nDRY RUN completed. No images were uploaded.');
    console.log('Run without --dry to perform actual uploads.');
  }
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch(error => {
  console.error('\n✗ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
