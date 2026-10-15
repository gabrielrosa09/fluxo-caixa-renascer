/*** ===================================================================
 *   Renascer – Apps Script (Lanchonete + Livraria)
 *
 *   Aba "Produtos"
 *     A tipo | B produto | C preco | D caixa | E data
 *     F autor | G categoria | H estoque        <-- novas, usadas pela Livraria
 *
 *   A coluna F (autor) ficou sem uso: a Livraria vende de tudo, não só livros,
 *   então o que organiza é a categoria. A coluna fica aí, vazia, inofensiva.
 *
 *   Estoque vazio = não controla estoque. Veja _estoqueVal().
 *
 *   Aba "Vendas"
 *     A tipo | B cliente | C itens | D total | E pagamento
 *     F caixa | G data | H status
 *
 *   A separação entre Lanchonete e Livraria é a coluna "caixa".
 *   Cada página do front filtra por ela.
 * =================================================================== ***/

/**
 * Converte para número antes de gravar. As colunas de preço e total são
 * formatadas como moeda na planilha e recusam texto: "2.99" vira 2.99.
 * Aceita tanto 2.99 quanto 2,99 e 1.234,56.
 */
function _numero(v) {
  if (v === undefined || v === null) return "";
  var s = String(v).trim();
  if (s === "") return "";
  if (s.indexOf(",") !== -1) s = s.replace(/\./g, "").replace(",", ".");   // 1.234,56 -> 1234.56
  var n = Number(s);
  return isNaN(n) ? v : n;
}

/**
 * Estoque: "" significa "nao controla estoque" - o produto aparece como "-",
 * sem botoes +/-, e a venda nao tem limite nem da baixa.
 * Qualquer outro valor vira numero.
 */
function _estoqueVal(v) {
  if (v === undefined || v === null || String(v).trim() === "") return "";
  return Number(v) || 0;
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (data.tipo === "produto") {
    ss.getSheetByName("Produtos").appendRow([
      data.tipo,
      data.produto,
      _numero(data.preco),
      data.caixa,
      new Date(),
      data.autor || "",            // coluna F, sem uso hoje
      data.categoria || "",
      _estoqueVal(data.estoque)
    ]);
  }

  if (data.tipo === "editarProduto") {
    const sheet = ss.getSheetByName("Produtos");
    sheet.getRange(data.linha, 2, 1, 3).setValues([[data.produto, _numero(data.preco), data.caixa]]);

    // Campos da Livraria (F, G, H). Só grava se vieram no pedido, assim a
    // tela de Produto da Lanchonete não apaga o que já estava nessas colunas.
    if (data.autor !== undefined || data.categoria !== undefined || data.estoque !== undefined) {
      sheet.getRange(data.linha, 6, 1, 3).setValues([[
        data.autor || "",            // coluna F, sem uso hoje
        data.categoria || "",
        _estoqueVal(data.estoque)
      ]]);
    }
  }

  // Livraria: ajuste de estoque. Usado pelos botões +/- do acervo e pela baixa
  // automática depois de cada venda. Recebe o valor final, não o delta.
  if (data.tipo === "estoque") {
    ss.getSheetByName("Produtos")
      .getRange(Number(data.linha), 8)
      .setValue(Number(data.estoque) || 0);
  }

  if (data.tipo === "venda") {
    ss.getSheetByName("Vendas").appendRow([
      data.tipo,
      data.cliente,
      data.itens,
      _numero(data.total),
      data.pagamento,
      data.caixa,
      data.data,
      "PENDENTE"
    ]);
  }

  if (data.tipo === "finalizar") {
    const sheet = ss.getSheetByName("Vendas");
    sheet.getRange(data.linha, 8).setValue("FINALIZADO");
  }

  return ContentService.createTextOutput("OK");
}

function doGet(e) {
  if (e.parameter.produtos) {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('Produtos');
    const data = sheet.getDataRange().getValues().slice(1);
    const produtos = data.map((r, i) => ({
      linha:     i + 2,
      produto:   r[1],
      preco:     r[2],
      caixa:     r[3],
      autor:     r[5] || "",
      categoria: r[6] || "",
      estoque:   (r[7] === "" || r[7] === null || r[7] === undefined) ? "" : (Number(r[7]) || 0)
    }));
    return ContentService
      .createTextOutput(JSON.stringify(produtos))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter.vendas) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Vendas');
    // slice(1) descarta a linha de cabeçalho, que antes vinha como se fosse uma venda
    const rows = sheet.getDataRange().getValues().slice(1).map(row => ({
      tipo:      row[0],
      cliente:   row[1],
      itens:     row[2],
      total:     row[3],
      pagamento: row[4],
      caixa:     row[5],
      data:      row[6],
      status:    row[7]
    }));
    return ContentService
      .createTextOutput(JSON.stringify(rows))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter.pedidos) {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('Vendas');
    const data = sheet.getDataRange().getValues().slice(1);
    const pedidosPendentes = data
      .map((r, i) => ({
        linha:     i + 2,
        cliente:   r[1],
        itens:     r[2],
        total:     r[3],
        pagamento: r[4],
        caixa:     r[5],
        data:      r[6],
        status:    r[7]
      }))
      .filter(p => p.status === 'PENDENTE');
    return ContentService
      .createTextOutput(JSON.stringify(pedidosPendentes))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput("OK");
}

/*** ===================== UTILITÁRIOS (rodar no editor) ===================== ***/

/** Rode UMA VEZ: escreve os cabeçalhos autor / categoria / estoque em F1, G1 e H1. */
function livrariaSetup() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Produtos');
  sheet.getRange(1, 6, 1, 3).setValues([['autor', 'categoria', 'estoque']]);
  Logger.log('Cabeçalhos: ' + sheet.getRange(1, 1, 1, 8).getValues()[0].join(' | '));
}

/** Teste rápido: loga quantos livros da Livraria existem. */
function livrariaTeste() {
  const todos = JSON.parse(doGet({ parameter: { produtos: '1' } }).getContent());
  const livros = todos.filter(p => String(p.caixa).trim().toLowerCase() === 'livraria');
  Logger.log('Produtos no total: ' + todos.length + ' | da Livraria: ' + livros.length);
  Logger.log(JSON.stringify(livros, null, 2));
}

/**
 * Conserta linhas antigas: reescreve a coluna de preço (C) dos Produtos e o
 * total (D) das Vendas como número, para as células que ficaram como texto.
 * Rode uma vez pelo editor.
 */
function corrigirPrecos() {
  const ss = SpreadsheetApp.getActive();
  let trocados = 0;

  const prod = ss.getSheetByName('Produtos');
  if (prod.getLastRow() >= 2) {
    const r = prod.getRange(2, 3, prod.getLastRow() - 1, 1);
    const vals = r.getValues().map(function (linha) {
      if (typeof linha[0] === 'string' && linha[0].trim() !== '') { trocados++; return [_numero(linha[0])]; }
      return linha;
    });
    r.setValues(vals);
  }

  const vend = ss.getSheetByName('Vendas');
  if (vend.getLastRow() >= 2) {
    const r = vend.getRange(2, 4, vend.getLastRow() - 1, 1);
    const vals = r.getValues().map(function (linha) {
      if (typeof linha[0] === 'string' && linha[0].trim() !== '') { trocados++; return [_numero(linha[0])]; }
      return linha;
    });
    r.setValues(vals);
  }

  Logger.log('Células convertidas de texto para número: ' + trocados);
}
