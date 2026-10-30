# Histórico de versões

Todas as mudanças importantes do Gasto em Dia ficam anotadas aqui.

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
