// tema.js – identidade visual do sistema.
//
// Troque a constante TEMA abaixo e o sistema inteiro muda: cores, fontes,
// logo, nome e rodapé. Nada da identidade antiga é apagado, só sai de cena.
//
//   TEMA = 'farol'      -> Seminário Farol (amarelo, grafite, farol)
//   TEMA = 'renascer'   -> Retiro Renascer (verde, folha)
//
// Este arquivo é carregado no <head>, antes do CSS, para o tema já valer na
// primeira pintura da tela. Sem ele a página cai no tema Renascer.

const TEMA = 'farol';

const TEMAS = {
  renascer: {
    nome:   'Renascer',
    logo:   'logo-renascer.svg',
    rodape: 'Sistema de Caixa – Renascer',
    pix:    'Lanchonete Renascer'
  },
  farol: {
    nome:   'Farol',
    logo:   'logo-farol.svg',
    rodape: 'Farol · Seminário de Vida no Espírito Santo',
    pix:    'Lanchonete Farol'
  }
};

const MARCA = TEMAS[TEMA] || TEMAS.renascer;

// antes de qualquer pintura, senão o tema errado pisca
document.documentElement.dataset.tema = TEMAS[TEMA] ? TEMA : 'renascer';

// Preenche tudo que leva a marca:
//   <span data-marca="nome">    nome curto
//   <span data-marca="rodape">  linha do rodapé
//   <img  data-marca="logo">    src e alt do logo
function aplicarMarca() {
  document.querySelectorAll('[data-marca]').forEach(el => {
    const campo = el.dataset.marca;
    if (campo === 'logo') {
      el.setAttribute('src', MARCA.logo);
      el.setAttribute('alt', MARCA.nome);
      return;
    }
    if (MARCA[campo] !== undefined) el.textContent = MARCA[campo];
  });

  document.title = document.title.replace(/Renascer|Farol/g, MARCA.nome);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', aplicarMarca);
} else {
  aplicarMarca();
}
