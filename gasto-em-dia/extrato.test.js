// Testes do leitor de extrato e da conciliação: node gasto-em-dia/extrato.test.js
// Todos os arquivos são montados aqui mesmo (sintéticos), nenhum extrato real.
var assert = require('assert');
var E = require('./extrato.js');

var passou = 0, falhou = 0;
function teste(nome, fn) {
  try { fn(); passou++; }
  catch (e) { falhou++; console.log('FALHOU: ' + nome + '\n  ' + (e && e.message)); }
}

// ---- fixtures ----
function ofxSGML(trns) {
  return [
    'OFXHEADER:100', 'DATA:OFXSGML', 'VERSION:102', 'SECURITY:NONE', 'ENCODING:USASCII', 'CHARSET:1252',
    'COMPRESSION:NONE', 'OLDFILEUID:NONE', 'NEWFILEUID:NONE', '',
    '<OFX>', '<SIGNONMSGSRSV1>', '<SONRS>', '<STATUS>', '<CODE>0', '<SEVERITY>INFO', '</STATUS>',
    '<DTSERVER>20261030120000[-3:BRT]', '<LANGUAGE>POR', '<FI>', '<ORG>Banco Teste S.A.', '<FID>341', '</FI>',
    '</SONRS>', '</SIGNONMSGSRSV1>', '<BANKMSGSRSV1>', '<STMTTRNRS>', '<TRNUID>1001', '<STMTRS>', '<CURDEF>BRL',
    '<BANKACCTFROM>', '<BANKID>0341', '<ACCTID>12345-6', '<ACCTTYPE>CHECKING', '</BANKACCTFROM>',
    '<BANKTRANLIST>', '<DTSTART>20261001', '<DTEND>20261030'
  ].concat(trns.map(function (t) {
    var l = ['<STMTTRN>', '<TRNTYPE>' + t.tipo, '<DTPOSTED>' + t.data, '<TRNAMT>' + t.valor];
    if (t.fitid) l.push('<FITID>' + t.fitid);
    if (t.nome) l.push('<NAME>' + t.nome);
    if (t.memo) l.push('<MEMO>' + t.memo);
    if (!t.semFechar) l.push('</STMTTRN>');
    return l.join('\n');
  })).concat(['</BANKTRANLIST>', '<LEDGERBAL>', '<BALAMT>1500.00', '<DTASOF>20261030', '</LEDGERBAL>',
    '</STMTRS>', '</STMTTRNRS>', '</BANKMSGSRSV1>', '</OFX>']).join('\r\n');
}

var OFX_XML = '<?xml version="1.0" encoding="UTF-8"?>\n<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE"?>\n' +
  '<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL</CURDEF>' +
  '<BANKACCTFROM><BANKID>260</BANKID><ACCTID>9988776</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM>' +
  '<BANKTRANLIST>' +
  '<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261028000000.000[-3:BRT]</DTPOSTED><TRNAMT>350.00</TRNAMT>' +
  '<FITID>X-1</FITID><MEMO>Transferência recebida pelo Pix - MARIA SOUZA</MEMO></STMTTRN>\n' +
  '<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261029</DTPOSTED><TRNAMT>-89.90</TRNAMT>' +
  '<FITID>X-2</FITID><NAME>Internet Fibra</NAME><MEMO>Pagamento de boleto</MEMO></STMTTRN>' +
  '<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261029</DTPOSTED><TRNAMT>-5,50</TRNAMT>' +
  '<FITID>X-3</FITID><MEMO>Compras &amp; Cia</MEMO></STMTTRN>' +
  '</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';

var CSV_NUBANK = 'Data,Valor,Identificador,Descrição\n' +
  '01/10/2026,-1450.90,6720a1b2-0001,Pagamento de boleto efetuado - DISTRIBUIDORA BEBIDAS\n' +
  '02/10/2026,1200.00,6720a1b2-0002,Transferência recebida pelo Pix - JOAO\n' +
  '03/10/2026,-12.5,6720a1b2-0003,"Compra no débito - PADARIA, CENTRO"\n';

var CSV_ITAU = 'data;lançamento;ag./origem;valor (R$);saldos (R$)\n' +
  '30/09/2026;SALDO ANTERIOR;;;2.000,00\n' +
  '05/10/2026;PIX ENVIADO ALUGUEL PONTO;;-2.800,00;\n' +
  '10/10/2026;TAR PACOTE SERVICOS;;-49,90;\n' +
  '12/10/2026;PIX RECEBIDO CLIENTE;;R$ 1.234,56;\n' +
  '15/10/2026;CONTA DE LUZ;;(612,40);\n' +
  '15/10/2026;S A L D O;;;1.000,00\n';

