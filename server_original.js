const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const config = require('./config');
const sendTelegram = require('./telegram');
const suggestSEO = require('./ai');
const ExcelJS = require('exceljs');
const xml2js = require('xml2js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from build directory if it exists
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// Import functions from index.js
async function getSitemapUrls(sitemapUrl) {
  const parser = new xml2js.Parser();
  const queue = [sitemapUrl];
  const urls = [];

  while (queue.length > 0) {
    const url = queue.pop();
    const res = await axios.get(url);
    const parsed = await parser.parseStringPromise(res.data);

    if (parsed.sitemapindex) {
      const sitemaps = parsed.sitemapindex.sitemap || [];
      for (const sm of sitemaps) {
        if (sm.loc && sm.loc[0]) {
          queue.push(sm.loc[0]);
        }
      }
    } else if (parsed.urlset) {
      const items = parsed.urlset.url || [];
      for (const u of items) {
        if (u.loc && u.loc[0]) {
          urls.push(u.loc[0]);
        }
      }
    }
  }

  return urls;
}

function extractAllMetaTags($) {
  const metaTags = {
    metaDescription: $('meta[name="description"]').attr('content') || '',
    metaKeywords: $('meta[name="keywords"]').attr('content') || '',
    robots: $('meta[name="robots"]').attr('content') || '',
    ogTitle: $('meta[property="og:title"]').attr('content') || '',
    ogDescription: $('meta[property="og:description"]').attr('content') || '',
    ogImage: $('meta[property="og:image"]').attr('content') || '',
    author: $('meta[name="author"]').attr('content') || '',
  };

  const missingMeta = [];
  if (!metaTags.metaDescription) missingMeta.push('description');
  if (!metaTags.ogTitle) missingMeta.push('og:title');
  if (!metaTags.ogDescription) missingMeta.push('og:description');
  if (!metaTags.ogImage) missingMeta.push('og:image');

  return { ...metaTags, missingMeta: missingMeta.join(', ') };
}

async function analyzePage(url) {
  let pageData = {
    url,
    status: '',
    titleOriginal: '',
    titleSuggested: '',
    metaDescription: '',
    metaDescriptionSuggested: '',
    h1Content: '',
    h1Valid: 'No',
    h1Count: 0,
    totalImages: 0,
    imagesWithoutAlt: 0,
    brokenImagesCount: 0,
    notes: ''
  };

  let imageData = [];

  try {
    const res = await axios.get(url);
    pageData.status = res.status;

    const $ = cheerio.load(res.data);

    pageData.titleOriginal = $('title').text().trim();

    const metaTags = extractAllMetaTags($);
    pageData = { ...pageData, ...metaTags };

    const h1s = $('h1');
    pageData.h1Count = h1s.length;
    pageData.h1Content = h1s.first().text().trim();
    pageData.h1Valid = h1s.length === 1 ? 'Yes' : 'No';

    const imgs = $('img');
    pageData.totalImages = imgs.length;
    let imagesWithoutAlt = 0;
    let brokenImagesCount = 0;

    for (let i = 0; i < imgs.length; i++) {
      const img = $(imgs[i]);
      const src = img.attr('src');
      const alt = img.attr('alt') || '';
      
      if (!src) continue;

      const fullSrc = src.startsWith('http') ? src : new URL(src, url).href;
      
      let imgInfo = {
        pageUrl: url,
        imageNumber: i + 1,
        imageUrl: fullSrc,
        altText: alt || 'Missing Alt Text',
        hasAlt: alt ? 'Yes' : 'No',
        altLength: alt ? alt.length : 0,
        imageStatus: 'OK',
        suggestedAlt: '',
        imageName: src.split('/').pop().split('?')[0] || 'unknown'
      };

      if (!alt || alt.trim() === '') {
        imagesWithoutAlt++;
        
        try {
          const imageName = imgInfo.imageName.split('.')[0];
          const contextText = img.parent().text().substring(0, 100);
          
          const suggestedAlt = await suggestSEO('alt', {
            imageSrc: fullSrc,
            imageName: imageName,
            context: contextText,
            pageContent: res.data
          });
          
          imgInfo.suggestedAlt = suggestedAlt;
        } catch {
          const imageName = imgInfo.imageName.split('.')[0].replace(/[-_]/g, ' ');
          imgInfo.suggestedAlt = `Image of ${imageName}`;
        }
      }

      try {
        const imgCheck = await axios.head(fullSrc);
        if (imgCheck.status >= 400) {
          imgInfo.imageStatus = 'Broken';
          brokenImagesCount++;
        }
      } catch {
        imgInfo.imageStatus = 'Broken';
        brokenImagesCount++;
      }

      imageData.push(imgInfo);
    }

    pageData.imagesWithoutAlt = imagesWithoutAlt;
    pageData.brokenImagesCount = brokenImagesCount;

    if (!pageData.titleOriginal || pageData.titleOriginal.length < 20 || pageData.titleOriginal.length > 70) {
      pageData.titleSuggested = await suggestSEO('title', res.data);
      pageData.notes += 'Title needs optimization. ';
    }

    if (!pageData.metaDescription || pageData.metaDescription.length < 50 || pageData.metaDescription.length > 160) {
      pageData.metaDescriptionSuggested = await suggestSEO('description', res.data);
      pageData.notes += 'Meta description needs optimization. ';
    }

    if (pageData.h1Count === 0) pageData.notes += 'Missing H1 tag. ';
    if (pageData.h1Count > 1) pageData.notes += `Multiple H1 tags found (${pageData.h1Count}). `;
    if (!pageData.ogImage) pageData.notes += 'Missing OG:Image. ';
    if (imagesWithoutAlt > 0) pageData.notes += `${imagesWithoutAlt} images missing alt text. `;
    if (brokenImagesCount > 0) pageData.notes += `${brokenImagesCount} broken images found. `;

  } catch (err) {
    pageData.status = err.response?.status || 'Error';
    pageData.notes = err.message;
  }

  return { pageData, imageData };
}

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { sitemapUrl } = req.body;
    
    if (!sitemapUrl) {
      return res.status(400).json({ error: 'Sitemap URL is required' });
    }

    const urls = await getSitemapUrls(sitemapUrl);
    res.json({ urls, count: urls.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    const results = [];
    const allImageData = [];

    console.log(`Starting audit for ${urls.length} URLs...`);

    for (let i = 0; i < urls.length; i++) {
      console.log(`Analyzing ${i + 1}/${urls.length}: ${urls[i]}`);
      const { pageData, imageData } = await analyzePage(urls[i]);
      results.push(pageData);
      allImageData.push(...imageData);
    }

    console.log(`Audit completed. Processed ${results.length} pages and ${allImageData.length} images.`);
    res.json({ pages: results, images: allImageData });
  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-report', async (req, res) => {
  try {
    const { pages, images } = req.body;
    
    const workbook = new ExcelJS.Workbook();
    
    const pagesSheet = workbook.addWorksheet('Pages SEO Data');
    pagesSheet.columns = [
      { header: 'Page URL', key: 'url', width: 50 },
      { header: 'HTTP Status', key: 'status', width: 12 },
      { header: 'Title (Original)', key: 'titleOriginal', width: 50 },
      { header: 'Title (Suggested)', key: 'titleSuggested', width: 50 },
      { header: 'Meta Description', key: 'metaDescription', width: 50 },
      { header: 'Meta Description (Suggested)', key: 'metaDescriptionSuggested', width: 50 },
      { header: 'H1 Content', key: 'h1Content', width: 40 },
      { header: 'H1 Valid', key: 'h1Valid', width: 10 },
      { header: 'Total Images', key: 'totalImages', width: 12 },
      { header: 'Images Without Alt', key: 'imagesWithoutAlt', width: 18 },
      { header: 'Notes / Recommendations', key: 'notes', width: 50 }
    ];
    
    const imagesSheet = workbook.addWorksheet('Images Analysis');
    imagesSheet.columns = [
      { header: 'Page URL', key: 'pageUrl', width: 50 },
      { header: 'Image URL', key: 'imageUrl', width: 60 },
      { header: 'Alt Text', key: 'altText', width: 50 },
      { header: 'Has Alt', key: 'hasAlt', width: 10 },
      { header: 'Image Status', key: 'imageStatus', width: 12 },
      { header: 'Suggested Alt Text', key: 'suggestedAlt', width: 50 }
    ];

    pages.forEach(page => pagesSheet.addRow(page));
    images.forEach(img => imagesSheet.addRow(img));
    
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    const filename = `seo-report-${Date.now()}.xlsx`;
    const filepath = path.join(reportsDir, filename);

    await workbook.xlsx.writeFile(filepath);
    
    res.json({ filename, filepath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app in production, or show development message
app.get('*', (req, res) => {
  const buildIndexPath = path.join(__dirname, 'build', 'index.html');
  if (fs.existsSync(buildIndexPath)) {
    res.sendFile(buildIndexPath);
  } else {
    res.json({ 
      message: 'Development mode - React app should be running on port 3000',
      api: 'API is running on port 5000',
      status: 'Server is ready'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use('/reports', express.static(path.join(__dirname, 'reports')));


// 1st aug before update code

// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// const fs = require('fs');
// const axios = require('axios');
// const cheerio = require('cheerio');
// const config = require('./config');
// const sendTelegram = require('./telegram');
// const suggestSEO = require('./ai');
// const ExcelJS = require('exceljs');
// const xml2js = require('xml2js');

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());

// // Serve static files from build directory if it exists
// const buildPath = path.join(__dirname, 'build');
// if (fs.existsSync(buildPath)) {
//   app.use(express.static(buildPath));
// }

// // Import functions from index.js
// async function getSitemapUrls(sitemapUrl) {
//   const parser = new xml2js.Parser();
//   const queue = [sitemapUrl];
//   const urls = [];

//   while (queue.length > 0) {
//     const url = queue.pop();
//     const res = await axios.get(url);
//     const parsed = await parser.parseStringPromise(res.data);

//     if (parsed.sitemapindex) {
//       const sitemaps = parsed.sitemapindex.sitemap || [];
//       for (const sm of sitemaps) {
//         if (sm.loc && sm.loc[0]) {
//           queue.push(sm.loc[0]);
//         }
//       }
//     } else if (parsed.urlset) {
//       const items = parsed.urlset.url || [];
//       for (const u of items) {
//         if (u.loc && u.loc[0]) {
//           urls.push(u.loc[0]);
//         }
//       }
//     }
//   }

//   return urls;
// }

// function extractAllMetaTags($) {
//   const metaTags = {
//     metaDescription: $('meta[name="description"]').attr('content') || '',
//     metaKeywords: $('meta[name="keywords"]').attr('content') || '',
//     robots: $('meta[name="robots"]').attr('content') || '',
//     ogTitle: $('meta[property="og:title"]').attr('content') || '',
//     ogDescription: $('meta[property="og:description"]').attr('content') || '',
//     ogImage: $('meta[property="og:image"]').attr('content') || '',
//     author: $('meta[name="author"]').attr('content') || '',
//   };

//   const missingMeta = [];
//   if (!metaTags.metaDescription) missingMeta.push('description');
//   if (!metaTags.ogTitle) missingMeta.push('og:title');
//   if (!metaTags.ogDescription) missingMeta.push('og:description');
//   if (!metaTags.ogImage) missingMeta.push('og:image');

//   return { ...metaTags, missingMeta: missingMeta.join(', ') };
// }

// async function analyzePage(url) {
//   let pageData = {
//     url,
//     status: '',
//     titleOriginal: '',
//     titleSuggested: '',
//     metaDescription: '',
//     metaDescriptionSuggested: '',
//     h1Content: '',
//     h1Valid: 'No',
//     h1Count: 0,
//     totalImages: 0,
//     imagesWithoutAlt: 0,
//     brokenImagesCount: 0,
//     notes: ''
//   };

//   let imageData = [];

//   try {
//     const res = await axios.get(url);
//     pageData.status = res.status;

//     const $ = cheerio.load(res.data);

//     pageData.titleOriginal = $('title').text().trim();

//     const metaTags = extractAllMetaTags($);
//     pageData = { ...pageData, ...metaTags };

//     const h1s = $('h1');
//     pageData.h1Count = h1s.length;
//     pageData.h1Content = h1s.first().text().trim();
//     pageData.h1Valid = h1s.length === 1 ? 'Yes' : 'No';

//     const imgs = $('img');
//     pageData.totalImages = imgs.length;
//     let imagesWithoutAlt = 0;
//     let brokenImagesCount = 0;

//     for (let i = 0; i < imgs.length; i++) {
//       const img = $(imgs[i]);
//       const src = img.attr('src');
//       const alt = img.attr('alt') || '';
      
//       if (!src) continue;

//       const fullSrc = src.startsWith('http') ? src : new URL(src, url).href;
      
//       let imgInfo = {
//         pageUrl: url,
//         imageNumber: i + 1,
//         imageUrl: fullSrc,
//         altText: alt || 'Missing Alt Text',
//         hasAlt: alt ? 'Yes' : 'No',
//         altLength: alt ? alt.length : 0,
//         imageStatus: 'OK',
//         suggestedAlt: '',
//         imageName: src.split('/').pop().split('?')[0] || 'unknown'
//       };

//       if (!alt || alt.trim() === '') {
//         imagesWithoutAlt++;
        
//         try {
//           const imageName = imgInfo.imageName.split('.')[0];
//           const contextText = img.parent().text().substring(0, 100);
          
//           const suggestedAlt = await suggestSEO('alt', {
//             imageSrc: fullSrc,
//             imageName: imageName,
//             context: contextText,
//             pageContent: res.data
//           });
          
//           imgInfo.suggestedAlt = suggestedAlt;
//         } catch {
//           const imageName = imgInfo.imageName.split('.')[0].replace(/[-_]/g, ' ');
//           imgInfo.suggestedAlt = `Image of ${imageName}`;
//         }
//       }

//       try {
//         const imgCheck = await axios.head(fullSrc);
//         if (imgCheck.status >= 400) {
//           imgInfo.imageStatus = 'Broken';
//           brokenImagesCount++;
//         }
//       } catch {
//         imgInfo.imageStatus = 'Broken';
//         brokenImagesCount++;
//       }

//       imageData.push(imgInfo);
//     }

//     pageData.imagesWithoutAlt = imagesWithoutAlt;
//     pageData.brokenImagesCount = brokenImagesCount;

//     if (!pageData.titleOriginal || pageData.titleOriginal.length < 20 || pageData.titleOriginal.length > 70) {
//       pageData.titleSuggested = await suggestSEO('title', res.data);
//       pageData.notes += 'Title needs optimization. ';
//     }

//     if (!pageData.metaDescription || pageData.metaDescription.length < 50 || pageData.metaDescription.length > 160) {
//       pageData.metaDescriptionSuggested = await suggestSEO('description', res.data);
//       pageData.notes += 'Meta description needs optimization. ';
//     }

//     if (pageData.h1Count === 0) pageData.notes += 'Missing H1 tag. ';
//     if (pageData.h1Count > 1) pageData.notes += `Multiple H1 tags found (${pageData.h1Count}). `;
//     if (!pageData.ogImage) pageData.notes += 'Missing OG:Image. ';
//     if (imagesWithoutAlt > 0) pageData.notes += `${imagesWithoutAlt} images missing alt text. `;
//     if (brokenImagesCount > 0) pageData.notes += `${brokenImagesCount} broken images found. `;

//   } catch (err) {
//     pageData.status = err.response?.status || 'Error';
//     pageData.notes = err.message;
//   }

//   return { pageData, imageData };
// }

// // API Routes
// app.post('/api/analyze', async (req, res) => {
//   try {
//     const { sitemapUrl } = req.body;
    
//     if (!sitemapUrl) {
//       return res.status(400).json({ error: 'Sitemap URL is required' });
//     }

//     const urls = await getSitemapUrls(sitemapUrl);
//     res.json({ urls, count: urls.length });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post('/api/audit', async (req, res) => {
//   try {
//     const { urls } = req.body;
    
//     if (!urls || !Array.isArray(urls)) {
//       return res.status(400).json({ error: 'URLs array is required' });
//     }

//     const results = [];
//     const allImageData = [];

//     console.log(`Starting audit for ${urls.length} URLs...`);

//     for (let i = 0; i < urls.length; i++) {
//       console.log(`Analyzing ${i + 1}/${urls.length}: ${urls[i]}`);
//       const { pageData, imageData } = await analyzePage(urls[i]);
//       results.push(pageData);
//       allImageData.push(...imageData);
//     }

//     console.log(`Audit completed. Processed ${results.length} pages and ${allImageData.length} images.`);
//     res.json({ pages: results, images: allImageData });
//   } catch (error) {
//     console.error('Audit error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post('/api/generate-report', async (req, res) => {
//   try {
//     const { pages, images } = req.body;
    
//     const workbook = new ExcelJS.Workbook();
    
//     const pagesSheet = workbook.addWorksheet('Pages SEO Data');
//     pagesSheet.columns = [
//       { header: 'Page URL', key: 'url', width: 50 },
//       { header: 'HTTP Status', key: 'status', width: 12 },
//       { header: 'Title (Original)', key: 'titleOriginal', width: 50 },
//       { header: 'Title (Suggested)', key: 'titleSuggested', width: 50 },
//       { header: 'Meta Description', key: 'metaDescription', width: 50 },
//       { header: 'Meta Description (Suggested)', key: 'metaDescriptionSuggested', width: 50 },
//       { header: 'H1 Content', key: 'h1Content', width: 40 },
//       { header: 'H1 Valid', key: 'h1Valid', width: 10 },
//       { header: 'Total Images', key: 'totalImages', width: 12 },
//       { header: 'Images Without Alt', key: 'imagesWithoutAlt', width: 18 },
//       { header: 'Notes / Recommendations', key: 'notes', width: 50 }
//     ];
    
//     const imagesSheet = workbook.addWorksheet('Images Analysis');
//     imagesSheet.columns = [
//       { header: 'Page URL', key: 'pageUrl', width: 50 },
//       { header: 'Image URL', key: 'imageUrl', width: 60 },
//       { header: 'Alt Text', key: 'altText', width: 50 },
//       { header: 'Has Alt', key: 'hasAlt', width: 10 },
//       { header: 'Image Status', key: 'imageStatus', width: 12 },
//       { header: 'Suggested Alt Text', key: 'suggestedAlt', width: 50 }
//     ];

//     pages.forEach(page => pagesSheet.addRow(page));
//     images.forEach(img => imagesSheet.addRow(img));
    
//     const reportsDir = path.join(__dirname, 'reports');
//     if (!fs.existsSync(reportsDir)) {
//       fs.mkdirSync(reportsDir);
//     }

//     const filename = `seo-report-${Date.now()}.xlsx`;
//     const filepath = path.join(reportsDir, filename);

//     await workbook.xlsx.writeFile(filepath);
    
//     res.json({ filename, filepath });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Serve React app in production, or show development message
// app.get('*', (req, res) => {
//   const buildIndexPath = path.join(__dirname, 'build', 'index.html');
//   if (fs.existsSync(buildIndexPath)) {
//     res.sendFile(buildIndexPath);
//   } else {
//     res.json({ 
//       message: 'Development mode - React app should be running on port 3000',
//       api: 'API is running on port 5000',
//       status: 'Server is ready'
//     });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// app.use('/reports', express.static(path.join(__dirname, 'reports')));