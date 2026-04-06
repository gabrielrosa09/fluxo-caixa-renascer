// cardapio.js – Página do cliente

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyfA8eNScybrenSmeLu9Fr6WuRtTXVJ6C5bTOkXlWT7dtsNVmsgeVTIk7LOpDJn596v2A/exec";

// Guarda o listener do Firebase para poder desligar depois
let statusListener = null;
let pedidoAtual    = null;
let pagamentoSelecionado = "📱 PIX";
let carrinho = {}; // { "nome": { nome, preco, qty } }

// ================================================================
//  INICIALIZAÇÃO
// ================================================================
(function init() {
  // Verifica se Firebase está configurado
  if (firebaseConfig.apiKey === "COLE_SUA_API_KEY") {
    document.body.innerHTML = `
      <div style="padding:40px 20px; text-align:center; font-family:system-ui">
        <div style="font-size:48px; margin-bottom:16px">⚙️</div>
        <h2 style="margin-bottom:8px">Configure o Firebase</h2>
        <p style="color:#6b7280; max-width:320px; margin:auto">
          Edite o arquivo <strong>firebase-config.js</strong> com as
          credenciais do seu projeto Firebase.
        </p>
      </div>`;
    return;
  }

  firebase.initializeApp(firebaseConfig);

  // Se o cliente já tinha um pedido ativo, retoma o acompanhamento
  const pedidoSalvo = localStorage.getItem('pedidoAtivo');
  if (pedidoSalvo) {
    try {
      const dados = JSON.parse(pedidoSalvo);
      pedidoAtual = dados;
      mostrarTelaAguardando(dados);
      iniciarListenerStatus(dados.pedidoId);
      return;
    } catch (_) {
      localStorage.removeItem('pedidoAtivo');
    }
  }

  carregarCardapio();
})();