var CSV_CRED_DEB = '﻿Extrato de conta corrente\nAgência 1234 Conta 5678-9\n\n' +
  'Data\tHistórico\tDocto.\tCrédito (R$)\tDébito (R$)\tSaldo (R$)\n' +
  '2026-10-01\tSaldo do dia\t\t\t\t500,00\n' +
  '2026-10-02\tDEPOSITO DINHEIRO\t001\t800,00\t\t1.300,00\n' +
  '2026-10-03\tPAGTO FORNECEDOR EMBALAGENS\t002\t\t380,00\t920,00\n' +
  '2026-10-04\tESTORNO\t003\t\t-15,00\t905,00\n';

// ---- lerValor / lerData ----
teste('valores em vários formatos', function () {
  assert.strictEqual(E._lerValor('1.234,56'), 123456);
  assert.strictEqual(E._lerValor('-1.234,56'), -123456);
  assert.strictEqual(E._lerValor('1234.56'), 123456);
  assert.strictEqual(E._lerValor('R$ 1.234,56'), 123456);
  assert.strictEqual(E._lerValor('(150,00)'), -15000);
  assert.strictEqual(E._lerValor('150,00-'), -15000);
  assert.strictEqual(E._lerValor('-12.5'), -1250);
  assert.strictEqual(E._lerValor('1.234.567,89'), 123456789);
  assert.strictEqual(E._lerValor('1,234.56'), 123456);
  assert.strictEqual(E._lerValor(''), null);
  assert.strictEqual(E._lerValor('abc'), null);
});
teste('datas em vários formatos', function () {
  assert.strictEqual(E._lerData('30/10/2026'), '2026-10-30');
  assert.strictEqual(E._lerData('5/1/26'), '2026-01-05');
  assert.strictEqual(E._lerData('2026-10-30'), '2026-10-30');
  assert.strictEqual(E._lerData('20261030120000[-3:BRT]'), '2026-10-30');
  assert.strictEqual(E._lerData('31/02/2026'), null);
  assert.strictEqual(E._lerData('SALDO'), null);
});

// ---- OFX ----
teste('OFX SGML estilo banco brasileiro', function () {
  var r = E.lerOFX(ofxSGML([
    { tipo: 'DEBIT', data: '20261005100000[-3:BRT]', valor: '-2800.00', fitid: 'A1', memo: 'PIX ENVIADO ALUGUEL' },
    { tipo: 'CREDIT', data: '20261006', valor: '1234,56', fitid: 'A2', nome: 'CLIENTE JOSE', memo: 'PIX RECEBIDO' },
    { tipo: 'FEE', data: '20261010', valor: '49.90', fitid: 'A3', memo: 'TARIFA PACOTE' },
    { tipo: 'DEBIT', data: '20261011', valor: '-10.00', memo: 'MANUTENÃ‡ÃƒO CONTA', semFechar: true }
  ]));
  assert.ok(r.ok, r.erro);
  assert.strictEqual(r.banco, 'Itaú');
  assert.strictEqual(r.conta, '12345-6');
  assert.strictEqual(r.linhas.length, 4);
  assert.deepStrictEqual(r.linhas[0], { data: '2026-10-05', valor: -280000, desc: 'PIX ENVIADO ALUGUEL', fitid: 'A1' });
  assert.strictEqual(r.linhas[1].valor, 123456);
  assert.strictEqual(r.linhas[1].desc, 'CLIENTE JOSE PIX RECEBIDO');
  assert.strictEqual(r.linhas[2].valor, -4990, 'tarifa com valor positivo e TRNTYPE FEE vira saída');
  assert.strictEqual(r.linhas[3].fitid, null);
  assert.strictEqual(r.linhas[3].desc, 'MANUTENÇÃO CONTA', 'acentos quebrados de latin1 são consertados');
});
teste('OFX XML (2.x)', function () {
  var r = E.lerOFX(OFX_XML);
  assert.ok(r.ok, r.erro);
  assert.strictEqual(r.banco, 'Nubank');
  assert.strictEqual(r.conta, '9988776');
  assert.strictEqual(r.linhas.length, 3);
  assert.deepStrictEqual(r.linhas[0], { data: '2026-10-28', valor: 35000, desc: 'Transferência recebida pelo Pix - MARIA SOUZA', fitid: 'X-1' });
  assert.strictEqual(r.linhas[1].desc, 'Internet Fibra Pagamento de boleto');
  assert.strictEqual(r.linhas[1].valor, -8990);
  assert.strictEqual(r.linhas[2].valor, -550);
  assert.strictEqual(r.linhas[2].desc, 'Compras & Cia');
});
teste('OFX inválido ou vazio', function () {
  assert.strictEqual(E.lerOFX('Data;Valor\n').ok, false);
  var r = E.lerOFX(ofxSGML([]));
  assert.strictEqual(r.ok, false);
  assert.ok(/movimenta/.test(r.erro));
});

