const SPREADSHEET_ID = '1hPgybWkV7IvufGKcMT6OU-JPwlh8Xt8-PHIzLPi_wGg';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

let allProducts = [];
let activeMarketplace = 'todos';
let activeCategory = 'todos';

function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const products = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= headers.length) {
            const product = {};
            headers.forEach((header, index) => {
                product[header] = values[index]?.trim() || '';
            });
            products.push(product);
        }
    }

    return products;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function calculateDiscount(precoNormal, precoPromocional) {
    const normal = parseFloat(precoNormal.replace(',', '.'));
    const promo = parseFloat(precoPromocional.replace(',', '.'));
    if (normal > 0 && promo > 0 && normal > promo) {
        return Math.round(((normal - promo) / normal) * 100);
    }
    return 0;
}

function formatPrice(value) {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return value;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function copyCoupon(code) {
    navigator.clipboard.writeText(code).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    });
}

function renderFilters(products) {
    const marketplaces = [...new Set(products.map(p => p['Marketplace']).filter(Boolean))];
    const categories = [...new Set(products.map(p => p['Categoria']).filter(Boolean))];
    
    const marketplaceContainer = document.getElementById('marketplaceFilters');
    const categoryContainer = document.getElementById('categoryFilters');

    marketplaceContainer.innerHTML = '<button class="filter-btn active" data-marketplace="todos">Todos</button>';
    categoryContainer.innerHTML = '<button class="filter-btn active" data-category="todos">Todas</button>';

    marketplaces.forEach(mp => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.setAttribute('data-marketplace', mp);
        btn.textContent = mp;
        marketplaceContainer.appendChild(btn);
    });

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.setAttribute('data-category', cat);
        btn.textContent = cat;
        categoryContainer.appendChild(btn);
    });

    marketplaceContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            marketplaceContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeMarketplace = e.target.getAttribute('data-marketplace');
            renderProducts();
        }
    });

    categoryContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            categoryContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeCategory = e.target.getAttribute('data-category');
            renderProducts();
        }
    });
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const filtered = allProducts.filter(p => {
        const matchMarketplace = activeMarketplace === 'todos' || p['Marketplace'] === activeMarketplace;
        const matchCategory = activeCategory === 'todos' || p['Categoria'] === activeCategory;
        return matchMarketplace && matchCategory;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        document.getElementById('emptyState').style.display = 'block';
        return;
    }

    document.getElementById('emptyState').style.display = 'none';

    grid.innerHTML = filtered.map(product => {
        const discount = calculateDiscount(product['Preço normal'], product['Preço Promocional']);
        const hashtags = product['Hashtags']
            ? product['Hashtags'].split(',').map(h => `<span class="hashtag">#${h.trim()}</span>`).join('')
            : '';

        return `
            <article class="product-card">
                <img class="product-image" src="${product['Link da Imagem']}" alt="${product['Nome do Produto']}" loading="lazy">
                <div class="product-content">
                    <span class="product-marketplace">${product['Marketplace'] || ''}</span>
                    <h2 class="product-title">${product['Nome do Produto']}</h2>
                    <p class="product-description">${product['Descrição']}</p>
                    <div class="product-pricing">
                        <span class="price-current">${formatPrice(product['Preço Promocional'])}</span>
                        <span class="price-original">${formatPrice(product['Preço normal'])}</span>
                        ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
                    </div>
                    ${product['Cupom'] ? `
                        <div class="product-coupon" onclick="copyCoupon('${product['Cupom']}')">
                            <span class="coupon-label">Cupom:</span>
                            <span class="coupon-code">${product['Cupom']}</span>
                            <span class="coupon-copy">copiar</span>
                        </div>
                        ${product['Regra Cupom'] ? `<p class="coupon-rule">${product['Regra Cupom']}</p>` : ''}
                    ` : ''}
                    <div class="product-hashtags">${hashtags}</div>
                    <div class="product-cta">
                        <a href="${product['Link do Produto']}" target="_blank" rel="noopener noreferrer" class="btn-buy">Ver Oferta</a>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

async function loadProducts() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        allProducts = parseCSV(text);

        document.getElementById('loading').style.display = 'none';
        renderFilters(allProducts);
        renderProducts();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        document.getElementById('loading').innerHTML = '<p>Erro ao carregar produtos. Tente novamente.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    loadProducts();
});
