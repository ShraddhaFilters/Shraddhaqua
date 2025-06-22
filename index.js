const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Homepage
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});


app.get('/products', (req, res) => {
  const productFile = path.join(__dirname, 'products.txt');
  const templateFile = path.join(__dirname, 'public', 'products.html');

  fs.readFile(productFile, 'utf8', (err, rawData) => {
    if (err) return res.status(500).send('Error reading products.txt');

    const productBlocks = rawData.split('---').map(p => p.trim()).filter(Boolean);

    const cards = productBlocks.map(block => {
      const lines = block.split('\n').map(l => l.trim());
      const data = {};

      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        const keyTrimmed = key.trim().toLowerCase();
        const value = valueParts.join(':').trim();
        data[keyTrimmed] = value;
      });

      // Required fields
      const id = data.id || '';
      const name = data.name || 'Unnamed Product';
      const price = data.price || '0';
      const mrp = data.mrp || '';
      let img = '';
      let desc = '';

      try {
        const imgs = JSON.parse(data.img || '[]');
        img = imgs[0] || '';
      } catch (e) {
        img = '';
      }

      try {
        const descArr = JSON.parse(data.description || '[]');
        desc = descArr.join(', ');
      } catch (e) {
        desc = '';
      }

      if (!name || !price || !img) return ''; // Skip broken cards

      return `
      <div class="bg-[#0f2d4c] p-6 rounded-lg card text-center">
        <h4 class="text-xl font-semibold mb-2">${name}</h4>
        <img src="${img}" alt="${name}" class="w-full h-auto object-cover mb-4 rounded">
        <p class="text-blue-300 text-sm mb-3">${desc}</p>
        <p class="text-2xl font-bold text-white mb-2">₹${price} <span class="line-through text-blue-400 text-sm ml-2">₹${mrp}</span></p>
        <a href="/product/${id}" class="glow-btn px-4 py-2 text-sm rounded inline-block">Order Now</a>
      </div>
      `;
    }).filter(Boolean).join('\n');

    // Load HTML template and inject {{card}}
    fs.readFile(templateFile, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Error loading template');

      const finalHtml = html.replace('{{card}}', cards);
      res.send(finalHtml);
    });
  });
});

app.get('/product/:id', (req, res) => {
  const productId = req.params.id;
  const productFile = path.join(__dirname, 'products.txt');
  const templateFile = path.join(__dirname, 'public', 'productdetails.html');

  fs.readFile(productFile, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading products file.');

    const blocks = data.split('---').map(b => b.trim()).filter(Boolean);
    let foundProduct = null;

    for (let block of blocks) {
      const lines = block.split('\n').map(l => l.trim());
      const product = {};

      for (let line of lines) {
        const [key, ...val] = line.split(':');
        const k = key.trim().toLowerCase();
        const v = val.join(':').trim();
        product[k] = v;
      }

      if (product.id === productId) {
        foundProduct = product;
        break;
      }
    }

    if (!foundProduct) return res.status(404).send('Product not found.');

    let images = [], desc = [], specs = {}, details = [];

    try {
      images = JSON.parse(foundProduct.img || '[]');
    } catch {}
    try {
      desc = JSON.parse(foundProduct.description || '[]');
    } catch {}
    try {
      specs = JSON.parse(foundProduct.specs || '{}');
    } catch {}
    try {
      details = (foundProduct.details || '').split('|');
    } catch {}

    // Build card HTML
    const cardHTML = `
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-start">
      <!-- Left: Image -->
      <div class="bg-[#0d2a45] p-4 rounded-lg">
        <img src="${images[0] || ''}" alt="${foundProduct.name}" class="rounded-lg w-full h-auto">
        <div class="mt-4 flex gap-3">
          ${images.slice(1).map(url => `<img src="${url}" class="rounded border border-blue-600 cursor-pointer" />`).join('')}
        </div>
      </div>

      <!-- Right: Details -->
      <div>
        <h2 class="text-3xl font-bold text-white mb-2">${foundProduct.name}</h2>
        <p class="text-blue-300 text-sm mb-2">Brand: <span class="text-white font-semibold">${foundProduct.brand || 'Unknown'}</span></p>
        <div class="flex items-center gap-2 text-yellow-400 mb-4">
          <span class="star">★ ★ ★ ★ ☆</span>
          <span class="text-sm text-blue-200">(128 ratings)</span>
        </div>

        <p class="text-2xl font-bold text-white mb-2">₹${foundProduct.price} <span class="line-through text-blue-400 text-sm ml-2">₹${foundProduct.mrp}</span></p>
        <p class="text-green-400 mb-4">In Stock | Free Delivery</p>

        <ul class="text-blue-200 text-sm mb-6 space-y-2">
          ${desc.map(d => `<li>✔ ${d}</li>`).join('\n')}
        </ul>

        <div class="flex gap-4 mb-6">
          <button class="glow-btn px-6 py-3 text-white font-medium rounded">Add to Cart</button>
          <button class="px-6 py-3 rounded border border-blue-400 text-blue-300 hover:bg-blue-800 transition">Buy Now</button>
        </div>

        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2 text-blue-100">Specifications</h3>
          <table class="text-sm text-blue-200 w-full">
            ${Object.entries(specs).map(([key, value]) => `
              <tr>
                <td class="py-2 pr-4 font-medium">${key}:</td>
                <td>${value}</td>
              </tr>
            `).join('\n')}
          </table>
        </div>
      </div>
    </div>

    <section>
      <div class="max-w-6xl mx-auto px-4 py-8">
        <h3 class="text-2xl font-bold text-blue-100 mb-6">Product Description</h3>
        ${details.map(p => `<p class="text-blue-200 text-sm mb-4">${p}</p>`).join('\n')}
      </div>
    </section>
    `;

    // Inject into HTML template
    fs.readFile(templateFile, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Error reading template.');
      const finalHTML = html.replace('{{card}}', cardHTML);
      res.send(finalHTML);
    });
  });
});