// ---- CSV ----
teste('CSV estilo Nubank', function () {
  var r = E.lerCSV(CSV_NUBANK);
  assert.ok(r.ok, r.erro);
  assert.strictEqual(r.linhas.length, 3);
  assert.deepStrictEqual(r.linhas[0], { data: '2026-10-01', valor: -145090, desc: 'Pagamento de boleto efetuado - DISTRIBUIDORA BEBIDAS', fitid: '6720a1b2-0001' });
  assert.strictEqual(r.linhas[1].valor, 120000);
  assert.strictEqual(r.linhas[2].valor, -1250);
  assert.strictEqual(r.linhas[2].desc, 'Compra no débito - PADARIA, CENTRO', 'vírgula dentro de aspas');
});
teste('CSV estilo Itaú (; e saldo ignorado)', function () {
  var r = E.lerCSV(CSV_ITAU);
  assert.ok(r.ok, r.erro);
  assert.strictEqual(r.linhas.length, 4);
  assert.deepStrictEqual(r.linhas.map(function (l) { return l.valor; }), [-280000, -4990, 123456, -61240]);
  assert.strictEqual(r.linhas[0].desc, 'PIX ENVIADO ALUGUEL PONTO');
  assert.strictEqual(r.linhas[0].fitid, null);
});
teste('CSV com Crédito e Débito separados, BOM, linhas antes do cabeçalho e tab', function () {
  var r = E.lerCSV(CSV_CRED_DEB);
  assert.ok(r.ok, r.erro);
  assert.strictEqual(r.linhas.length, 3);
  assert.deepStrictEqual(r.linhas.map(function (l) { return l.valor; }), [80000, -38000, -1500]);
  assert.strictEqual(r.linhas[1].desc, 'PAGTO FORNECEDOR EMBALAGENS');
});
teste('CSV sem colunas reconhecíveis', function () {
  var r = E.lerCSV('a;b;c\n1;2;3\n');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.erro, 'Não reconheci as colunas. O arquivo precisa ter data, descrição e valor.');
  assert.strictEqual(E.lerCSV('').ok, false);
});

// ---- conciliação ----
function item(o) {
  var base = { tipo: 'saida', cat: 'Outros', forma: 'Boleto', pago: false, conta: 'banco' };
  for (var k in o) base[k] = o[k];
  return base;
}
function linha(data, valor, desc, fitid) { return { data: data, valor: valor, desc: desc, fitid: fitid || null }; }

