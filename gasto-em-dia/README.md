# Gasto em Dia

Agenda de contas e gastos para lojas pequenas. Anota as contas a pagar e as entradas de dinheiro, avisa o que vence hoje e o que está atrasado, mostra o lucro do mês e para onde foi o dinheiro.

**Versão atual: 0.1.0-alpha.** Veja o que tem e as limitações em [CHANGELOG.md](CHANGELOG.md).

## Como testar

- **No computador:** abra o `index.html` no navegador. Funciona sem servidor; os dados ficam salvos no próprio navegador (localStorage).
- **No celular, como app:** hospede a pasta em https, por exemplo no GitHub Pages. Quando este branch for para o `main`, o endereço será https://thurpopa.github.io/simulador-redemoinho/gasto-em-dia/. Abra no celular e use "Adicionar à tela inicial" (ou "Instalar app"). Depois de aberto uma vez, funciona sem internet.

## Testes

Leitor de boleto:

```
node gasto-em-dia/boleto.test.js
```

## Roteiro de teste para lojistas (alpha)

Peça para o lojista fazer, sem ajuda:

1. Apagar os exemplos e trocar o nome da loja.
2. Lançar o aluguel repetindo todo mês por 12 meses.
3. Lançar uma compra de fornecedor parcelada em 3x.
4. Colar o código de um boleto de verdade e conferir se valor e vencimento vieram certos.
5. Lançar as vendas da semana e ver o lucro do mês.

Depois, pergunte:

1. O que foi mais difícil ou confuso de fazer?
2. Que conta ou gasto da loja você não conseguiu lançar do jeito que queria?
3. Você usaria isso no lugar do caderno ou da planilha? Por quê?
4. Quanto pagaria por mês para ter isso com aviso no WhatsApp e os dados salvos na nuvem?

## Próximos passos

- Dados na nuvem com login, para usar no celular e no computador.
- Aviso de vencimento no WhatsApp.
- Plano pago mensal.
