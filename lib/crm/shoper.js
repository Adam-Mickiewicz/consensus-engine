// lib/crm/shoper.js
// Klient Shoper REST API — OAuth2 + paginowane pobieranie zamówień.
// Zmienne środowiskowe: SHOPER_URL, SHOPER_CLIENT_ID, SHOPER_CLIENT_SECRET

const MAX_PAGES = 500; // limit bezpieczeństwa
const PAGE_SIZE = 50;  // max dozwolony przez Shoper

/**
 * getShoperToken(shopUrl, clientId, clientSecret)
 * Pobiera access_token przez OAuth2 (Basic Auth + form body).
 * Zwraca string token ważny przez ~3600s.
 */
export async function getShoperToken(
  shopUrl = process.env.SHOPER_URL,
  clientId = process.env.SHOPER_CLIENT_ID,
  clientSecret = process.env.SHOPER_CLIENT_SECRET
) {
  if (!shopUrl || !clientId || !clientSecret) {
    throw new Error(
      "Brak zmiennych środowiskowych: SHOPER_URL, SHOPER_CLIENT_ID, SHOPER_CLIENT_SECRET"
    );
  }

  const base = shopUrl.replace(/\/$/, "");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${base}/webapi/rest/auth`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Shoper auth failed (${res.status}): ${body.slice(0, 200)}`
    );
  }

  const json = await res.json();
  const token = json.access_token ?? json.token;

  if (!token) {
    throw new Error("Shoper nie zwrócił access_token.");
  }

  return token;
}

/**
 * fetchOrders(shopUrl, token, sinceDate, page)
 * Pobiera stronę zamówień od daty sinceDate (ISO string, np. '2024-01-01').
 * Zwraca { items: [], pages, count }.
 */
export async function fetchOrders(shopUrl, token, sinceDate, page = 1) {
  const base = shopUrl.replace(/\/$/, "");

  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    page: String(page),
    ...(sinceDate
      ? { "filters[date_add][gte]": sinceDate }
      : {}),
    "sort[date_add]": "ASC",
  });

  const res = await fetch(`${base}/webapi/rest/orders?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Shoper orders fetch failed (${res.status}): ${body.slice(0, 200)}`
    );
  }

  const json = await res.json();

  // Shoper zwraca { count, pages, list: [...] } lub { data: [...] }
  const list = json.list ?? json.data ?? [];
  const pages = json.pages ?? 1;
  const count = json.count ?? list.length;

  // Normalizuj każde zamówienie do naszego formatu
  const items = list.map(normalizeShoperOrder);

  return { items, pages, count };
}

/**
 * Normalizuje zamówienie Shoper do płaskiej struktury.
 */
function normalizeShoperOrder(order) {
  // Shoper: order_id, email, add_date, total_price, order_products[]
  const products = (order.order_products ?? order.products ?? []).map((p) => ({
    name: p.name ?? p.product_name ?? "",
    qty: Number(p.quantity ?? p.qty ?? 1),
    price: parseFloat(p.price ?? p.unit_price ?? 0),
  }));

  return {
    order_id: String(order.order_id ?? order.id ?? ""),
    email: (order.email ?? order.client_email ?? "").toLowerCase().trim(),
    date: (order.add_date ?? order.date_add ?? order.created_at ?? "").slice(0, 10),
    sum: parseFloat(order.total_price ?? order.total ?? order.sum ?? 0),
    products,
  };
}

/**
 * fetchNewOrdersSince(shopUrl, token, sinceDate)
 * Paginuje przez wszystkie strony i zwraca flat array zamówień.
 */
export async function fetchNewOrdersSince(
  shopUrl = process.env.SHOPER_URL,
  token,
  sinceDate
) {
  const allOrders = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const { items, pages } = await fetchOrders(shopUrl, token, sinceDate, page);
    allOrders.push(...items);

    if (page >= pages || items.length === 0) break;
    page++;

    // Małe opóźnienie żeby nie przeciążyć Shoper API (rate limit ~2 req/s)
    await new Promise((r) => setTimeout(r, 200));
  }

  return allOrders;
}