teste('conciliar: valor exato dentro de 5 dias', function () {
  var itens = [item({ id: 'a', desc: 'Aluguel do ponto', valor: 280000, venc: '2026-10-05' })];
  var r = E.conciliar([linha('2026-10-07', -280000, 'PIX ENVIADO ALUGUEL')], itens, 'banco');
  assert.strictEqual(r.encontrados.length, 1);
  assert.strictEqual(r.encontrados[0].item.id, 'a');
  assert.strictEqual(r.encontrados[0].motivo, 'mesmo valor');
  assert.strictEqual(r.novos.length, 0);
});
teste('conciliar: fora da janela, conta errada, tipo errado ou já pago não casam', function () {
  var itens = [
    item({ id: 'longe', desc: 'X', valor: 1000, venc: '2026-10-01' }),
    item({ id: 'outra', desc: 'X', valor: 1000, venc: '2026-10-10', conta: 'caixa' }),
    item({ id: 'entrada', desc: 'X', valor: 1000, venc: '2026-10-10', tipo: 'entrada' }),
    item({ id: 'pago', desc: 'X', valor: 1000, venc: '2026-10-10', pago: true, pagoEm: '2026-10-09' })
  ];
  var r = E.conciliar([linha('2026-10-10', -1000, 'X')], itens, 'banco');
  assert.strictEqual(r.encontrados.length, 0);
  assert.strictEqual(r.novos.length, 1);
});
teste('conciliar: item sem conta também casa', function () {
  var itens = [item({ id: 's', desc: 'Luz', valor: 61240, venc: '2026-10-15', conta: undefined })];
  var r = E.conciliar([linha('2026-10-15', -61240, 'CONTA DE LUZ')], itens, 'banco');
  assert.strictEqual(r.encontrados.length, 1);
});
teste('conciliar: desempate pela data mais próxima', function () {
  var itens = [
    item({ id: 'dia3', desc: 'Fornecedor', valor: 5000, venc: '2026-10-03' }),
    item({ id: 'dia9', desc: 'Fornecedor', valor: 5000, venc: '2026-10-09' })
  ];
  var r = E.conciliar([linha('2026-10-08', -5000, 'PAGTO')], itens, 'banco');
  assert.strictEqual(r.encontrados[0].item.id, 'dia9');
});
teste('conciliar: desempate pela descrição quando a data empata', function () {
  var itens = [
    item({ id: 'luz', desc: 'Conta de luz', valor: 10000, venc: '2026-10-10' }),
    item({ id: 'agua', desc: 'Conta de água', valor: 10000, venc: '2026-10-10' })
  ];
  var r = E.conciliar([linha('2026-10-10', -10000, 'PAGTO AGUA SANEAMENTO')], itens, 'banco');
  assert.strictEqual(r.encontrados[0].item.id, 'agua');
});
teste('conciliar: pares globais (linha não rouba o item mais perto de outra)', function () {
  var itens = [
    item({ id: 'a', desc: 'Parcela', valor: 3000, venc: '2026-10-05' }),
    item({ id: 'b', desc: 'Parcela', valor: 3000, venc: '2026-10-08' })
  ];
  var r = E.conciliar([linha('2026-10-07', -3000, 'P'), linha('2026-10-04', -3000, 'P')], itens, 'banco');
  var mapa = {};
  r.encontrados.forEach(function (e) { mapa[e.linha.data] = e.item.id; });
  assert.deepStrictEqual(mapa, { '2026-10-07': 'b', '2026-10-04': 'a' });
  assert.strictEqual(r.encontrados[0].linha.data, '2026-10-07', 'resultado na ordem do extrato');
});
teste('conciliar: cada item casa só uma vez', function () {
  var itens = [item({ id: 'u', desc: 'Internet', valor: 12990, venc: '2026-10-20' })];
  var r = E.conciliar([linha('2026-10-20', -12990, 'INTERNET'), linha('2026-10-21', -12990, 'INTERNET')], itens, 'banco');
  assert.strictEqual(r.encontrados.length, 1);
  assert.strictEqual(r.novos.length, 1);
});
teste('conciliar: tolerância de 10% marca valor diferente', function () {
  var itens = [item({ id: 'luz', desc: 'Conta de luz', valor: 61240, venc: '2026-10-15' })];
  var r = E.conciliar([linha('2026-10-18', -63000, 'CONTA LUZ COM MULTA')], itens, 'banco');
  assert.strictEqual(r.encontrados.length, 1);
  assert.strictEqual(r.encontrados[0].motivo, 'valor diferente');
  var r2 = E.conciliar([linha('2026-10-18', -70000, 'CONTA LUZ')], itens, 'banco');
  assert.strictEqual(r2.encontrados.length, 0, '14% de diferença não casa');
  var r3 = E.conciliar([linha('2026-10-18', -70000, 'CONTA LUZ')], itens, 'banco', { tolerancia: 0.2, dias: 2 });
  assert.strictEqual(r3.encontrados.length, 0, 'janela de 2 dias');
  var r4 = E.conciliar([linha('2026-10-16', -70000, 'CONTA LUZ')], itens, 'banco', { tolerancia: 0.2, dias: 2 });
  assert.strictEqual(r4.encontrados.length, 1);
});
teste('conciliar: exato vence parecido', function () {
  var itens = [
    item({ id: 'parecido', desc: 'A', valor: 10100, venc: '2026-10-10' }),
    item({ id: 'exato', desc: 'B', valor: 10000, venc: '2026-10-13' })
  ];
  var r = E.conciliar([linha('2026-10-10', -10000, 'X')], itens, 'banco');
  assert.strictEqual(r.encontrados[0].item.id, 'exato');
});
teste('conciliar: já importado por FITID (qualquer conta)', function () {
  var itens = [item({ id: 'f', desc: 'Qualquer', valor: 999, venc: '2026-10-01', pago: true, fitid: 'A1', conta: 'caixa' })];
  var r = E.conciliar([linha('2026-10-05', -280000, 'PIX', 'A1')], itens, 'banco');
  assert.strictEqual(r.jaImportados.length, 1);
  assert.strictEqual(r.jaImportados[0].item.id, 'f');
  assert.strictEqual(r.novos.length, 0);
});
teste('conciliar: já importado sem FITID (mesmo pagamento na mesma conta)', function () {
  var itens = [
    item({ id: 't1', desc: 'TAR PACOTE SERVICOS', valor: 4990, venc: '2026-10-10', pago: true, pagoEm: '2026-10-10', valorPago: 4990 }),
    item({ id: 't2', desc: 'tar pacote serviços', valor: 4990, venc: '2026-10-10', pago: true, pagoEm: '2026-10-10' })
  ];
  var r = E.conciliar([
    linha('2026-10-10', -4990, 'TAR PACOTE SERVICOS'),
    linha('2026-10-10', -4990, 'TAR PACOTE SERVICOS'),
    linha('2026-10-10', -4990, 'TAR PACOTE SERVICOS')
  ], itens, 'banco');
  assert.strictEqual(r.jaImportados.length, 2, 'duas tarifas iguais já importadas, cada uma uma vez');
  assert.strictEqual(r.novos.length, 1);
  var r2 = E.conciliar([linha('2026-10-10', -4990, 'TAR PACOTE SERVICOS')], itens, 'caixa');
  assert.strictEqual(r2.jaImportados.length, 0, 'outra conta não conta como já importado');
});
teste('conciliar: sugestão pelo histórico mais recente', function () {
  var itens = [
    item({ id: 'h1', desc: 'Distribuidora de bebidas', valor: 100, venc: '2026-08-10', pago: true, cat: 'Fornecedores', forma: 'Boleto', contato: 'Distribuidora Sol' }),
    item({ id: 'h2', desc: 'DISTRIBUIDORA BEBIDAS', valor: 100, venc: '2026-09-10', pago: true, pagoEm: '2026-09-11', cat: 'Fornecedores', forma: 'Pix', contato: 'Distribuidora Sol Ltda' }),
    item({ id: 'v', desc: 'Vendas da semana', valor: 100, venc: '2026-09-10', tipo: 'entrada', pago: true, cat: 'Vendas', forma: 'Pix' })
  ];
  var r = E.conciliar([linha('2026-10-01', -145090, 'Pagamento de boleto efetuado - DISTRIBUIDORA BEBIDAS')], itens, 'banco');
  assert.strictEqual(r.novos.length, 1);
  assert.deepStrictEqual(r.novos[0].sugestao, {
    tipo: 'saida', desc: 'Pagamento de boleto efetuado - DISTRIBUIDORA BEBIDAS',
    cat: 'Fornecedores', forma: 'Pix', contato: 'Distribuidora Sol Ltda'
  });
});
teste('conciliar: sugestões padrão (Pix, tarifa, entrada)', function () {
  var r = E.conciliar([
    linha('2026-10-01', -5000, 'PIX ENVIADO FULANO'),
    linha('2026-10-01', -4990, 'TARIFA PACOTE'),
    linha('2026-10-01', 9000, 'PIX RECEBIDO CICLANO'),
    linha('2026-10-01', 9000, 'DEPOSITO')
  ], [], 'banco');
  var s = r.novos.map(function (n) { return n.sugestao; });
  assert.deepStrictEqual([s[0].cat, s[0].forma], ['Outros', 'Pix']);
  assert.deepStrictEqual([s[1].cat, s[1].forma, s[1].desc], ['Outros', 'Transferência', 'TARIFA PACOTE']);
  assert.deepStrictEqual([s[2].tipo, s[2].cat, s[2].forma], ['entrada', 'Outras entradas', 'Pix']);
  assert.deepStrictEqual([s[3].cat, s[3].forma], ['Outras entradas', 'Transferência']);
  assert.strictEqual(s[0].contato, undefined);
});
teste('conciliar: transferências entre contas ficam de fora', function () {
  var itens = [item({ id: 'tr', desc: 'Transferência', valor: 5000, venc: '2026-10-10', transf: true })];
  var r = E.conciliar([linha('2026-10-10', -5000, 'TRANSF')], itens, 'banco');
  assert.strictEqual(r.encontrados.length, 0);
});

