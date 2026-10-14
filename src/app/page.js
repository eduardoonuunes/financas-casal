'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SENHA_CORRETA = '1234'

export default function Home() {
  const [autenticado, setAutenticado] = useState(false)
  const [pinEntrada, setPinEntrada] = useState('')
  const [erroPin, setErroPin] = useState(false)

  const [lancamentos, setLancamentos] = useState([])
  const [aba, setAba] = useState('dashboard')

  const mesAtualStr = new Date().toISOString().slice(0, 7)
  const dataHojeStr = new Date().toISOString().split('T')[0]
  const [mesFiltro, setMesFiltro] = useState(mesAtualStr)

  // Estados do Formulário
  const [tipo, setTipo] = useState('gasto') // 'gasto', 'recebido', 'investimento'
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState('Alimentação')
  const [modalidade, setModalidade] = useState('avista') // 'avista', 'parcelado', 'recorrente_meses'
  const [parcelasTotal, setParcelasTotal] = useState('2')
  const [mesesRepeticao, setMesesRepeticao] = useState('3')
  const [pagoPor, setPagoPor] = useState('Eduardo')
  const [dataLancamento, setDataLancamento] = useState(dataHojeStr)
  const [statusPago, setStatusPago] = useState(true)

  useEffect(() => {
    const authSalva = sessionStorage.getItem('app_financas_auth')
    if (authSalva === 'true') {
      setAutenticado(true)
      carregarLancamentos()
    }
  }, [])

  function handleLogin(e) {
    e.preventDefault()
    if (pinEntrada === SENHA_CORRETA) {
      setAutenticado(true)
      setErroPin(false)
      sessionStorage.setItem('app_financas_auth', 'true')
      carregarLancamentos()
    } else {
      setErroPin(true)
      setPinEntrada('')
    }
  }

  function handleSair() {
    sessionStorage.removeItem('app_financas_auth')
    setAutenticado(false)
  }

  async function carregarLancamentos() {
    const { data } = await supabase.from('financas').select('*').order('data', { ascending: false })
    if (data) setLancamentos(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!descricao || !valor) return

    const numValor = parseFloat(valor)
    const dataBase = new Date(dataLancamento + 'T00:00:00')

    if (tipo === 'gasto' && modalidade === 'parcelado') {
      const qtd = parseInt(parcelasTotal) || 2
      const valorParcela = numValor / qtd

      for (let i = 0; i < qtd; i++) {
        const d = new Date(dataBase)
        d.setMonth(d.getMonth() + i)
        const mesAnoRef = d.toISOString().split('T')[0]

        await supabase.from('financas').insert([{
          descricao: `${descricao} (${i + 1}/${qtd})`,
          valor: valorParcela,
          tipo,
          categoria,
          e_parcelado: true,
          pago_por: pagoPor,
          data: mesAnoRef,
          pago: statusPago
        }])
      }
    } else if (modalidade === 'recorrente_meses') {
      const qtdMeses = parseInt(mesesRepeticao) || 3

      for (let i = 0; i < qtdMeses; i++) {
        const d = new Date(dataBase)
        d.setMonth(d.getMonth() + i)
        const mesAnoRef = d.toISOString().split('T')[0]

        await supabase.from('financas').insert([{
          descricao: `${descricao} (${i + 1}/${qtdMeses})`,
          valor: numValor,
          tipo,
          categoria: tipo === 'investimento' ? 'Investimentos' : categoria,
          e_parcelado: false,
          pago_por: pagoPor,
          data: mesAnoRef,
          pago: i === 0 ? statusPago : false // O primeiro respeita o status, os seguintes nascem previstos
        }])
      }
    } else {
      await supabase.from('financas').insert([{
        descricao,
        valor: numValor,
        tipo,
        categoria: tipo === 'investimento' ? 'Investimentos' : categoria,
        e_parcelado: false,
        pago_por: pagoPor,
        data: dataLancamento,
        pago: statusPago
      }])
    }

    setDescricao('')
    setValor('')
    carregarLancamentos()
    setAba('dashboard')
  }

  async function confirmarPagamento(id, estadoAtual) {
    const { error } = await supabase
      .from('financas')
      .update({ pago: !estadoAtual })
      .eq('id', id)

    if (!error) carregarLancamentos()
  }

  async function editarValor(id, valorAtual) {
    const novoValor = prompt('Digite o novo valor (R$):', valorAtual)
    if (novoValor && !isNaN(novoValor)) {
      const { error } = await supabase
        .from('financas')
        .update({ valor: parseFloat(novoValor) })
        .eq('id', id)

      if (!error) carregarLancamentos()
    }
  }

  async function apagarItem(id) {
    if (confirm('Tem certeza que deseja apagar este lançamento?')) {
      const { error } = await supabase.from('financas').delete().eq('id', id)
      if (!error) carregarLancamentos()
    }
  }

  if (!autenticado) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            🔒
          </div>
          <h1 className="text-lg font-black text-slate-800">Finanças do Casal</h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">Acesso restrito para Eduardo e Kathlen</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={8}
                placeholder="Digite a Senha / PIN"
                value={pinEntrada}
                onChange={(e) => setPinEntrada(e.target.value)}
                className="w-full text-center text-xl tracking-widest font-bold p-3.5 bg-slate-100 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {erroPin && (
                <p className="text-xs text-rose-500 font-bold mt-2">Senha incorreta. Tente novamente.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow-md"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </main>
    )
  }

  // Filtragem do Mês Selecionado
  const lancamentosFiltrados = lancamentos.filter(l => l.data && l.data.startsWith(mesFiltro))

  const recebidos = lancamentosFiltrados
    .filter(l => (l.tipo === 'recebido' || l.tipo === 'receita') && l.pago !== false)
    .reduce((acc, curr) => acc + Number(curr.valor), 0)

  const gastos = lancamentosFiltrados
    .filter(l => (l.tipo === 'gasto' || l.tipo === 'despesa') && l.pago !== false)
    .reduce((acc, curr) => acc + Number(curr.valor), 0)

  // Totais Previstos (para análise)
  const gastosPrevistosTotal = lancamentosFiltrados
    .filter(l => (l.tipo === 'gasto' || l.tipo === 'despesa'))
    .reduce((acc, curr) => acc + Number(curr.valor), 0)

  const saldo = recebidos - gastos

  const totalInvestimentos = lancamentos
    .filter(l => l.tipo === 'investimento')
    .reduce((acc, curr) => acc + Number(curr.valor), 0)

  const maxComparativo = Math.max(recebidos, gastos, 1)

  // Cálculo do Mês Anterior para Comparação de Gastos
  const [anoFiltro, mesFiltroNum] = mesFiltro.split('-').map(Number)
  const dataAnterior = new Date(anoFiltro, mesFiltroNum - 2, 1)
  const mesAnteriorStr = `${dataAnterior.getFullYear()}-${String(dataAnterior.getMonth() + 1).padStart(2, '0')}`

  const gastosMesAnterior = lancamentos
    .filter(l => l.data && l.data.startsWith(mesAnteriorStr) && (l.tipo === 'gasto' || l.tipo === 'despesa') && l.pago !== false)
    .reduce((acc, curr) => acc + Number(curr.valor), 0)

  const diferencaMesPassado = gastos - gastosMesAnterior

  // Gastos agrupados por categoria
  const categoriasGastos = {}
  lancamentosFiltrados
    .filter(l => (l.tipo === 'gasto' || l.tipo === 'despesa') && l.pago !== false)
    .forEach(l => {
      const cat = l.categoria || 'Outros'
      categoriasGastos[cat] = (categoriasGastos[cat] || 0) + Number(l.valor)
    })

  // Evolução Diária de Gastos (com tom avermelhado)
  const gastosPorDia = {}
  lancamentosFiltrados
    .filter(l => (l.tipo === 'gasto' || l.tipo === 'despesa') && l.pago !== false)
    .forEach(l => {
      const dia = l.data ? l.data.split('-')[2] : '01'
      gastosPorDia[dia] = (gastosPorDia[dia] || 0) + Number(l.valor)
    })
  const maiorGastoDia = Math.max(...Object.values(gastosPorDia), 1)

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      <header className="bg-emerald-800 text-white p-4 shadow-md mb-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Painel Financeiro</h1>
            <p className="text-xs text-emerald-200">Eduardo & Kathlen</p>
          </div>
          <div className="flex space-x-2 items-center">
            <button
              onClick={() => setAba('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${aba === 'dashboard' ? 'bg-white text-emerald-900 shadow' : 'bg-emerald-700 text-white'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setAba('novo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${aba === 'novo' ? 'bg-white text-emerald-900 shadow' : 'bg-emerald-700 text-white'}`}
            >
              + Lançar
            </button>
            <button
              onClick={handleSair}
              className="p-1.5 bg-emerald-900 hover:bg-emerald-950 text-emerald-200 rounded-xl text-xs font-bold ml-2"
              title="Bloquear aplicativo"
            >
              🔒
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4">
        {/* Seletor de Mês */}
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mês de Referência:</span>
          <input
            type="month"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold outline-none cursor-pointer"
          />
        </div>

        {aba === 'dashboard' && (
          <div className="space-y-6">
            
            {/* CARDS SUPERIORES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="space-y-4">
                <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-sm">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Saldo Real do Mês</span>
                  <h2 className="text-2xl font-black mt-1">R$ {saldo.toFixed(2)}</h2>
                  <p className="text-[10px] text-emerald-200 mt-2">Total Previsto de Gastos: R$ {gastosPrevistosTotal.toFixed(2)}</p>
                </div>

                <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-sm">
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Investimentos Acumulados</span>
                  <h2 className="text-2xl font-black mt-1">R$ {totalInvestimentos.toFixed(2)}</h2>
                  <p className="text-[10px] text-indigo-200 mt-2">Valor total guardado</p>
                </div>
              </div>

              {/* Comparativo Gráfico */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 md:col-span-2 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase mb-3">Comparativo: Recebidos vs Gastos</span>
                <div className="flex items-end justify-around h-40 pt-4">
                  <div className="flex flex-col items-center w-1/3 h-full justify-end">
                    <span className="text-[11px] font-extrabold text-emerald-700 mb-1">R$ {recebidos.toFixed(0)}</span>
                    <div 
                      className="w-full bg-emerald-500 rounded-t-xl transition-all duration-500" 
                      style={{ height: `${(recebidos / maxComparativo) * 100}%`, minHeight: '8px' }}
                    ></div>
                    <span className="text-[11px] font-bold text-slate-500 mt-2">Recebidos</span>
                  </div>

                  <div className="flex flex-col items-center w-1/3 h-full justify-end">
                    <span className="text-[11px] font-extrabold text-rose-600 mb-1">R$ {gastos.toFixed(0)}</span>
                    <div 
                      className="w-full bg-rose-400 rounded-t-xl transition-all duration-500" 
                      style={{ height: `${(gastos / maxComparativo) * 100}%`, minHeight: '8px' }}
                    ></div>
                    <span className="text-[11px] font-bold text-slate-500 mt-2">Gastos</span>
                  </div>
                </div>
              </div>

            </div>

            {/* CARD DE EVOLUÇÃO EM RELAÇÃO AO MÊS ANTERIOR */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evolução de Gastos</span>
                <h3 className="text-sm font-bold text-slate-800 mt-0.5">Comparativo com o Mês Anterior</h3>
              </div>
              <div className="text-right">
                <span className={`text-sm font-black ${diferencaMesPassado <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {diferencaMesPassado <= 0 ? '▼ R$ ' + Math.abs(diferencaMesPassado).toFixed(2) : '▲ R$ ' + diferencaMesPassado.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-400">vs R$ {gastosMesAnterior.toFixed(2)} mês passado</p>
              </div>
            </div>

            {/* EVOLUÇÃO DIÁRIA DE GASTOS (Tom Vermelho/Rosa idêntico ao card) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Evolução Diária de Gastos ({mesFiltro})</h3>
              {Object.keys(gastosPorDia).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sem gastos realizados no mês.</p>
              ) : (
                <div className="flex items-end space-x-2 h-28 overflow-x-auto pt-4 pb-1">
                  {Object.entries(gastosPorDia).sort(([a], [b]) => Number(a) - Number(b)).map(([dia, val]) => (
                    <div key={dia} className="flex flex-col items-center flex-shrink-0 w-8 h-full justify-end">
                      <span className="text-[9px] font-bold text-rose-600 mb-1">{val.toFixed(0)}</span>
                      <div 
                        className="w-full bg-rose-400 rounded-t-md" 
                        style={{ height: `${(val / maiorGastoDia) * 100}%`, minHeight: '6px' }}
                      ></div>
                      <span className="text-[9px] text-slate-400 mt-1">{dia}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DISTRIBUIÇÃO POR CATEGORIA (Barra com tom avermelhado) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Distribuição por Categoria</h3>
              {Object.keys(categoriasGastos).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nenhum gasto registrado.</p>
              ) : (
                <div className="space-y-3.5">
                  {Object.entries(categoriasGastos).map(([cat, val]) => {
                    const pct = gastos > 0 ? (val / gastos) * 100 : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-700">{cat}</span>
                          <span className="text-slate-900">R$ {val.toFixed(2)} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-rose-400 h-2.5 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* EXTRATO DETALHADO */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Lançamentos & Previsões do Mês</h3>
              {lancamentosFiltrados.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum lançamento registrado para este mês ({mesFiltro}).</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lancamentosFiltrados.map((item) => {
                    const eGasto = item.tipo === 'gasto' || item.tipo === 'despesa'
                    const eInvest = item.tipo === 'investimento'
                    const pagoRealizado = item.pago !== false

                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <p className="font-bold text-xs text-slate-800">{item.descricao}</p>
                            {!pagoRealizado && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                                Previsto
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {item.data ? item.data.split('-').reverse().join('/') : ''} • {item.pago_por} • <strong className="text-emerald-700">{item.categoria}</strong>
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-black ${eGasto ? 'text-rose-600' : eInvest ? 'text-indigo-600' : 'text-emerald-600'}`}>
                            {eGasto ? '-' : '+'} R$ {Number(item.valor).toFixed(2)}
                          </span>

                          <button
                            onClick={() => confirmarPagamento(item.id, pagoRealizado)}
                            className={`text-xs px-2 py-1 rounded-lg font-bold transition ${pagoRealizado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800 hover:bg-emerald-100 hover:text-emerald-800'}`}
                            title={pagoRealizado ? 'Marcado como Pago/Recebido' : 'Clique para confirmar pagamento/recebimento'}
                          >
                            {pagoRealizado ? '✅' : '⌛ Confirmar'}
                          </button>

                          <button
                            onClick={() => editarValor(item.id, item.valor)}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg"
                            title="Ajustar valor"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => apagarItem(item.id)}
                            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-500 px-2 py-1 rounded-lg"
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {aba === 'novo' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold mb-4 text-slate-800">Novo Lançamento / Previsão</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  className={`flex-1 py-2 font-bold text-xs rounded-lg transition ${tipo === 'gasto' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'}`}
                  onClick={() => setTipo('gasto')}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 font-bold text-xs rounded-lg transition ${tipo === 'recebido' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500'}`}
                  onClick={() => setTipo('recebido')}
                >
                  Recebido
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 font-bold text-xs rounded-lg transition ${tipo === 'investimento' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500'}`}
                  onClick={() => setTipo('investimento')}
                >
                  Investimento
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data do Lançamento</label>
                <input
                  type="date"
                  required
                  value={dataLancamento}
                  onChange={(e) => setDataLancamento(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-200 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full text-2xl font-black p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Mercado, Salário, Aluguel, Investimento..."
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              {tipo !== 'investimento' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                    >
                      <option value="Alimentação">Alimentação</option>
                      <option value="Moradia">Moradia</option>
                      <option value="Transporte">Transporte / Carro</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Salário">Salário</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Responsável</label>
                    <select
                      value={pagoPor}
                      onChange={(e) => setPagoPor(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                    >
                      <option value="Eduardo">Eduardo</option>
                      <option value="Kathlen">Kathlen</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status do Lançamento</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setStatusPago(true)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border ${statusPago ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    ✅ Já Realizado / Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusPago(false)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border ${!statusPago ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    ⌛ Previsão / Pendente
                  </button>
                </div>
              </div>

              {tipo !== 'investimento' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Modalidade</label>
                  <select
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                  >
                    <option value="avista">À vista / Único</option>
                    {tipo === 'gasto' && <option value="parcelado">Parcelado (Cartão / Carnê)</option>}
                    <option value="recorrente_meses">Repetir por Vários Meses (Recorrente)</option>
                  </select>
                </div>
              )}

              {tipo === 'gasto' && modalidade === 'parcelado' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Número de Parcelas</label>
                  <input
                    type="number"
                    min="2"
                    max="48"
                    value={parcelasTotal}
                    onChange={(e) => setParcelasTotal(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                  />
                </div>
              )}

              {modalidade === 'recorrente_meses' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Repetir por Quantos Meses?</label>
                  <input
                    type="number"
                    min="2"
                    max="24"
                    value={mesesRepeticao}
                    onChange={(e) => setMesesRepeticao(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-md mt-2"
              >
                Salvar Lançamento
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