// ================================================================
//  CARDÁPIO
// ================================================================
async function carregarCardapio() {
  const container = document.getElementById('lista-produtos');
  container.innerHTML = `
    <p style="color:var(--muted);text-align:center;padding:50px 20px">
      <span style="font-size:32px;display:block;margin-bottom:8px">⏳</span>
      Carregando cardápio...
    </p>`;

  try {
    const res = await fetch(SCRIPT_URL + '?produtos=1');
    const produtos = await res.json();

    if (!Array.isArray(produtos) || produtos.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">Cardápio vazio por enquanto 🙏</p>';
      return;
    }

    container.innerHTML = '';
    produtos.forEach(p => {
      const card = document.createElement('div');
      card.className = 'produto-card';
      card.dataset.nome  = p.produto;
      card.dataset.preco = p.preco;
      card.innerHTML = `
        <div class="produto-info">
          <div class="produto-nome">${p.produto}</div>
          <div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="mudarQty(this, -1)">−</button>
          <span class="qty-num">0</span>
          <button class="qty-btn" onclick="mudarQty(this, 1)">+</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (_) {
    container.innerHTML = `
      <p style="color:#ef4444;text-align:center;padding:40px">
        Erro ao carregar cardápio.<br>
        <button onclick="carregarCardapio()" style="margin-top:12px;width:auto;padding:10px 20px;font-size:14px">
          Tentar novamente
        </button>
      </p>`;
  }
}

// ================================================================
//  CARRINHO
// ================================================================
function mudarQty(btn, delta) {
  const ctrl = btn.parentElement;
  const card = ctrl.closest('.produto-card');
  const nome  = card.dataset.nome;
  const preco = parseFloat(card.dataset.preco);
  const numEl = ctrl.querySelector('.qty-num');

  let qty = parseInt(numEl.textContent) + delta;
  if (qty < 0) qty = 0;
  numEl.textContent = qty;

  if (qty === 0) delete carrinho[nome];
  else carrinho[nome] = { nome, preco, qty };

  atualizarCartBar();
}

function atualizarCartBar() {
  const itens   = Object.values(carrinho);
  const totalQty = itens.reduce((s, i) => s + i.qty, 0);
  const totalVal = itens.reduce((s, i) => s + i.qty * i.preco, 0);
  const bar = document.getElementById('cart-bar');

  if (totalQty === 0) { bar.classList.add('hidden'); return; }

  bar.classList.remove('hidden');
  document.getElementById('cart-count').textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'itens'}`;
  document.getElementById('cart-total').textContent  = `R$ ${totalVal.toFixed(2).replace('.', ',')}`;
}

function getTotal() {
  return Object.values(carrinho).reduce((s, i) => s + i.qty * i.preco, 0);
}

// ================================================================
//  NAVEGAÇÃO ENTRE TELAS
// ================================================================
function mostrarTela(id) {
  ['tela-menu', 'tela-checkout', 'tela-pix', 'tela-aguardando'].forEach(t => {
    document.getElementById(t).classList.toggle('hidden', t !== id);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function irParaCheckout() {
  const itens = Object.values(carrinho);
  if (itens.length === 0) return;

  document.getElementById('resumo-carrinho').innerHTML = itens.map(i => `
    <div class="order-item">
      <span>${i.qty}x ${i.nome}</span>
      <span>R$ ${(i.qty * i.preco).toFixed(2).replace('.', ',')}</span>
    </div>
  `).join('');

  document.getElementById('checkout-total').innerHTML = `
    <span>Total</span>
    <span>R$ ${getTotal().toFixed(2).replace('.', ',')}</span>
  `;

  mostrarTela('tela-checkout');
}

function voltarMenu() {
  mostrarTela('tela-menu');
}

function selecionarPagamento(el) {
  document.querySelectorAll('.pay').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  pagamentoSelecionado = el.textContent.trim();
}

// ================================================================
//  CONFIRMAR PEDIDO
// ================================================================
function confirmarPedido() {
  const nome = document.getElementById('nome-cliente').value.trim();
  const input = document.getElementById('nome-cliente');

  if (!nome) {
    input.style.borderColor = 'var(--danger)';
    input.focus();
    return;
  }
  input.style.borderColor = '';

  const itens = Object.values(carrinho);
  const total = getTotal();
  const pedidoId = 'PED-' + Date.now();

  pedidoAtual = {
    pedidoId,
    cliente: nome,
    itens: itens.map(i => ({ nome: i.nome, qty: i.qty, preco: i.preco })),
    total: total.toFixed(2),
    pagamento: pagamentoSelecionado,
    timestamp: Date.now()
  };

  if (pagamentoSelecionado.includes('PIX')) {
    // Mostra tela PIX antes de enviar
    document.getElementById('pix-display-key').textContent    = PIX_KEY;
    document.getElementById('pix-display-amount').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    document.getElementById('pix-display-name').textContent   = PIX_NAME;
    mostrarTela('tela-pix');
  } else {
    // Dinheiro / Cartão: envia direto
    enviarPedido(pedidoAtual);
  }
}

function copiarPix() {
  navigator.clipboard.writeText(PIX_KEY)
    .then(() => alert('Chave PIX copiada! ✓'))
    .catch(() => alert('Chave PIX: ' + PIX_KEY));
}

function confirmarPagamento() {
  enviarPedido(pedidoAtual);
}

// ================================================================
//  ENVIAR PEDIDO → FIREBASE
// ================================================================
async function enviarPedido(pedido) {
  try {
    const db = firebase.database();
    await db.ref('pedidos/' + pedido.pedidoId).set({
      ...pedido,
      status: 'em_preparo'
    });

    // Salva localmente para retomar se o cliente fechar a página
    localStorage.setItem('pedidoAtivo', JSON.stringify(pedido));

    mostrarTelaAguardando(pedido);
    iniciarListenerStatus(pedido.pedidoId);

  } catch (e) {
    console.error(e);
    alert('Erro ao enviar pedido. Verifique sua conexão e tente novamente.');
  }
}

// ================================================================
//  TELA AGUARDANDO
// ================================================================
function mostrarTelaAguardando(pedido) {
  const num = pedido.pedidoId.replace('PED-', '').slice(-4);

  document.getElementById('status-title').textContent = `Olá, ${pedido.cliente}! 👋`;
  document.getElementById('status-num').textContent   = `#${num}`;

  document.getElementById('status-itens').innerHTML = pedido.itens.map(i => `
    <div class="order-item">
      <span>${i.qty}x ${i.nome}</span>
      <span>R$ ${(i.qty * i.preco).toFixed(2).replace('.', ',')}</span>
    </div>
  `).join('');

  document.getElementById('status-total').innerHTML = `
    <span>Total</span>
    <span>R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}</span>
  `;

  document.getElementById('estado-preparo').classList.remove('hidden');
  document.getElementById('estado-pronto').classList.add('hidden');

  mostrarTela('tela-aguardando');
}

// ================================================================
//  LISTENER EM TEMPO REAL DO STATUS
// ================================================================
function iniciarListenerStatus(pedidoId) {
  if (statusListener) statusListener.off();

  const db  = firebase.database();
  const ref = db.ref('pedidos/' + pedidoId + '/status');

  statusListener = ref;
  ref.on('value', snapshot => {
    if (snapshot.val() === 'pronto') mostrarPronto();
  });
}

function mostrarPronto() {
  document.getElementById('estado-preparo').classList.add('hidden');
  document.getElementById('estado-pronto').classList.remove('hidden');

  // Vibra no celular (se suportado)
  if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

  // Limpa localStorage
  localStorage.removeItem('pedidoAtivo');

  if (statusListener) {
    statusListener.off();
    statusListener = null;
  }
}

// ================================================================
//  NOVO PEDIDO
// ================================================================
function novoPedido() {
  carrinho = {};
  pedidoAtual = null;
  document.getElementById('nome-cliente').value = '';

  // Zera quantidades no cardápio
  document.querySelectorAll('.qty-num').forEach(el => el.textContent = '0');

  atualizarCartBar();
  mostrarTela('tela-menu');
}
