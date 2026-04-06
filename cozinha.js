// cozinha.js – Tela da cozinha (tempo real)

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
//  FIREBASE – escuta pedidos em tempo real
// ================================================================
function iniciarCozinha() {
  if (firebaseConfig.apiKey === "COLE_SUA_API_KEY") {
    document.getElementById('pedidos-container').innerHTML = `
      <div class="cozinha-vazia" style="grid-column:1/-1">
        <span class="big-emoji">⚙️</span>
        <p>Firebase não configurado</p>
        <small>Edite o arquivo firebase-config.js</small>
      </div>`;
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const db  = firebase.database();
  const ref = db.ref('pedidos');

  ref.on('value', snapshot => {
    renderizarPedidos(snapshot.val());
  });
}

// ================================================================
//  RENDERIZAR PEDIDOS
// ================================================================
function renderizarPedidos(data) {
  const container = document.getElementById('pedidos-container');

  if (!data) {
    container.innerHTML = estadoVazio();
    atualizarBadge(0);
    return;
  }

  const pedidos = Object.values(data)
    .filter(p => p.status === 'em_preparo')
    .sort((a, b) => a.timestamp - b.timestamp); // mais antigo primeiro

  atualizarBadge(pedidos.length);

  if (pedidos.length === 0) {
    container.innerHTML = estadoVazio();
    return;
  }

  // Atualiza somente os cards novos / removidos (evita piscar)
  const idsAtuais   = new Set(pedidos.map(p => p.pedidoId));
  const cardsAtuais = container.querySelectorAll('[data-pedido-id]');

  // Remove cards que saíram
  cardsAtuais.forEach(card => {
    if (!idsAtuais.has(card.dataset.pedidoId)) card.remove();
  });

  // Se ficou vazio após remoções
  if (container.children.length === 0 && pedidos.length === 0) {
    container.innerHTML = estadoVazio();
    return;
  }

  // Remove estado vazio se houver
  const vazio = container.querySelector('.cozinha-vazia');
  if (vazio) vazio.remove();

  // Adiciona cards novos
  const idsExistentes = new Set(
    [...container.querySelectorAll('[data-pedido-id]')].map(c => c.dataset.pedidoId)
  );

  pedidos.forEach(p => {
    if (idsExistentes.has(p.pedidoId)) return; // já existe, não duplica

    const num  = p.pedidoId.replace('PED-', '').slice(-4);
    const hora = new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.className = 'pedido-cozinha';
    div.dataset.pedidoId = p.pedidoId;
    div.innerHTML = `
      <div class="pedido-num-hora">Pedido #${num} · ${hora}</div>
      <div class="pedido-cliente">${p.cliente}</div>
      <div class="pedido-itens">
        ${p.itens.map(i => `• ${i.qty}x ${i.nome}`).join('<br>')}
      </div>
      <div class="pedido-footer">
        <div>
          <span class="badge-pagamento">${p.pagamento}</span>
          <span class="pedido-meta" style="margin-left:8px">R$ ${parseFloat(p.total).toFixed(2).replace('.', ',')}</span>
        </div>
        <button class="btn-pronto" onclick="marcarPronto('${p.pedidoId}', this)">
          ✅ PRONTO
        </button>
      </div>
    `;

    // Insere na posição correta (mantém ordem por timestamp)
    const cards = [...container.querySelectorAll('[data-pedido-id]')];
    const proximoCard = cards.find(c => {
      const ts = parseInt(c.dataset.pedidoId.replace('PED-', ''));
      return ts > p.timestamp;
    });

    if (proximoCard) container.insertBefore(div, proximoCard);
    else container.appendChild(div);
  });
}

// ================================================================
//  MARCAR COMO PRONTO
// ================================================================
async function marcarPronto(pedidoId, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const db = firebase.database();
    await db.ref('pedidos/' + pedidoId + '/status').set('pronto');
    // O listener remove automaticamente da tela
  } catch (e) {
    console.error(e);
    alert('Erro ao marcar pedido. Tente novamente.');
    btn.disabled = false;
    btn.innerHTML = '✅ PRONTO';
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
      <span class="big-emoji">😌</span>
      <p>Nenhum pedido no momento</p>
      <small>Os pedidos aparecerão aqui automaticamente</small>
    </div>`;
}
