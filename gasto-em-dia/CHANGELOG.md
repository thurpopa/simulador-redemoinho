# Histórico de versões

Todas as mudanças importantes do Gasto em Dia ficam anotadas aqui.

## [0.2.0-alpha] - 2026-10-30

Segunda versão de teste, com as funções que as ferramentas de gestão financeira mais usadas têm (veja `docs/pesquisa-concorrentes.md`).

### Adicionado

- Carteiras (caixa da loja, banco, conta digital, maquininha), cada uma com saldo inicial e saldo atual. O card "Onde está o dinheiro" mostra o saldo de cada uma e o total.
- Transferência entre carteiras: muda os saldos, mas não entra em entradas, saídas, lucro nem categorias.
- "Paguei" e "Recebi" com data, valor pago e carteira. A diferença para o valor previsto aparece como juros/multa ou desconto, e o resumo mostra os juros e multas do mês.
- Saldo previsto para 30, 60 ou 90 dias, com gráfico, lista dos dias com movimento e aviso no topo quando o saldo vai ficar negativo.
- Limite de gasto por categoria, com barra verde, amarela e vermelha e aviso quando passa do limite.
- Comparação com o mês anterior (↑ 18%, ↓ 7%) em entradas, saídas, lucro e cada categoria, com a média de 3 meses.
- Fornecedor e cliente em cada lançamento: escolher um nome já usado preenche categoria, forma, carteira e o último valor.
- Busca e filtros por período, categoria, carteira e forma de pagamento. Com o período padrão, a busca procura em todos os meses.
- Resultado do mês (DRE simplificado): vendas, outras entradas, impostos, mercadorias e fornecedores, lucro bruto, despesas da loja (abre por categoria) e lucro líquido, com margem e o mês anterior ao lado.
- Relatório para o contador: resultado do mês, saldo de cada carteira no fim do mês e todos os lançamentos, para copiar (cola no Excel e no Planilhas Google) ou baixar em CSV no padrão do Excel em português.
- Importar extrato do banco em OFX ou CSV: o que bate com uma conta lançada vira pago na data do extrato, o resto vira lançamento novo com categoria sugerida pelo histórico, e importar o mesmo extrato de novo não duplica nada.

### Mudado

- Os dados da versão 0.1 são convertidos sozinhos: tudo vai para a carteira "Caixa da loja", e as contas pagas ganham a data de pagamento igual ao vencimento.
- No celular, os cards seguem a ordem de uso: carteiras, vencimentos, saldo previsto, categorias, resultado, lançamentos, formulário e seus dados.

### Limitações conhecidas

- Os dados continuam só no aparelho e no navegador. Faça backup.
- O leitor de extrato foi testado com arquivos gerados nos testes, no formato dos bancos brasileiros, mas ainda não com extratos reais. Arquivos fora do padrão podem não ser reconhecidos.
- A conciliação não junta várias linhas do extrato para casar com uma conta só.
- O resultado do mês é pela data de vencimento, não pela data do pagamento.
- Dentro do link de visualização do Claude, "Baixar arquivo" e "Baixar CSV" não baixam nada; use os botões de copiar.

## [0.1.0-alpha] - 2026-10-30

Primeira versão para testar com lojistas.

### Adicionado

- Contas a pagar com vencimento, categoria e forma de pagamento.
- Próximos vencimentos com avisos de "Vence hoje", "Vence amanhã" e "Atrasada há N dias", e botão "Paguei".
- Entradas de dinheiro (vendas, serviços e outras), a receber ou recebidas.
- Resumo do mês: entradas, saídas, lucro do mês, falta pagar e em atraso.
- Gasto por categoria ("Para onde foi o dinheiro").
- Lista do mês com filtros (todas, a pagar, pagas, entradas).
- Editar qualquer lançamento tocando no nome.
- Repetir todo mês por 3, 6 ou 12 meses, ou parcelar de 2x a 12x (os centavos que sobram vão na 1ª parcela).
- Leitor de boleto: cole a linha digitável ou o código de barras e o app preenche valor, vencimento e banco. Lê boleto bancário (47 ou 44 dígitos) e de arrecadação, como luz, água e impostos (48 ou 44 dígitos), e confere os dígitos verificadores.
- Copiar a lista do mês para o Excel ou o Planilhas Google.
- Backup e restauração dos dados.
- Tela de boas-vindas no primeiro uso, com contas de exemplo.
- Instalar no celular como app e usar sem internet (quando hospedado em https).

### Limitações conhecidas

- Os dados ficam só no aparelho e no navegador onde foram lançados. Limpar os dados do navegador apaga tudo; faça backup.
- Não tem login nem sincronização entre celular e computador.
- O leitor de boleto foi testado só com códigos gerados pelos testes, ainda não com boletos reais.
- Boleto de arrecadação (luz, água, impostos) não traz o vencimento; a data precisa ser preenchida à mão.
- Funcionar sem internet e instalar como app só funciona quando o app está hospedado em https (por exemplo, no GitHub Pages).
