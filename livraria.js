// livraria.js – Painel da Livraria (Fluxo de Caixa)
//
// A Livraria vende livros e também papelaria, presentes e o que mais entrar.
// O que organiza tudo é a categoria, livre, criada na hora do cadastro.
//
// Usa o mesmo Apps Script da Lanchonete. A separação é feita pela coluna
// "caixa" da planilha: esta página só lê e grava linhas com caixa = 'Livraria'.
//
// Estoque vazio na planilha significa "não controla estoque": aparece como
// "—", não tem botões +/- e a venda não tem limite nem dá baixa.

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFKhFsDVgIlWzVDqrVrbgI5phzvLgYwZyZXv4OZoeAaBEHK4DX_ADdcb8mLVor-gdTIA/exec";

const CAIXA = 'Livraria';
const SEM_CATEGORIA = 'Sem categoria';

let pagamentoSelecionado = "Dinheiro";
let produtos = [];
let produtoEditando = null;
let categoriasFechadas = new Set();

// ====== HELPERS ======
const brl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function num(v) {
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function post(payload) {
  return fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
}

function cmp(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

// ====== INIT ======
async function carregarProdutos() {
  const res = await fetch(SCRIPT_URL + '?produtos=1');
  const todos = await res.json();

  produtos = (Array.isArray(todos) ? todos : [])
    .filter(p => String(p.caixa || '').trim().toLowerCase() === CAIXA.toLowerCase())
    .map(p => ({
      linha:     p.linha,
      nome:      String(p.produto || '').trim(),
      categoria: String(p.categoria || '').trim() || SEM_CATEGORIA,
      preco:     num(p.preco) || 0,
      estoque:   num(p.estoque)   // null = não controla estoque
    }))
    .sort((a, b) => cmp(a.nome, b.nome));

  renderAcervo();
  atualizarDatalists();
}

carregarProdutos().then(() => adicionarItem());

// ====== TABS ======
function mostrar(id, el) {
  ['venda', 'acervo', 'dashboard'].forEach(t => {
    document.getElementById(t).style.display = t === id ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (id === 'dashboard') carregarDashboard();
}

// ====== PAGAMENTO ======
function pagar(el) {
  document.querySelectorAll('.pay').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  pagamentoSelecionado = el.innerText;
}

// ====== ITENS DA VENDA ======
function adicionarItem() {
  const div = document.createElement('div');
  div.className = 'row';
  div.style.cssText = 'margin-bottom:10px; align-items:center;';

  const options = produtos.map((p, i) => {
    const esgotado = p.estoque !== null && p.estoque <= 0;
    const sufixo = p.estoque === null ? '' : ` (${p.estoque} un)`;
    return `<option value="${i}" ${esgotado ? 'disabled' : ''}>${esc(p.nome)}${esc(sufixo)}</option>`;
  }).join('');

  div.innerHTML = `
    <select class="produto" onchange="atualizarPreco(this)" style="margin-bottom:0">
      <option value="" disabled selected hidden>Produto</option>
      ${options}
    </select>
    <input class="quantidade" type="number" value="1" min="1" style="margin-bottom:0" />
    <input class="preco-item" disabled style="margin-bottom:0" />
    <div class="remover-btn" onclick="removerItem(this)">✕</div>
  `;

  document.getElementById('itens').appendChild(div);
  div.querySelector('.quantidade').addEventListener('input', calcularTotal);
}

function removerItem(el) {
  el.parentElement.remove();
  calcularTotal();
}

function atualizarPreco(select) {
  const prod = produtos[parseInt(select.value, 10)];
  const row = select.parentElement;
  row.querySelector('.preco-item').value = prod ? prod.preco : '';

  const qtd = row.querySelector('.quantidade');
  if (prod && prod.estoque !== null) {
    qtd.max = prod.estoque;
    if (parseInt(qtd.value, 10) > prod.estoque) qtd.value = prod.estoque;
  } else {
    qtd.removeAttribute('max');
  }
  calcularTotal();
}

function calcularTotal() {
  let total = 0;
  document.querySelectorAll('#itens .row').forEach(row => {
    const q = parseFloat(row.querySelector('.quantidade').value) || 0;
    const p = parseFloat(row.querySelector('.preco-item').value) || 0;
    total += q * p;
  });
  document.getElementById('total').value = total.toFixed(2);
}

// ====== ESTOQUE (listagem e organização) ======
function atualizarDatalists() {
  const categorias = [...new Set(produtos.map(p => p.categoria))].sort(cmp);

  document.getElementById('listaCategorias').innerHTML =
    categorias.map(c => `<option value="${esc(c)}"></option>`).join('');

  const filtro = document.getElementById('filtroCategoria');
  const atual = filtro.value;
  filtro.innerHTML = '<option value="">Todas as categorias</option>' +
    categorias.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if (categorias.includes(atual)) filtro.value = atual;
}

function renderAcervo() {
  atualizarStats();

  const container = document.getElementById('listaAcervo');
  if (!container) return;

  if (!produtos.length) {
    container.innerHTML = '<p class="acervo-vazio">Nenhum produto cadastrado ainda. Use o formulário abaixo.</p>';
    return;
  }

  const busca = document.getElementById('buscaAcervo').value.trim().toLowerCase();
  const catFiltro = document.getElementById('filtroCategoria').value;
  const ordem = document.getElementById('ordemAcervo').value;

  let filtrados = produtos.filter(p => {
    if (catFiltro && p.categoria !== catFiltro) return false;
    if (!busca) return true;
    return p.nome.toLowerCase().includes(busca);
  });

  filtrados = filtrados.sort((a, b) => {
    if (ordem === 'estoque') return (a.estoque ?? 0) - (b.estoque ?? 0) || cmp(a.nome, b.nome);
    if (ordem === 'preco')   return b.preco - a.preco || cmp(a.nome, b.nome);
    return cmp(a.nome, b.nome);
  });

  if (!filtrados.length) {
    container.innerHTML = '<p class="acervo-vazio">Nenhum produto encontrado com esses filtros.</p>';
    return;
  }

  // agrupa por categoria
  const grupos = new Map();
  filtrados.forEach(p => {
    if (!grupos.has(p.categoria)) grupos.set(p.categoria, []);
    grupos.get(p.categoria).push(p);
  });

  const categoriasOrdenadas = [...grupos.keys()].sort((a, b) => {
    if (a === SEM_CATEGORIA) return 1;
    if (b === SEM_CATEGORIA) return -1;
    return cmp(a, b);
  });

  container.innerHTML = categoriasOrdenadas.map(cat => {
    const itens = grupos.get(cat);
    const fechada = categoriasFechadas.has(cat);
    const controlados = itens.filter(p => p.estoque !== null);
    const unidades = controlados.reduce((s, p) => s + p.estoque, 0);

    return `
      <div class="acervo-grupo">
        <div class="acervo-grupo-head ${fechada ? 'fechada' : ''}" onclick="toggleCategoria(${esc(JSON.stringify(cat))})">
          <svg class="acervo-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          <span class="acervo-grupo-nome">${esc(cat)}</span>
          <span class="acervo-grupo-meta">${itens.length} ${itens.length === 1 ? 'produto' : 'produtos'}${controlados.length ? ` · ${unidades} un` : ''}</span>
        </div>
        <div class="acervo-grupo-body" ${fechada ? 'style="display:none"' : ''}>
          ${itens.map(p => linhaProduto(p)).join('')}
        </div>
      </div>`;
  }).join('');
}

function linhaProduto(p) {
  const idx = produtos.indexOf(p);
  const semEstoque = p.estoque !== null && p.estoque <= 0;
  const baixo = p.estoque !== null && p.estoque > 0 && p.estoque <= 2;

  const badge = p.estoque === null
    ? '<span class="estoque-badge estoque-na" title="Sem controle de estoque">—</span>'
    : `<span class="estoque-badge ${semEstoque ? 'estoque-zero' : baixo ? 'estoque-baixo' : ''}">${p.estoque} un</span>`;

  const controles = p.estoque === null ? '' : `
    <div class="estoque-ctrl">
      <button type="button" class="estoque-btn" onclick="ajustarEstoque(${p.linha}, -1)" ${semEstoque ? 'disabled' : ''}>−</button>
      <button type="button" class="estoque-btn" onclick="ajustarEstoque(${p.linha}, 1)">+</button>
    </div>`;

  return `
    <div class="acervo-livro ${semEstoque ? 'livro-esgotado' : ''}" data-linha="${p.linha}">
      <div class="acervo-livro-info">
        <div class="acervo-livro-titulo">${esc(p.nome)}</div>
        <div class="acervo-livro-sub">${brl(p.preco)}</div>
      </div>
      ${badge}
      ${controles}
      <button type="button" class="btn-secondary acervo-editar" onclick="editarProduto(${idx})">Editar</button>
    </div>`;
}

function toggleCategoria(cat) {
  if (categoriasFechadas.has(cat)) categoriasFechadas.delete(cat);
  else categoriasFechadas.add(cat);
  renderAcervo();
}

function atualizarStats() {
  const controlados = produtos.filter(p => p.estoque !== null);
  const unidades = controlados.reduce((s, p) => s + p.estoque, 0);
  const valor = controlados.reduce((s, p) => s + p.preco * p.estoque, 0);
  const zerados = controlados.filter(p => p.estoque <= 0).length;

  document.getElementById('acTitulos').textContent    = produtos.length;
  document.getElementById('acExemplares').textContent = controlados.length ? unidades : '—';
  document.getElementById('acValor').textContent      = controlados.length ? brl(valor) : '—';
  document.getElementById('acSemEstoque').textContent = controlados.length ? zerados : '—';
}

// ====== ESTOQUE (ajuste rápido) ======
async function ajustarEstoque(linha, delta) {
  const prod = produtos.find(p => p.linha === linha);
  if (!prod || prod.estoque === null) return;

  const novo = Math.max(0, prod.estoque + delta);
  if (novo === prod.estoque) return;

  prod.estoque = novo;         // otimista
  renderAcervo();

  try {
    await post({ tipo: 'estoque', linha, estoque: novo, caixa: CAIXA });
  } catch (_) {
    prod.estoque = novo - delta;   // desfaz
    renderAcervo();
    UI.erro('Não foi possível atualizar o estoque. Verifique a conexão.');
  }
}

// ====== CADASTRO / EDIÇÃO ======
function editarProduto(idx) {
  const p = produtos[idx];
  produtoEditando = p;
  document.getElementById('tituloProduto').textContent = 'Editar Produto';
  document.getElementById('prodNome').value      = p.nome;
  document.getElementById('prodCategoria').value = p.categoria === SEM_CATEGORIA ? '' : p.categoria;
  document.getElementById('prodPreco').value     = p.preco;
  document.getElementById('prodEstoque').value   = p.estoque === null ? '' : p.estoque;
  document.getElementById('btnSalvarProduto').textContent = 'Atualizar Produto';
  document.getElementById('btnCancelarProduto').style.display = '';
  document.getElementById('prodNome').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('prodNome').focus();
}

function cancelarEdicaoProduto() {
  produtoEditando = null;
  document.getElementById('tituloProduto').textContent = 'Cadastrar Produto';
  ['prodNome', 'prodCategoria', 'prodPreco', 'prodEstoque'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('btnSalvarProduto').textContent = 'Salvar Produto';
  document.getElementById('btnCancelarProduto').style.display = 'none';
}

function salvarProduto() {
  const nome      = document.getElementById('prodNome').value.trim();
  const categoria = document.getElementById('prodCategoria').value.trim();
  const preco     = document.getElementById('prodPreco').value;
  const estoque   = document.getElementById('prodEstoque').value.trim();   // '' = não controla

  if (!nome || preco === '') { UI.aviso('Preencha o produto e o preço'); return; }

  const btn = document.getElementById('btnSalvarProduto');
  btn.disabled = true;
  btn.textContent = produtoEditando ? 'Atualizando...' : 'Salvando...';

  const base = { produto: nome, preco, caixa: CAIXA, categoria, estoque };
  const payload = produtoEditando
    ? { tipo: 'editarProduto', linha: produtoEditando.linha, ...base }
    : { tipo: 'produto', ...base };

  post(payload).then(() => {
    UI.ok(produtoEditando ? 'Produto atualizado!' : 'Produto salvo!');
    cancelarEdicaoProduto();
    return carregarProdutos();
  }).catch(() => {
    UI.erro('Erro ao salvar. Verifique a conexão.');
  }).finally(() => {
    btn.disabled = false;
    btn.textContent = produtoEditando ? 'Atualizar Produto' : 'Salvar Produto';
  });
}

// ====== VENDA ======
async function registrarVenda() {
  const btn     = event.target;
  const cliente = document.getElementById('cliente').value.trim();

  if (!cliente) { UI.aviso('Preencha o nome da pessoa'); return; }

  const itens = [];      // para a planilha
  const baixas = [];     // {linha, estoque} para dar baixa depois
  let valido = true;
  let erroEstoque = '';

  document.querySelectorAll('#itens .row').forEach(row => {
    const sel  = row.querySelector('.produto');
    const prod = produtos[parseInt(sel.value, 10)];
    const quantidade = parseInt(row.querySelector('.quantidade').value, 10);
    const preco = row.querySelector('.preco-item').value;

    if (!prod || !quantidade || quantidade < 1 || !preco) { valido = false; return; }

    if (prod.estoque !== null && quantidade > prod.estoque) {
      erroEstoque = `"${prod.nome}" tem só ${prod.estoque} em estoque.`;
      valido = false;
      return;
    }

    itens.push({ produto: prod.nome, quantidade: String(quantidade), preco: String(preco) });
    if (prod.estoque !== null) {
      baixas.push({ linha: prod.linha, estoque: prod.estoque - quantidade });
    }
  });

  if (erroEstoque)              { UI.aviso(erroEstoque); return; }
  if (!valido || !itens.length) { UI.aviso('Complete todos os itens da venda'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Registrando...';

  try {
    await post({
      tipo: 'venda',
      cliente,
      itens: JSON.stringify(itens),
      total: document.getElementById('total').value,
      pagamento: pagamentoSelecionado,
      caixa: CAIXA,
      data: new Date().toLocaleString('pt-BR')
    });

    // baixa de estoque, uma por vez (evita escrita concorrente na planilha)
    for (const b of baixas) {
      await post({ tipo: 'estoque', linha: b.linha, estoque: b.estoque, caixa: CAIXA });
    }

    UI.ok('Venda registrada!');
    document.getElementById('cliente').value = '';
    document.getElementById('itens').innerHTML = '';
    document.getElementById('total').value = '';
    await carregarProdutos();
    adicionarItem();
  } catch (e) {
    console.error(e);
    UI.erro('Erro ao registrar a venda. Verifique a conexão.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Registrar Venda';
  }
}

// ====== DASHBOARD ======
async function carregarDashboard() {
  document.getElementById('dashTotal').textContent = '—';
  document.getElementById('dashPendente').textContent = '—';
  document.getElementById('dashProdutos').innerHTML = '<p style="color:var(--muted)">Carregando...</p>';
  document.getElementById('dashPendentes').innerHTML = '<p style="color:var(--muted)">Carregando...</p>';

  const res = await fetch(SCRIPT_URL + '?vendas=1');
  const todas = await res.json();

  // só as vendas da Livraria
  const vendas = (Array.isArray(todas) ? todas : [])
    .filter(v => String(v.caixa || '').trim().toLowerCase() === CAIXA.toLowerCase());

  let totalGeral = 0;
  let totalPendente = 0;
  const contagem = {};
  const pendentes = [];
  const porPagamento = { Dinheiro: 0, PIX: 0, 'Cartão': 0 };

  vendas.forEach(v => {
    const valor  = num(v.total) || 0;
    const status = String(v.status || '').trim().toUpperCase();

    totalGeral += valor;
    if (status === 'PENDENTE') {
      totalPendente += valor;
      pendentes.push({ cliente: v.cliente, valor });
    }

    const pag = String(v.pagamento || '').trim();
    if (pag in porPagamento) porPagamento[pag] += valor;

    let itens = [];
    try { itens = JSON.parse(v.itens || '[]'); } catch (_) {}
    itens.forEach(item => {
      const nome = item.produto || '';
      const qty  = parseInt(item.quantidade || 1, 10) || 0;
      contagem[nome] = (contagem[nome] || 0) + qty;
    });
  });

  document.getElementById('dashTotal').textContent    = brl(totalGeral);
  document.getElementById('dashPendente').textContent = brl(totalPendente);

  // resumo (aparece só no PDF)
  document.getElementById('printVendas').textContent   = vendas.length;
  document.getElementById('printTicket').textContent   = brl(vendas.length ? totalGeral / vendas.length : 0);
  document.getElementById('printDinheiro').textContent = brl(porPagamento.Dinheiro);
  document.getElementById('printPix').textContent      = brl(porPagamento.PIX);
  document.getElementById('printCartao').textContent   = brl(porPagamento['Cartão']);
  document.getElementById('printPendCount').textContent = pendentes.length ? `(${pendentes.length})` : '';

  const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  const maxQty  = ranking[0]?.[1] || 1;
  document.getElementById('dashProdutos').innerHTML = ranking.length === 0
    ? '<p style="color:var(--muted)">Nenhum dado</p>'
    : ranking.map(([nome, qty]) => `
        <div class="dash-produto-row">
          <div class="dash-produto-nome">${esc(nome)}</div>
          <div class="dash-barra-wrap">
            <div class="dash-barra" style="width:${Math.round((qty / maxQty) * 100)}%"></div>
          </div>
          <div class="dash-produto-qty">${qty}x</div>
        </div>
      `).join('');

  document.getElementById('dashPendentes').innerHTML = pendentes.length === 0
    ? '<p style="color:var(--muted)">Nenhum pendente.</p>'
    : pendentes.map(p => `
        <div class="dash-pendente-row">
          <span class="dash-pendente-nome">${esc(p.cliente)}</span>
          <span class="dash-pendente-valor">${brl(p.valor)}</span>
        </div>
      `).join('');
}

function baixarDashboardPDF() {
  const agora = new Date();
  document.getElementById('printData').textContent =
    agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ' · ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  window.print();
}
