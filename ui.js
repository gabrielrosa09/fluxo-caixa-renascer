// ui.js – Notificações da interface, no lugar do alert() do navegador.
//
// Uso:
//   UI.ok('Venda registrada!');
//   UI.erro('Erro ao salvar. Verifique a conexão.');
//   UI.aviso('Preencha o produto e o preço');
//   UI.info('Chave PIX: 11999999999', { duracao: 10000 });
//
// Opções por chamada: { tipo, titulo, duracao }
//   titulo: null tira o título, string troca o padrão do tipo
//   duracao: ms, ou 0 para ficar até clicarem no ✕
//
// Ajuste global (antes ou depois de carregar, vale na próxima notificação):
//   UI.config.posicao = 'baixo';   // 'topo' | 'baixo'
//   UI.config.duracao = 5000;
//   UI.config.maximo  = 5;

const UI = (function () {
  const config = {
    posicao: 'topo',      // 'topo' ou 'baixo'
    duracao: 3200,        // padrão de ok / aviso / info
    duracaoErro: 5000,    // erros ficam mais tempo
    maximo: 3             // além disso, o mais antigo sai
  };

  const TIPOS = {
    ok: {
      titulo: 'Pronto',
      icone: '<path d="M20 6 9 17l-5-5"/>'
    },
    erro: {
      titulo: 'Algo deu errado',
      icone: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'
    },
    aviso: {
      titulo: 'Atenção',
      icone: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
    },
    info: {
      titulo: null,
      icone: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
    }
  };

  let caixa = null;
  const vivos = [];

  function container() {
    if (caixa && caixa.isConnected) {
      caixa.className = 'toast-caixa toast-' + config.posicao;
      return caixa;
    }
    caixa = document.createElement('div');
    caixa.className = 'toast-caixa toast-' + config.posicao;
    caixa.setAttribute('role', 'status');
    caixa.setAttribute('aria-live', 'polite');
    document.body.appendChild(caixa);
    return caixa;
  }

  function sair(toast) {
    if (toast.dataset.saindo) return;
    toast.dataset.saindo = '1';
    clearTimeout(toast._timer);
    const i = vivos.indexOf(toast);
    if (i !== -1) vivos.splice(i, 1);
    toast.classList.add('toast-sai');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    // rede de segurança: se a animação não rodar, remove na mão
    setTimeout(() => toast.remove(), 400);
  }

  function notificar(mensagem, opcoes) {
    const o = opcoes || {};
    const tipo = TIPOS[o.tipo] ? o.tipo : 'info';
    const def = TIPOS[tipo];

    const duracao = o.duracao !== undefined
      ? o.duracao
      : (tipo === 'erro' ? config.duracaoErro : config.duracao);

    const titulo = o.titulo !== undefined ? o.titulo : def.titulo;

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + tipo;
    if (tipo === 'erro' || tipo === 'aviso') toast.setAttribute('role', 'alert');

    toast.innerHTML = `
      <span class="toast-icone">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
             stroke-linejoin="round">${def.icone}</svg>
      </span>
      <div class="toast-corpo">
        ${titulo ? '<div class="toast-titulo"></div>' : ''}
        <div class="toast-msg"></div>
      </div>
      <button type="button" class="toast-fechar" aria-label="Fechar">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
             stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
      <div class="toast-barra"></div>`;

    // textContent, nunca innerHTML: mensagem pode ter nome de produto com < ou &
    if (titulo) toast.querySelector('.toast-titulo').textContent = titulo;
    toast.querySelector('.toast-msg').textContent = String(mensagem == null ? '' : mensagem);

    toast.querySelector('.toast-fechar').addEventListener('click', () => sair(toast));

    const barra = toast.querySelector('.toast-barra');
    if (duracao > 0) {
      barra.style.animationDuration = duracao + 'ms';
      toast._timer = setTimeout(() => sair(toast), duracao);

      // pausa enquanto o dedo/mouse está em cima
      toast.addEventListener('pointerenter', () => {
        clearTimeout(toast._timer);
        barra.style.animationPlayState = 'paused';
      });
      toast.addEventListener('pointerleave', () => {
        barra.style.animationPlayState = 'running';
        toast._timer = setTimeout(() => sair(toast), 1200);
      });
    } else {
      barra.remove();
    }

    container().appendChild(toast);
    vivos.push(toast);
    while (vivos.length > config.maximo) sair(vivos[0]);

    return toast;
  }

  function limpar() {
    vivos.slice().forEach(sair);
  }

  return {
    config,
    notificar,
    limpar,
    ok:    (m, o) => notificar(m, Object.assign({ tipo: 'ok' },    o)),
    erro:  (m, o) => notificar(m, Object.assign({ tipo: 'erro' },  o)),
    aviso: (m, o) => notificar(m, Object.assign({ tipo: 'aviso' }, o)),
    info:  (m, o) => notificar(m, Object.assign({ tipo: 'info' },  o))
  };
})();
