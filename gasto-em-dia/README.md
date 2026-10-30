# Gasto em Dia

Agenda de contas e gastos para lojas pequenas. Anota as contas a pagar e as entradas de dinheiro, avisa o que vence hoje e o que está atrasado, mostra o lucro do mês e para onde foi o dinheiro.

**Versão atual: 0.2.0-alpha.** Veja o que tem e as limitações em [CHANGELOG.md](CHANGELOG.md).

## O que já faz

- Contas a pagar e entradas de dinheiro, com vencimento, atraso, repetição e parcelas.
- Carteiras (caixa, banco, conta digital, maquininha) com saldo, e transferência entre elas.
- "Paguei" com data e valor pago: juros, multa e desconto ficam registrados.
- Saldo previsto para 30, 60 ou 90 dias, com aviso de saldo negativo.
- Lucro do mês, gasto por categoria com limite, e comparação com o mês anterior.
- Resultado do mês (DRE simplificado) e relatório para o contador em CSV.
- Leitor de boleto e importação de extrato do banco (OFX ou CSV).
- Fornecedores e clientes, busca e filtros.
- Backup e restauração, instalar no celular e usar sem internet.

## Como testar

- **No computador:** abra o `index.html` no navegador. Funciona sem servidor; os dados ficam salvos no próprio navegador (localStorage).
- **No celular, como app:** hospede a pasta em https, por exemplo no GitHub Pages. Quando este branch for para o `main`, o endereço será https://thurpopa.github.io/simulador-redemoinho/gasto-em-dia/. Abra no celular e use "Adicionar à tela inicial" (ou "Instalar app"). Depois de aberto uma vez, funciona sem internet.

## Testes

Leitor de boleto e leitor de extrato:

```
node gasto-em-dia/boleto.test.js
node gasto-em-dia/extrato.test.js
```

## Roteiro de teste para lojistas (alpha)

Peça para o lojista fazer, sem ajuda:

1. Apagar os exemplos e trocar o nome da loja.
2. Lançar o aluguel repetindo todo mês por 12 meses.
3. Lançar uma compra de fornecedor parcelada em 3x.
4. Colar o código de um boleto de verdade e conferir se valor e vencimento vieram certos.
5. Lançar as vendas da semana e ver o lucro do mês.
6. Exportar o extrato do mês no app do banco (OFX ou CSV), importar em "Onde está o dinheiro" e conferir o que foi marcado como pago e o que foi criado.
7. Olhar o saldo previsto dos próximos 30 dias e dizer se o dia em que o dinheiro fica mais apertado bate com o que ele espera.

Depois, pergunte:

1. O que foi mais difícil ou confuso de fazer?
2. Que conta ou gasto da loja você não conseguiu lançar do jeito que queria?
3. Você usaria isso no lugar do caderno ou da planilha? Por quê?
4. Quanto pagaria por mês para ter isso com aviso no WhatsApp e os dados salvos na nuvem?

## Próximos passos

- Dados na nuvem com login, para usar no celular e no computador.
- Aviso de vencimento no WhatsApp.
- Plano pago mensal.