// ---- aplicar ----
teste('aplicar: marca encontrados, cria novos, não mexe na lista original', function () {
  var itens = [
    item({ id: 'luz', desc: 'Conta de luz', valor: 61240, venc: '2026-10-15', conta: null }),
    item({ id: 'h', desc: 'Distribuidora de bebidas', valor: 100, venc: '2026-09-10', pago: true, cat: 'Fornecedores', forma: 'Boleto', contato: 'Sol' }),
    item({ id: 'f', desc: 'Já veio', valor: 500, venc: '2026-10-01', pago: true, fitid: 'OLD' })
  ];
  var copiaAntes = JSON.stringify(itens);
  var linhas = [
    linha('2026-10-17', -63000, 'CONTA LUZ', 'L1'),
    linha('2026-10-20', -145090, 'DISTRIBUIDORA BEBIDAS', 'L2'),
    linha('2026-10-21', 9000, 'PIX RECEBIDO'),
    linha('2026-10-01', -500, 'Já veio', 'OLD')
  ];
  var res = E.conciliar(linhas, itens, 'banco');
  var n = 0;
  var novos = E.aplicar(res, itens, 'banco', function () { return 'novo' + (++n); });
  assert.strictEqual(JSON.stringify(itens), copiaAntes, 'lista original intacta');
  assert.strictEqual(novos.length, 5);
  var luz = novos.filter(function (i) { return i.id === 'luz'; })[0];
  assert.deepStrictEqual([luz.pago, luz.pagoEm, luz.valorPago, luz.fitid, luz.conta, luz.valor], [true, '2026-10-17', 63000, 'L1', 'banco', 61240]);
  var n1 = novos.filter(function (i) { return i.id === 'novo1'; })[0];
  assert.deepStrictEqual(n1, {
    id: 'novo1', tipo: 'saida', desc: 'DISTRIBUIDORA BEBIDAS', valor: 145090, venc: '2026-10-20',
    cat: 'Fornecedores', forma: 'Boleto', pago: true, pagoEm: '2026-10-20', valorPago: 145090,
    conta: 'banco', contato: 'Sol', fitid: 'L2'
  });
  var n2 = novos.filter(function (i) { return i.id === 'novo2'; })[0];
  assert.strictEqual(n2.tipo, 'entrada');
  assert.strictEqual(n2.fitid, undefined);
  assert.ok(novos.indexOf(itens[0]) < 0, 'itens são cópias');
  // importar de novo o mesmo extrato não duplica nada
  var res2 = E.conciliar(linhas, novos, 'banco');
  assert.strictEqual(res2.jaImportados.length, 4);
  assert.strictEqual(res2.novos.length + res2.encontrados.length, 0);
});
teste('aplicar: respeita novos removidos pelo usuário e gera id padrão', function () {
  var res = E.conciliar([linha('2026-10-01', -100, 'A'), linha('2026-10-02', -200, 'B')], [], 'caixa');
  res.novos = res.novos.slice(1);
  var out = E.aplicar(res, [], 'caixa');
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].desc, 'B');
  assert.ok(out[0].id && typeof out[0].id === 'string');
});
teste('fluxo completo: CSV do Itaú contra contas do app', function () {
  var itens = [
    item({ id: 'alug', desc: 'Aluguel do ponto', valor: 280000, venc: '2026-10-05', cat: 'Aluguel' }),
    item({ id: 'luz', desc: 'Conta de luz', valor: 61240, venc: '2026-10-15', cat: 'Energia e água' })
  ];
  var lido = E.lerCSV(CSV_ITAU);
  var r = E.conciliar(lido.linhas, itens, 'banco');
  assert.deepStrictEqual(r.encontrados.map(function (e) { return e.item.id; }), ['alug', 'luz']);
  assert.deepStrictEqual(r.novos.map(function (n) { return n.linha.desc; }), ['TAR PACOTE SERVICOS', 'PIX RECEBIDO CLIENTE']);
});

console.log(passou + ' passaram, ' + falhou + ' falharam');
if (falhou) process.exit(1);
