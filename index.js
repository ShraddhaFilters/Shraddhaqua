const express = require("express");
const Razorpay = require("razorpay");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const pendingOrders = new Map();

const razorpay = new Razorpay({
  key_id: "rzp_test_DI9DBN4NxU7t2m",
  key_secret: "ypuldkqA6GTUY11JZgWEOxWx",
});


app.get("/index.html", (req,res) => {
  res.redirect("/");
})

app.get("/products.html", (req,res) => {
  res.redirect(301,"/products");
})
app.get("/parts", (req,res) => {
  res.sendFile(path.join(__dirname, "public/coming.html"));
})

// Serve static files from "public" directory
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));

function getProducts(filePath) {
  const rawText = fs.readFileSync(filePath, "utf-8");

  // Split entries by separator (--- or just empty line if consistent)
  const entries = rawText
    .split(/---+\s*/g) // handles `---` separators
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const products = [];

  for (const entry of entries) {
    const product = {};
    const lines = entry.split(/\n(?=\w+:)/); // split only at new line before key:

    for (let line of lines) {
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();

      try {
        if (key === "img" || key === "description") {
          product[key] = JSON.parse(value);
        } else if (key === "specs") {
          // Remove trailing commas before parsing
          const fixedJson = value.replace(/,(\s*})/, "$1");
          product[key] = JSON.parse(fixedJson);
        } else if (key === "price" || key === "mrp" || key === "id") {
          product[key] = parseInt(value, 10);
        } else {
          product[key] = value;
        }
      } catch (e) {
        console.error(`Error parsing key "${key}" with value: ${value}`);
        console.error(e);
      }
    }

    products.push(product);
  }

  return products;
}
const productsInfo = getProducts(path.join(__dirname, "products.txt"));




