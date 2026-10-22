const API_URL = window.ATELIER_API_URL || 'http://localhost:3000/api/items';
const STORAGE_KEY = 'atelier-items-v1';

const elements = {
  list: document.querySelector('#items-list'),
  loading: document.querySelector('#loading-state'),
  empty: document.querySelector('#empty-state'),
  emptyTitle: document.querySelector('#empty-title'),
  emptyDescription: document.querySelector('#empty-description'),
  search: document.querySelector('#search-input'),
  sort: document.querySelector('#sort-select'),
  resultCount: document.querySelector('#results-label'),
  navCount: document.querySelector('#nav-count'),
  statItems: document.querySelector('#stat-items'),
  statValue: document.querySelector('#stat-value'),
  statAverage: document.querySelector('#stat-average'),
  dialog: document.querySelector('#item-dialog'),
  form: document.querySelector('#item-form'),
  name: document.querySelector('#item-name'),
  price: document.querySelector('#item-price'),
  error: document.querySelector('#form-error'),
  submit: document.querySelector('#submit-button'),
  toast: document.querySelector('#toast'),
};

let items = [];
let isOffline = false;
let toastTimer;

function readLocalItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveLocalItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    showToast('Le stockage local est indisponible dans ce navigateur.');
  }
}

async function requestItems(options) {
  const response = await fetch(API_URL, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) throw new Error(payload.error || 'La requête a échoué.');
  return payload;
}

async function loadItems() {
  elements.loading.hidden = false;
  elements.empty.hidden = true;
  try {
    const response = await requestItems();
    if (!Array.isArray(response)) throw new Error('Réponse invalide du serveur.');
    items = response;
    isOffline = false;
  } catch {
    items = readLocalItems();
    isOffline = true;
  }
  elements.loading.hidden = true;
  render();
  updateConnectionNote();
}

function formatPrice(value) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function getVisibleItems() {
  const query = elements.search.value.trim().toLocaleLowerCase('fr');
  const filtered = items.filter((item) => String(item.name || '').toLocaleLowerCase('fr').includes(query));
  const sort = elements.sort.value;
  return filtered.sort((first, second) => {
    if (sort === 'name') return String(first.name).localeCompare(String(second.name), 'fr');
    if (sort === 'price-asc') return Number(first.price) - Number(second.price);
    if (sort === 'price-desc') return Number(second.price) - Number(first.price);
    return String(second._id || second.localId || '').localeCompare(String(first._id || first.localId || ''));
  });
}

function render() {
  const visibleItems = getVisibleItems();
  elements.list.innerHTML = visibleItems.map((item, index) => {
    const name = escapeHtml(item.name || 'Article sans nom');
    const initial = escapeHtml((item.name || '?').trim().charAt(0).toLocaleUpperCase('fr'));
    const identifier = String(item._id || item.localId || index + 1).slice(-6).toUpperCase();
    return `<tr>
      <td><div class="item-name-cell"><span class="item-avatar">${initial}</span><div><div class="item-name">${name}</div><div class="item-meta">Dans votre catalogue</div></div></div></td>
      <td class="price-cell">${formatPrice(item.price)}</td>
      <td class="item-code">${escapeHtml(identifier)}</td>
      <td><span class="row-state"><i></i> Disponible</span></td>
    </tr>`;
  }).join('');

  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  elements.statItems.textContent = String(items.length).padStart(2, '0');
  elements.statValue.textContent = formatPrice(total);
  elements.statAverage.textContent = formatPrice(items.length ? total / items.length : 0);
  elements.navCount.textContent = items.length;
  elements.resultCount.textContent = `${visibleItems.length} article${visibleItems.length > 1 ? 's' : ''}${elements.search.value.trim() ? ' trouvé' + (visibleItems.length > 1 ? 's' : '') : ''}`;

  const isEmpty = visibleItems.length === 0;
  elements.empty.hidden = !isEmpty;
  if (isEmpty) {
    const hasSearch = Boolean(elements.search.value.trim());
    elements.emptyTitle.textContent = hasSearch ? 'Aucun résultat' : 'Votre catalogue est vide';
    elements.emptyDescription.textContent = hasSearch ? 'Essayez un autre nom ou modifiez votre recherche.' : 'Ajoutez votre premier article pour commencer.';
    document.querySelector('#empty-add').hidden = hasSearch;
  }
}

function updateConnectionNote() {
  const note = document.querySelector('.footer-note');
  note.innerHTML = isOffline
    ? '<span class="footer-check">●</span> Mode local · données enregistrées sur cet appareil'
    : '<span class="footer-check">✓</span> Synchronisé avec votre espace';
}

function openDialog() {
  elements.form.reset();
  elements.error.hidden = true;
  elements.error.textContent = '';
  elements.dialog.showModal();
  window.setTimeout(() => elements.name.focus(), 50);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 3000);
}

async function addItem(event) {
  event.preventDefault();
  const name = elements.name.value.trim();
  const price = Number(elements.price.value);
  if (!name || !Number.isFinite(price) || price <= 0) {
    elements.error.textContent = 'Saisissez un nom et un prix supérieur à 0 MAD.';
    elements.error.hidden = false;
    return;
  }

  elements.submit.disabled = true;
  elements.submit.innerHTML = '<span class="spinner-small"></span> Enregistrement…';
  elements.error.hidden = true;
  try {
    if (!isOffline) {
      const created = await requestItems({ method: 'POST', body: JSON.stringify({ name, price }) });
      items.unshift(created);
      showToast('Article ajouté au catalogue.');
    } else {
      const created = { name, price, localId: `${Date.now()}-${Math.random().toString(16).slice(2)}` };
      items.unshift(created);
      saveLocalItems();
      showToast('Article enregistré sur cet appareil.');
    }
    elements.dialog.close();
    elements.search.value = '';
    render();
    updateConnectionNote();
  } catch (error) {
    elements.error.textContent = error.message || 'Impossible d’ajouter cet article. Réessayez.';
    elements.error.hidden = false;
  } finally {
    elements.submit.disabled = false;
    elements.submit.innerHTML = 'Ajouter l’article <span>→</span>';
  }
}

document.querySelector('#open-form').addEventListener('click', openDialog);
document.querySelector('#empty-add').addEventListener('click', openDialog);
document.querySelector('#close-form').addEventListener('click', () => elements.dialog.close());
document.querySelector('#cancel-form').addEventListener('click', () => elements.dialog.close());
elements.form.addEventListener('submit', addItem);
elements.search.addEventListener('input', render);
elements.sort.addEventListener('change', render);
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

const dateLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
document.querySelector('#today-label').textContent = dateLabel.format(new Date());
loadItems();
