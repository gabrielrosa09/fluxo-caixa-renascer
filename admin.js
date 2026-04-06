// admin.js – Painel administrativo (Fluxo de Caixa)

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyfA8eNScybrenSmeLu9Fr6WuRtTXVJ6C5bTOkXlWT7dtsNVmsgeVTIk7LOpDJn596v2A/exec";

let pagamentoSelecionado = "Dinheiro";
let produtosCadastrados = [];

// ====== INIT ======
async function carregarProdutos() {
  const res = await fetch(SCRIPT_URL + '?produtos=1');
  produtosCadastrados = await res.json();
}

carregarProdutos().then(() => adicionarItem());

// ====== TABS ======
function mostrar(id, el) {
  ['venda', 'produto', 'pedidos'].forEach(t => {
    document.getElementById(t).style.display = t === id ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (id === 'pedidos') carregarPedidos();
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
function salvarProduto() {
  const nome  = document.getElementById('produtoNome').value.trim();
  const preco = document.getElementById('preco').value;
  const caixa = document.getElementById('caixaProduto').value;

  if (!nome || !preco) { alert('Preencha o nome e o preço'); return; }

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ tipo: 'produto', produto: nome, preco, caixa })
  }).then(() => {
    alert('Produto salvo!');
    document.getElementById('produtoNome').value = '';
    document.getElementById('preco').value = '';
    carregarProdutos();
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
    container.innerHTML = '<p style="color:var(--muted)">Nenhum pedido pendente 🙏</p>';
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
      <button onclick="finalizarPedido(${p.linha}, this)">✅ Finalizar</button>
    `;
    container.appendChild(div);
  });
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
    btn.innerHTML = '✅ Finalizar';
  });
}
