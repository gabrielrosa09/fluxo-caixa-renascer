# Livraria – passo a passo do Apps Script

O código completo e pronto está em **`apps-script-codigo.gs`** neste repositório.
É o seu `Código.gs` atual com as partes da Livraria já aplicadas.

## O que muda em relação ao seu código atual

Aba **Produtos** ganha 3 colunas no fim (a `autor` acabou sem uso, veja Observações):

```
A tipo | B produto | C preco | D caixa | E data | F autor | G categoria | H estoque
```

| Onde | Mudança |
|---|---|
| `doPost` → `produto` | grava categoria (G) e estoque (H) no `appendRow`. A coluna F (autor) fica vazia |
| `doPost` → `editarProduto` | grava F, G e H — só quando vêm no pedido, pra não apagar nada pela tela da Lanchonete |
| `_estoqueVal()` | estoque vazio é gravado como `""`, não como `0`. Vazio = não controla estoque |
| `_numero()` | preço e total viram **número** antes de gravar. Iam como texto `"2.99"` e a coluna de moeda recusava: *"este valor não corresponde ao tipo de coluna moeda"* |
| `corrigirPrecos()` | utilitário de reparo das linhas antigas que ficaram como texto |
| `doPost` → **novo** `estoque` | grava o estoque de uma linha. Usado pelos botões `+`/`−` e pela baixa após a venda |
| `doGet` → `?produtos=1` | devolve `autor`, `categoria` e `estoque` em cada produto |
| `doGet` → `?vendas=1` | ganhou `.slice(1)` — a linha de cabeçalho vinha como se fosse uma venda e estragava nº de vendas e ticket médio do dashboard |
| `doGet` | `return "OK"` no fim, pra URL sem parâmetro não dar erro |
| novas funções | `livrariaSetup()` e `livrariaTeste()`, para rodar no editor |

A aba **Vendas** não muda em nada.

---

## Passo 1 — Abrir o editor

Planilha → **Extensões** → **Apps Script**.

## Passo 2 — Substituir o código

Selecione tudo no `Código.gs` (`Ctrl+A`) e cole o conteúdo de
`apps-script-codigo.gs`. Salve (`Ctrl+S`).

> Antes disso, guarde uma cópia do código antigo em algum lugar.

## Passo 3 — Criar os cabeçalhos das colunas novas

No seletor de função no topo do editor, escolha **`livrariaSetup`** → **Executar**.
Na primeira execução o Google pede autorização — aceite.

No **Log de execução** deve sair algo como:

```
Cabeçalhos: Tipo | Produto | Preço | Lugar | Data | autor | categoria | estoque
```

Confira na planilha: F1, G1 e H1 agora dizem `autor`, `categoria`, `estoque`.

> Se der erro de range, a aba foi cortada e não tem colunas até H.
> Adicione colunas até a H na mão e rode de novo.

## Passo 4 — Republicar

**Implantar** → **Gerenciar implantações** → ícone de lápis na implantação ativa →
em *Versão* escolha **Nova versão** → **Implantar**.

A URL `/exec` continua a mesma, então nada muda no front.

## Passo 5 — Testar

1. No editor, rode **`livrariaTeste`**. Deve logar `da Livraria: 0` sem erro.
2. Abra a URL do `/exec` com `?produtos=1`. Cada produto agora tem os campos novos:

```json
{"linha":2,"produto":"Salgado","preco":6,"caixa":"Lanchonete",
 "autor":"","categoria":"","estoque":""}
```

3. Abra `livraria.html` → aba **Estoque** → cadastre um produto com categoria,
   preço e estoque. Confira se gravou nas colunas G e H da planilha.
   Cadastre outro deixando o estoque **vazio** e veja se ele aparece como `—`.
4. Clique `+` e `−` no livro e veja a célula H mudar.
5. Aba **Venda**: venda 1 exemplar e confira se o estoque caiu 1.
6. Abra `index.html` (Lanchonete) e `cardapio.html` e confirme que nada mudou lá:
   registrar venda, cadastrar produto, editar produto, pedidos e dashboard.

---

## Observações

- **Estoque vazio = não controla estoque.** O produto aparece como `—`, sem
  botões `+`/`−`, e pode ser vendido sem limite nem baixa. É o caso de produto
  cuja quantidade você não sabe ou não quer acompanhar. Para passar a controlar,
  abra em **Editar** e preencha o estoque.
- **A coluna F (`autor`) ficou sem uso.** A Livraria vende livro, papelaria,
  presente e o que mais entrar, então o que organiza é a **categoria**, livre,
  criada na hora do cadastro. A coluna fica aí vazia — pode ignorar ou apagar.
- **Produto da Lanchonete** fica com F, G e H vazios. É esperado — a página da
  Lanchonete nem lê essas colunas.
- O `tipo: 'estoque'` escreve o **valor final**, não o delta. Se o mesmo pedido for
  enviado duas vezes, o resultado é o mesmo.
- **Preço e total são gravados como número puro**, sem `R$` e sem vírgula. Quem
  mostra `R$ 2,99` é a formatação de moeda da própria coluna. Gravar o texto
  `"2.99"` era o que disparava *"este valor não corresponde ao tipo de coluna moeda"*.

## Consertar as linhas antigas

As linhas gravadas antes dessa correção continuam como texto na planilha.
Para converter de uma vez:

1. **Faça uma cópia da planilha antes** (Arquivo → Fazer uma cópia). A função
   reescreve as colunas de preço e total.
2. No editor, selecione **`corrigirPrecos`** → **Executar**.
3. O log diz quantas células foram convertidas, por exemplo
   `Células convertidas de texto para número: 37`.

Ela só mexe em células que estão como texto — rodar duas vezes não causa dano,
na segunda o log mostra `0`.