app.get('/search', (req, res) => {
  const query = (req.query.query || '').toLowerCase();
  if (!query) return res.redirect('/products');

  const productFile = path.join(__dirname, 'products.txt');
  const templateFile = path.join(__dirname, 'public', 'search.html');

  fs.readFile(productFile, 'utf8', (err, rawData) => {
    if (err) return res.status(500).send('Error reading products.txt');

    const productBlocks = rawData.split('---').map(b => b.trim()).filter(Boolean);
    const matchedProducts = [];

    productBlocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim());
      const product = {};

      for (let line of lines) {
        const [key, ...val] = line.split(':');
        const k = key.trim().toLowerCase();
        const v = val.join(':').trim();
        product[k] = v;
      }

      let desc = [], name = '', brand = '';

      try { desc = JSON.parse(product.description || '[]') } catch {}
      try { name = product.name || '' } catch {}
      try { brand = product.brand || '' } catch {}

      const searchableText = [
        name.toLowerCase(),
        brand.toLowerCase(),
        ...desc.map(d => d.toLowerCase())
      ].join(' ');

      if (searchableText.includes(query)) {
        matchedProducts.push(product);
      }
    });

    if (matchedProducts.length === 0) {
      return res.send(`<h1 style="color:white; padding:2rem; font-family:sans-serif;">No products found for "${query}"</h1>`);
    }

    const cards = matchedProducts.map(product => {
      let img = '';
      let desc = [];
      try { img = JSON.parse(product.img || '[]')[0] || '' } catch {}
      try { desc = JSON.parse(product.description || '[]') } catch {}

      return `
      <div class="bg-[#0f2d4c] p-6 rounded-lg card text-center">
        <h4 class="text-xl font-semibold mb-2">${product.name}</h4>
        <img src="${img}" alt="${product.name}" class="w-full h-auto object-cover mb-4 rounded">
        <p class="text-blue-300 text-sm mb-3">${desc.join(', ')}</p>
        <p class="text-2xl font-bold text-white mb-2">₹${product.price} <span class="line-through text-blue-400 text-sm ml-2">₹${product.mrp}</span></p>
        <a href="/product/${product.id}" class="glow-btn px-4 py-2 text-sm rounded inline-block">Order Now</a>
      </div>
      `;
    }).join('\n');

    fs.readFile(templateFile, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Error loading template');
      const finalHtml = html.replace('{{card}}', cards);
      res.send(finalHtml);
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
