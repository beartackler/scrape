const express = require('express');
const cors = require('cors');
const gplay = require('google-play-scraper');
const store = require('app-store-scraper');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'App Store Scraper API' });
});

// ==================== SEARCH ====================
app.post('/api/search', async (req, res) => {
  try {
    const { term, platform = 'ios', num = 10, country = 'us' } = req.body;
    if (!term) return res.status(400).json({ error: 'term is required' });

    let results;
    if (platform === 'android') {
      results = await gplay.search({ term, num: Math.min(num, 50), country });
      results = results.map(a => ({
        id: a.appId,
        title: a.title,
        developer: a.developer,
        score: a.score,
        ratings: a.ratings,
        price: a.price,
        free: a.free,
        icon: a.icon,
        url: a.url,
        description: a.summary || a.description?.slice(0, 200),
        genre: a.genre,
        platform: 'android'
      }));
    } else {
      results = await store.search({ term, num: Math.min(num, 50), country });
      results = results.map(a => ({
        id: a.appId || a.id,
        title: a.title,
        developer: a.developer,
        score: a.score,
        ratings: a.reviews,
        price: a.price,
        free: a.free,
        icon: a.icon,
        url: a.url,
        description: a.description?.slice(0, 200),
        genre: a.primaryGenre,
        platform: 'ios'
      }));
    }

    res.json({ query: term, platform, country, results });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== APP DETAILS ====================
app.post('/api/details', async (req, res) => {
  try {
    const { appId, platform = 'ios', country = 'us' } = req.body;
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    let result;
    if (platform === 'android') {
      result = await gplay.app({ appId, country });
      result = {
        id: result.appId,
        title: result.title,
        developer: result.developer,
        score: result.score,
        ratings: result.ratings,
        reviews: result.reviews,
        price: result.price,
        free: result.free,
        icon: result.icon,
        url: result.url,
        description: result.description,
        genre: result.genre,
        released: result.released,
        updated: result.updated,
        version: result.version,
        installs: result.installs,
        histogram: result.histogram,
        platform: 'android'
      };
    } else {
      result = await store.app({ appId, country, ratings: true });
      result = {
        id: result.appId || result.id,
        title: result.title,
        developer: result.developer,
        score: result.score,
        ratings: result.ratings,
        reviews: result.reviews,
        price: result.price,
        free: result.free,
        icon: result.icon,
        url: result.url,
        description: result.description,
        genre: result.primaryGenre,
        released: result.released,
        updated: result.updated,
        version: result.version,
        histogram: result.histogram,
        platform: 'ios'
      };
    }

    res.json({ result });
  } catch (err) {
    console.error('Details error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== REVIEWS ====================
app.post('/api/reviews', async (req, res) => {
  try {
    const { appId, platform = 'ios', country = 'us', num = 50, sort = 'recent' } = req.body;
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    let results;
    if (platform === 'android') {
      const sortMap = { recent: gplay.sort.NEWEST, helpful: gplay.sort.HELPFULNESS, rating: gplay.sort.RATING };
      results = await gplay.reviews({ appId, country, num: Math.min(num, 100), sort: sortMap[sort] || gplay.sort.NEWEST });
      results = results.data.map(r => ({
        id: r.id,
        text: r.text,
        score: r.score,
        author: r.userName,
        date: r.date,
        thumbsUp: r.thumbsUp
      }));
    } else {
      results = await store.reviews({ appId, country, sort: store.sort.RECENT, page: 1 });
      results = results.map(r => ({
        id: r.id,
        text: r.text,
        score: r.score,
        author: r.userName,
        date: r.date,
        title: r.title
      }));
    }

    res.json({ appId, platform, country, results });
  } catch (err) {
    console.error('Reviews error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== TOP APPS (LIST) ====================
app.post('/api/list', async (req, res) => {
  try {
    const { category, platform = 'ios', country = 'us', num = 20, collection = 'top_free' } = req.body;

    let results;
    if (platform === 'android') {
      const collMap = {
        top_free: gplay.collection.TOP_FREE,
        top_paid: gplay.collection.TOP_PAID,
        grossing: gplay.collection.GROSSING
      };
      const opts = {
        collection: collMap[collection] || gplay.collection.TOP_FREE,
        country,
        num: Math.min(num, 100)
      };
      if (category) opts.category = gplay.category[category] || category;
      results = await gplay.list(opts);
      results = results.map(a => ({
        id: a.appId,
        title: a.title,
        developer: a.developer,
        score: a.score,
        price: a.price,
        free: a.free,
        icon: a.icon,
        url: a.url,
        platform: 'android'
      }));
    } else {
      const collMap = {
        top_free: store.collection.TOP_FREE_IOS,
        top_paid: store.collection.TOP_PAID_IOS,
        grossing: store.collection.TOP_GROSSING
      };
      const opts = {
        collection: collMap[collection] || store.collection.TOP_FREE_IOS,
        country,
        num: Math.min(num, 100)
      };
      if (category) opts.category = store.category[category] || parseInt(category);
      results = await store.list(opts);
      results = results.map(a => ({
        id: a.appId || a.id,
        title: a.title,
        developer: a.developer,
        score: a.score,
        price: a.price,
        free: a.free,
        icon: a.icon,
        url: a.url,
        platform: 'ios'
      }));
    }

    res.json({ collection, platform, country, results });
  } catch (err) {
    console.error('List error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== SIMILAR APPS ====================
app.post('/api/similar', async (req, res) => {
  try {
    const { appId, platform = 'ios', country = 'us' } = req.body;
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    let results;
    if (platform === 'android') {
      results = await gplay.similar({ appId, country });
      results = results.slice(0, 20).map(a => ({
        id: a.appId,
        title: a.title,
        developer: a.developer,
        score: a.score,
        price: a.price,
        free: a.free,
        icon: a.icon,
        platform: 'android'
      }));
    } else {
      results = await store.similar({ appId, country });
      results = results.slice(0, 20).map(a => ({
        id: a.appId || a.id,
        title: a.title,
        developer: a.developer,
        score: a.score,
        price: a.price,
        free: a.free,
        icon: a.icon,
        platform: 'ios'
      }));
    }

    res.json({ appId, platform, results });
  } catch (err) {
    console.error('Similar error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scraper API running on port ${PORT}`));
