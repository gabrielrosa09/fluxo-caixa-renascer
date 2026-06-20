// cozinha.js – Tela da cozinha (polling Google Apps Script)

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzuldXmAt82bzxv0eaN_VZETg1Py4_Wn00FJEeRW-Cm2F8VYCKLeLMZzLQ-4u39-oW07Q/exec";

let pollingInterval = null;

// ================================================================
//  PIN
// ================================================================
function verificarPin() {
  const pin = document.getElementById('pin-input').value;
  if (pin === COZINHA_PIN) {
    document.getElementById('tela-pin').classList.add('hidden');
    document.getElementById('tela-cozinha').classList.remove('hidden');
    iniciarCozinha();
  } else {
    document.getElementById('pin-erro').classList.remove('hidden');
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-input').focus();
  }
}

// ================================================================
//  INICIAR – polling a cada 5s
// ================================================================
function iniciarCozinha() {
  carregarPedidosCozinha();
  pollingInterval = setInterval(carregarPedidosCozinha, 5000);
}

async function carregarPedidosCozinha() {
  try {
    const res     = await fetch(SCRIPT_URL + '?pedidos=1');
    const pedidos = await res.json();
    renderizarPedidos(pedidos);
  } catch (e) {
    console.error('Erro ao carregar pedidos:', e);
  }
}

// ================================================================
//  RENDERIZAR PEDIDOS
// ================================================================
function renderizarPedidos(pedidos) {
  const container = document.getElementById('pedidos-container');

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = estadoVazio();
    atualizarBadge(0);
    return;
  }

  atualizarBadge(pedidos.length);

  const linhasAtuais = new Set(pedidos.map(p => String(p.linha)));
  container.querySelectorAll('[data-linha]').forEach(card => {
    if (!linhasAtuais.has(card.dataset.linha)) card.remove();
  });

  const vazio = container.querySelector('.cozinha-vazia');
  if (vazio) vazio.remove();

  const linhasExistentes = new Set(
    [...container.querySelectorAll('[data-linha]')].map(c => c.dataset.linha)
  );

  pedidos.forEach(p => {
    if (linhasExistentes.has(String(p.linha))) return;

    let itens = [];
    try { itens = JSON.parse(p.itens); } catch (_) {}

    const div = document.createElement('div');
    div.className = 'pedido-cozinha';
    div.dataset.linha = String(p.linha);
    div.innerHTML = `
      <div class="pedido-num-hora">#${p.linha} · ${p.data || ''}</div>
      <div class="pedido-cliente">${p.cliente}</div>
      <div class="pedido-itens">
        ${itens.map(i => `• ${i.quantidade}x ${i.produto}`).join('<br>')}
      </div>
      <div class="pedido-footer">
        <div>
          <span class="badge-pagamento">${p.pagamento}</span>
          <span class="pedido-meta" style="margin-left:8px">R$ ${parseFloat(p.total || 0).toFixed(2).replace('.', ',')}</span>
        </div>
        <button class="btn-pronto" onclick="marcarPronto(${p.linha}, this)">
          PRONTO
        </button>
      </div>
    `;
    container.appendChild(div);
  });

  if (container.children.length === 0) {
    container.innerHTML = estadoVazio();
  }
}

// ================================================================
//  MARCAR COMO PRONTO
// ================================================================
async function marcarPronto(linha, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ tipo: 'finalizar', linha })
    });
    await carregarPedidosCozinha();
  } catch (e) {
    console.error(e);
    alert('Erro ao marcar pedido. Tente novamente.');
    btn.disabled = false;
    btn.innerHTML = 'PRONTO';
  }
}

// ================================================================
//  HELPERS
// ================================================================
function atualizarBadge(count) {
  const badge = document.getElementById('badge-total');
  badge.classList.toggle('hidden', count === 0);
  badge.textContent = count;
  document.title = count > 0 ? `(${count}) Cozinha – Renascer` : 'Cozinha – Renascer';
}

function estadoVazio() {
  return `
    <div class="cozinha-vazia">
      <span class="big-emoji">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
      </span>
      <p>Nenhum pedido no momento</p>
      <small>Os pedidos aparecerão aqui automaticamente</small>
    </div>`;
}
