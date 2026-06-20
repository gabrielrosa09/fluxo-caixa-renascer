// admin.js – Painel administrativo (Fluxo de Caixa)

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby-oDWFpUAn8zRLml9fxwgvfY1YWLfjmtWvt3b-YKDnBOL7-7vBw_TDNj9x3lTpwCRcuQ/exec";

let pagamentoSelecionado = "Dinheiro";
let produtosCadastrados = [];
let produtoEditando = null;

// ====== INIT ======
async function carregarProdutos() {
  const res = await fetch(SCRIPT_URL + '?produtos=1');
  produtosCadastrados = await res.json();
  renderListaProdutos();
}

carregarProdutos().then(() => adicionarItem());

// ====== TABS ======
function mostrar(id, el) {
  ['venda', 'produto', 'pedidos', 'dashboard'].forEach(t => {
    document.getElementById(t).style.display = t === id ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (id === 'pedidos') carregarPedidos();
  if (id === 'dashboard') carregarDashboard();
}

// ====== PAGAMENTO ======
function pagar(el) {
  document.querySelectorAll('.pay').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  pagamentoSelecionado = el.innerText;
}

// ====== ITENS ======
function adicionarItem() {
  const div = document.createElement('div');
  div.className = 'row';
  div.style.cssText = 'margin-bottom:10px; align-items:center;';

  const options = produtosCadastrados.map(p =>
    `<option value="${p.preco}">${p.produto}</option>`
  ).join('');

  div.innerHTML = `
    <select class="produto" onchange="atualizarPreco(this)" style="margin-bottom:0">
      <option value="">Produto</option>
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
  select.parentElement.querySelector('.preco-item').value = select.value;
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

// ====== PRODUTO ======
function renderListaProdutos() {
  const container = document.getElementById('listaProdutos');
  if (!container) return;

  if (!produtosCadastrados.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:14px;margin-bottom:0">Nenhum produto cadastrado ainda.</p>';
    return;
  }

  container.innerHTML = `
    <div style="border-bottom:1.5px solid #f0f0f0; margin-bottom:14px; padding-bottom:4px">
      ${produtosCadastrados.map((p, i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f7f7f7">
          <div>
            <div style="font-weight:700;font-size:15px">${p.produto}</div>
            <div style="font-size:13px;color:var(--muted)">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')} · ${p.caixa || ''}</div>
          </div>
          <button type="button" onclick="editarProduto(${i})" class="btn-secondary" style="width:auto;padding:8px 16px;font-size:13px">Editar</button>
        </div>
      `).join('')}
    </div>`;
}

function editarProduto(idx) {
  const p = produtosCadastrados[idx];
  produtoEditando = p;
  document.getElementById('tituloProduto').textContent = 'Editar Produto';
  document.getElementById('produtoNome').value = p.produto;
  document.getElementById('preco').value = p.preco;
  document.getElementById('caixaProduto').value = p.caixa || 'Lanchonete';
  document.getElementById('btnSalvarProduto').textContent = 'Atualizar Produto';
  document.getElementById('btnCancelarEdicao').style.display = '';
  document.getElementById('produtoNome').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('produtoNome').focus();
}

function cancelarEdicao() {
  produtoEditando = null;
  document.getElementById('tituloProduto').textContent = 'Cadastrar Produto';
  document.getElementById('produtoNome').value = '';
  document.getElementById('preco').value = '';
  document.getElementById('btnSalvarProduto').textContent = 'Salvar Produto';
  document.getElementById('btnCancelarEdicao').style.display = 'none';
}

function salvarProduto() {
  const nome  = document.getElementById('produtoNome').value.trim();
  const preco = document.getElementById('preco').value;
  const caixa = document.getElementById('caixaProduto').value;

  if (!nome || !preco) { alert('Preencha o nome e o preço'); return; }

  const btn = document.getElementById('btnSalvarProduto');
  btn.disabled = true;
  btn.textContent = produtoEditando ? 'Atualizando...' : 'Salvando...';

  const payload = produtoEditando
    ? { tipo: 'editarProduto', linha: produtoEditando.linha, produto: nome, preco, caixa }
    : { tipo: 'produto', produto: nome, preco, caixa };

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(() => {
    alert(produtoEditando ? 'Produto atualizado!' : 'Produto salvo!');
    cancelarEdicao();
    carregarProdutos();
  }).finally(() => {
    btn.disabled = false;
    btn.textContent = produtoEditando ? 'Atualizar Produto' : 'Salvar Produto';
  });
}

// ====== VENDA ======
function registrarVenda() {
  const btn    = event.target;
  const cliente = document.getElementById('cliente').value.trim();
  const caixa   = document.getElementById('caixaVenda').value;

  if (!cliente || !caixa) { alert('Preencha todos os campos'); return; }

  const itens = [];
  let valido = true;

  document.querySelectorAll('#itens .row').forEach(row => {
    const sel      = row.querySelector('.produto');
    const produto  = sel.selectedOptions[0].text;
    const quantidade = row.querySelector('.quantidade').value;
    const preco    = row.querySelector('.preco-item').value;

    if (!sel.value || !quantidade || !preco) { valido = false; return; }
    itens.push({ produto, quantidade, preco });
  });

  if (!valido || itens.length === 0) { alert('Complete todos os produtos'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Registrando...';

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({
      tipo: 'venda',
      cliente,
      itens: JSON.stringify(itens),
      total: document.getElementById('total').value,
      pagamento: pagamentoSelecionado,
      caixa,
      data: new Date().toLocaleString('pt-BR')
    })
  })
  .then(() => {
    alert('Venda registrada!');
    document.getElementById('cliente').value = '';
    document.getElementById('caixaVenda').value = '';
    document.getElementById('itens').innerHTML = '';
    document.getElementById('total').value = '';
    adicionarItem();
  })
  .finally(() => {
    btn.disabled = false;
    btn.innerHTML = 'Registrar Venda';
  });
}

// ====== PEDIDOS ======
async function carregarPedidos() {
  const container = document.getElementById('listaPedidos');
  container.innerHTML = '<p style="color:var(--muted)">Carregando...</p>';

  const res = await fetch(SCRIPT_URL + '?pedidos=1');
  const pedidos = await res.json();

  container.innerHTML = '';

  if (pedidos.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">Nenhum pedido pendente.</p>';
    return;
  }

  pedidos.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.marginBottom = '12px';
    div.innerHTML = `
      <strong>${p.cliente}</strong><br>
      ${JSON.parse(p.itens).map(i => `${i.quantidade}x ${i.produto}`).join('<br>')}
      <br><br>Total: R$ ${p.total}<br><br>
      <button onclick="finalizarPedido(${p.linha}, this)">Finalizar</button>
    `;
    container.appendChild(div);
  });
}

// ====== DASHBOARD ======
async function carregarDashboard() {
  document.getElementById('dashTotal').textContent = '—';
  document.getElementById('dashPendente').textContent = '—';
  document.getElementById('dashProdutos').innerHTML = '<p style="color:var(--muted)">Carregando...</p>';
  document.getElementById('dashPendentes').innerHTML = '<p style="color:var(--muted)">Carregando...</p>';

  const res = await fetch(SCRIPT_URL + '?vendas=1');
  const vendas = await res.json();

  let totalGeral = 0;
  let totalPendente = 0;
  const contagem = {};
  const pendentes = [];

  vendas.forEach(v => {
    const valor  = parseFloat(String(v.total || 0).replace(',', '.')) || 0;
    const status = String(v.status || '').trim().toUpperCase();

    totalGeral += valor;
    if (status === 'PENDENTE') {
      totalPendente += valor;
      pendentes.push({ cliente: v.cliente, valor });
    }

    let itens = [];
    try { itens = JSON.parse(v.itens || '[]'); } catch (_) {}
    itens.forEach(item => {
      const nome = item.produto || '';
      const qty  = parseInt(item.quantidade || 1, 10);
      contagem[nome] = (contagem[nome] || 0) + qty;
    });
  });

  document.getElementById('dashTotal').textContent = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById('dashPendente').textContent = totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  const maxQty  = ranking[0]?.[1] || 1;
  document.getElementById('dashProdutos').innerHTML = ranking.length === 0
    ? '<p style="color:var(--muted)">Nenhum dado</p>'
    : ranking.map(([nome, qty]) => `
        <div class="dash-produto-row">
          <div class="dash-produto-nome">${nome}</div>
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
          <span class="dash-pendente-nome">${p.cliente}</span>
          <span class="dash-pendente-valor">${p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      `).join('');
}

function finalizarPedido(linha, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Finalizando...';

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ tipo: 'finalizar', linha })
  })
  .then(() => carregarPedidos())
  .finally(() => {
    btn.disabled = false;
    btn.innerHTML = 'Finalizar';
  });
}