app.get("/info/:id", (req, res) => {
  const id = req.params.id;
  const product = productsInfo.find((p) => p.id === parseInt(id, 10));
  if (product) {
    res.json(product.price);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// Fallback route to index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Homepage
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.post("/buy", async (req, res) => {
  const { name, email, phone, address, id } = req.body;
 // res.json({name, email, phone, address, id})
  console.clear();
  console.log(req.body);

  const product = productsInfo.find((p) => p.id === parseInt(id, 10));

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  const amount = product.price;

  const referenceId = Date.now().toString();

  pendingOrders.set(referenceId, {
    name,
    email,
    phone,
    address,
    product: product.name
  })

  setTimeout(() => {
    pendingOrders.delete(referenceId);
    console.log(`Order ${referenceId} expired.`);
  }, 5 * 60 * 1000)

  const options = {
    amount: amount * 100, // amount in paise
    currency: "INR",
    accept_partial: false,
    description: "Payment for Shraddha Aqua",
    reference_id: referenceId,
    customer: {
      name,
      email,
      phone,
    },
    notify: {
      sms: false,
      email: false,
    },
    reminder_enable: true,
    callback_url: "https://shraddhaqua.onrender.com/payment-success",
    callback_method: "get",
  };

  try {
    const response = await razorpay.paymentLink.create(options);
    console.log("Short URL:", response.short_url); // log to console
    res.redirect(response.short_url);
  } catch (err) {
    console.error("Error creating payment link:", err);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

app.post("/payment", (req, res) => {
  const data = req.body;
  console.log(data);
});

app.get("/products", (req, res) => {
  const productFile = path.join(__dirname, "products.txt");
  const templateFile = path.join(__dirname, "public", "products.html");

  fs.readFile(productFile, "utf8", (err, rawData) => {
    if (err) return res.status(500).send("Error reading products.txt");

    const productBlocks = rawData
      .split("---")
      .map((p) => p.trim())
      .filter(Boolean);

    const cards = productBlocks
      .map((block) => {
        const lines = block.split("\n").map((l) => l.trim());
        const data = {};

        lines.forEach((line) => {
          const [key, ...valueParts] = line.split(":");
          const keyTrimmed = key.trim().toLowerCase();
          const value = valueParts.join(":").trim();
          data[keyTrimmed] = value;
        });

        // Required fields
        const id = data.id || "";
        const name = data.name || "Unnamed Product";
        const price = data.price || "0";
        const mrp = data.mrp || "";
        let img = "";
        let desc = "";

        try {
          const imgs = JSON.parse(data.img || "[]");
          img = imgs[0] || "";
        } catch (e) {
          img = "";
        }

        try {
          const descArr = JSON.parse(data.description || "[]");
          desc = descArr.join(", ");
        } catch (e) {
          desc = "";
        }

        if (!name || !price || !img) return ""; // Skip broken cards

        return `
      <div class="bg-[#0f2d4c] p-6 rounded-lg card text-center">
        <h4 class="text-xl font-semibold mb-2">${name}</h4>
        <img src="${img}" alt="${name}" class="w-full h-auto object-cover mb-4 rounded">
        <p class="text-blue-300 text-sm mb-3">${desc.split(".")[0]}</p>
        <p class="text-2xl font-bold text-white mb-2">₹${price} <span class="line-through text-blue-400 text-sm ml-2">₹${mrp}</span></p>
        <a href="/product/${id}" class="glow-btn px-4 py-2 text-sm rounded inline-block">Order Now</a>
      </div>
      `;
      })
      .filter(Boolean)
      .join("\n");

    // Load HTML template and inject {{card}}
    fs.readFile(templateFile, "utf8", (err, html) => {
      if (err) return res.status(500).send("Error loading template");

      const finalHtml = html.replace("{{card}}", cards);
      res.send(finalHtml);
    });
  });
});

app.get("/product/:id", (req, res) => {
  const productId = req.params.id;
  const productFile = path.join(__dirname, "products.txt");
  const templateFile = path.join(__dirname, "public", "productdetails.html");

  fs.readFile(productFile, "utf8", (err, data) => {
    if (err) return res.status(500).send("Error reading products file.");

    const blocks = data
      .split("---")
      .map((b) => b.trim())
      .filter(Boolean);
    let foundProduct = null;

    for (let block of blocks) {
      const lines = block.split("\n").map((l) => l.trim());
      const product = {};

      for (let line of lines) {
        const [key, ...val] = line.split(":");
        const k = key.trim().toLowerCase();
        const v = val.join(":").trim();
        product[k] = v;
      }

      if (product.id === productId) {
        foundProduct = product;
        break;
      }
    }

    if (!foundProduct) return res.status(404).send("Product not found.");

    let images = [],
      desc = [],
      specs = {},
      details = [];
    console.log(foundProduct);
    try {
      images = JSON.parse(foundProduct.img || "[]");
    } catch {}
    try {
      desc = JSON.parse(foundProduct.description || "[]");
    } catch {}
    try {
      specs = JSON.parse(foundProduct.specs || "{}");
    } catch {}
    try {
      details = (foundProduct.details || "").split("|");
    } catch {}

    // Build card HTML
    const cardHTML = `
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-start">
      <!-- Left: Image -->
      <div class="bg-[#0d2a45] p-4 rounded-lg">
  <!-- Main Image -->
  <img id="mainImage" src="${images[0] || ""}" alt="${foundProduct.name}" class="rounded-lg w-full h-auto max-h-[400px] object-contain transition-all duration-300" />

  <!-- Thumbnail Gallery -->
  <div class="mt-4 flex gap-3 overflow-x-auto whitespace-nowrap pb-2">
    ${images
      .slice(1)
      .map(
        (
          url,
        ) => `<button onclick="document.getElementById('mainImage').src='${url}'">
                <img src="${url}" class="rounded border-2 border-transparent hover:border-blue-500 cursor-pointer h-32 w-auto flex-shrink-0 object-contain transition-all duration-200" />
              </button>`,
      )
      .join("")}
  </div>
</div>
      <!-- Right: Details -->
      <div>
        <h2 class="text-3xl font-bold text-white mb-2">${foundProduct.name}</h2>
        <p class="text-blue-300 text-sm mb-2">Brand: <span class="text-white font-semibold">${foundProduct.brand || "Unknown"}</span></p>
        <div class="flex items-center gap-2 text-yellow-400 mb-4">
          <span class="star">★ ★ ★ ★ ☆</span>
          <span class="text-sm text-blue-200">(128 ratings)</span>
        </div>

        <p class="text-2xl font-bold text-white mb-2">₹${foundProduct.price} <span class="line-through text-blue-400 text-sm ml-2">₹${foundProduct.mrp}</span></p><br>
         <button id='buyNow' class="glow-btn px-6 py-3 text-white font-medium rounded">Buy Now</button>
          <button id='contact' class="px-6 py-3 rounded border border-blue-400 text-blue-300 hover:bg-blue-800 transition">Contact Us</button><br>
        
        <p class="text-green-400 mb-4">In Stock | Free Delivery</p>

        <ul class="text-blue-200 text-sm mb-6 space-y-2">
          ${desc.map((d) => `<li>✔ ${d}</li>`).join("\n")}
        </ul>

        <div class="flex gap-4 mb-6">
         </div>

        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2 text-blue-100">Specifications</h3>
          <table class="text-sm text-blue-200 w-full">
            ${Object.entries(specs)
              .map(
                ([key, value]) => `
              <tr>
                <td class="py-2 pr-4 font-medium">${key}:</td>
                <td>${value}</td>
              </tr>
            `,
              )
              .join("\n")}
          </table>
        </div>
      </div>
    </div>

    <section>
      <div class="max-w-6xl mx-auto px-4 py-8">
        <h3 class="text-2xl font-bold text-blue-100 mb-6">Product Description</h3>
        ${details.map((p) => `<p class="text-blue-200 text-sm mb-4">${p}</p>`).join("\n")}
      </div>
    </section>
    `;

    // Inject into HTML template
    fs.readFile(templateFile, "utf8", (err, html) => {
      if (err) return res.status(500).send("Error reading template.");
      const finalHTML = html.replace("{{card}}", cardHTML);
      res.send(finalHTML);
    });
  });
});

app.get("/search", (req, res) => {
  const query = (req.query.query || "").toLowerCase();
  if (!query) return res.redirect("/products");

  const productFile = path.join(__dirname, "products.txt");
  const templateFile = path.join(__dirname, "public", "search.html");

  fs.readFile(productFile, "utf8", (err, rawData) => {
    if (err) return res.status(500).send("Error reading products.txt");

    const productBlocks = rawData
      .split("---")
      .map((b) => b.trim())
      .filter(Boolean);
    const matchedProducts = [];

    productBlocks.forEach((block) => {
      const lines = block.split("\n").map((l) => l.trim());
      const product = {};

      for (let line of lines) {
        const [key, ...val] = line.split(":");
        const k = key.trim().toLowerCase();
        const v = val.join(":").trim();
        product[k] = v;
      }

      let desc = [],
        name = "",
        brand = "";

      try {
        desc = JSON.parse(product.description || "[]");
      } catch {}
      try {
        name = product.name || "";
      } catch {}
      try {
        brand = product.brand || "";
      } catch {}

      const searchableText = [
        name.toLowerCase(),
        brand.toLowerCase(),
        ...desc.map((d) => d.toLowerCase()),
      ].join(" ");

      if (searchableText.includes(query)) {
        matchedProducts.push(product);
      }
    });

    if (matchedProducts.length === 0) {
      var html = fs.readFileSync(path.join(__dirname,"public/products.html"),'utf8');
      
      const finalhtml = html.replace("{{card}}",`<h1 style="color:white; padding:2rem; font-family:sans-serif;">No products found for "${query}"</h1>` )
      return res.send(finalhtml);
    }

    const cards = matchedProducts
      .map((product) => {
        let img = "";
        let desc = [];
        try {
          img = JSON.parse(product.img || "[]")[0] || "";
        } catch {}
        try {
          desc = JSON.parse(product.description || "[]");
        } catch {}

        return `
      <div class="bg-[#0f2d4c] p-6 rounded-lg card text-center">
        <h4 class="text-xl font-semibold mb-2">${product.name}</h4>
        <img src="${img}" alt="${product.name}" class="w-full h-auto object-cover mb-4 rounded">
        <p class="text-blue-300 text-sm mb-3">${desc[0]}</p>
        <p class="text-2xl font-bold text-white mb-2">₹${product.price} <span class="line-through text-blue-400 text-sm ml-2">₹${product.mrp}</span></p>
        <a href="/product/${product.id}" class="glow-btn px-4 py-2 text-sm rounded inline-block">Order Now</a>
      </div>
      `;
      })
      .join("\n");

    fs.readFile(templateFile, "utf8", (err, html) => {
      if (err) return res.status(500).send("Error loading template");
      const finalHtml = html.replace("{{card}}", cards);
      res.send(finalHtml);
    });
  });
});

app.get('/payment-success', (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_signature
  } = req.query;

  const referenceId = razorpay_payment_link_reference_id;

  if (!referenceId || !pendingOrders.has(referenceId)) {
    return res.status(400).send('Order not found or expired.');
  }

  const order = pendingOrders.get(referenceId);

  // ✅ Do something with the order
  console.log('✅ Payment received:', {
    paymentId: razorpay_payment_id,
    ...order
  });

  try {
    const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'User-Agent': 'Telegram Bot SDK - (https://github.com/irazasyed/telegram-bot-sdk)',
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    text: `# 🛒 New Order \n ================= \n ✅✅✅ \n #New order recived for ${JSON.stringify(order)}`,
    parse_mode: 'Markdown',
    disable_web_page_preview: false,
    disable_notification: false,
    reply_to_message_id: 0,
    chat_id: '-1002682342161'
  })
};

fetch('https://api.telegram.org/bot7896065221%3AAAENT8Q1vDuYaR-jEhAoWCJb4gQEYPQj8Po/sendMessage', options)
  .then(res => res.json())
  .catch(err => console.error(err));
  } catch (error){
    alert(error.message)
  }




  pendingOrders.delete(referenceId);

  res.send(`<h2 style="color: green; font-family: sans-serif;">✅ Payment Successful!</h2><p>Thanks ${order.name}, we’ve received your order for ${order.product}.</p>`);
});

// 404 Not Found
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public/404.html"));
});
// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
