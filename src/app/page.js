'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [lancamentos, setLancamentos] = useState([])
  const [aba, setAba] = useState('dashboard')

  // Filtro de mês atual no formato YYYY-MM
  const mesAtualStr = new Date().toISOString().slice(0, 7)
  const [mesFiltro, setMesFiltro] = useState(mesAtualStr)

  // Estados do Formulário
  const [tipo, setTipo] = useState('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState('Alimentação')
  const [modalidade, setModalidade] = useState('avista')
  const [parcelasTotal, setParcelasTotal] = useState('2')
  const [pagoPor, setPagoPor] = useState('Eduardo')

  useEffect(() => {
    carregarLancamentos()
  }, [])

  async function carregarLancamentos() {
    const { data } = await supabase.from('financas').select('*').order('created_at', { ascending: false })
    if (data) setLancamentos(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!descricao || !valor) return

    const numValor = parseFloat(valor)

    if (modalidade === 'parcelado') {
      const qtd = parseInt(parcelasTotal) || 2
      const valorParcela = numValor / qtd

      for (let i = 0; i < qtd; i++) {
        const d = new Date()
        d.setMonth(d.getMonth() + i)
        const mesAnoRef = d.toISOString().split('T')[0]

        await supabase.from('financas').insert([{
          descricao: `${descricao} (${i + 1}/${qtd})`,
          valor: valorParcela,
          tipo,
          categoria,
          e_recorrente: false,
          e_parcelado: true,
          pago_por: pagoPor,
          data: mesAnoRef
        }])
      }
    } else {
      const dataHoje = new Date().toISOString().split('T')[0]
      await supabase.from('financas').insert([{
        descricao,
        valor: numValor,
        tipo,
        categoria,
        e_recorrente: modalidade === 'fixo',
        e_parcelado: false,
        pago_por: pagoPor,
        data: dataHoje
      }])
    }

    setDescricao('')
    setValor('')
    carregarLancamentos()
    setAba('dashboard')
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

  // Lançamentos filtrados pelo mês escolhido
  const lancamentosFiltrados = lancamentos.filter(l => l.data && l.data.startsWith(mesFiltro))

  const receitas = lancamentosFiltrados.filter(l => l.tipo === 'receita').reduce((acc, curr) => acc + Number(curr.valor), 0)
  const despesas = lancamentosFiltrados.filter(l => l.tipo === 'despesa').reduce((acc, curr) => acc + Number(curr.valor), 0)
  const saldo = receitas - despesas

  // Maior valor para calcular altura proporcional das barras do gráfico comparativo
  const maxComparativo = Math.max(receitas, despesas, 1)

  // Agrupamento por Categoria
  const categoriasDespesa = {}
  lancamentosFiltrados
    .filter(l => l.tipo === 'despesa')
    .forEach(l => {
      const cat = l.categoria || 'Outros'
      categoriasDespesa[cat] = (categoriasDespesa[cat] || 0) + Number(l.valor)
    })

  // Top 5 maiores despesas individuais
  const topDespesas = [...lancamentosFiltrados]
    .filter(l => l.tipo === 'despesa')
    .sort((a, b) => Number(b.valor) - Number(a.valor))
    .slice(0, 5)

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Topo / Header estilo Dashboard */}
      <header className="bg-emerald-800 text-white p-4 shadow-md mb-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Painel Financeiro</h1>
            <p className="text-xs text-emerald-200">Visão geral do casal</p>
          </div>
          <div className="flex space-x-2">
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
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4">
        {/* Filtro de Mês */}
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de Análise:</span>
          <input
            type="month"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold outline-none cursor-pointer"
          />
        </div>

        {aba === 'dashboard' && (
          <div className="space-y-6">
            
            {/* LINHA 1: Cards de Indicadores Visuais (Resumo + Comparativo) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card Saldo / Reserva */}
              <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Reserva / Saldo Atual</span>
                  <h2 className="text-2xl font-black mt-2">R$ {saldo.toFixed(2)}</h2>
                </div>
                <p className="text-[10px] text-emerald-200 mt-4">Calculado com base nas entradas e saídas do mês selecionado.</p>
              </div>

              {/* Card Comparativo Visual Receitas vs Despesas (Gráfico de Barras) */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 md:col-span-2 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase mb-3">Comparativo Receitas vs Despesas</span>
                <div className="flex items-end justify-around h-32 pt-4">
                  {/* Barra de Receitas */}
                  <div className="flex flex-col items-center w-1/3 h-full justify-end">
                    <span className="text-[11px] font-extrabold text-emerald-700 mb-1">R$ {receitas.toFixed(0)}</span>
                    <div 
                      className="w-full bg-emerald-500 rounded-t-xl transition-all duration-500" 
                      style={{ height: `${(receitas / maxComparativo) * 100}%`, minHeight: '8px' }}
                    ></div>
                    <span className="text-[11px] font-bold text-slate-500 mt-2">Receitas</span>
                  </div>

                  {/* Barra de Despesas */}
                  <div className="flex flex-col items-center w-1/3 h-full justify-end">
                    <span className="text-[11px] font-extrabold text-rose-600 mb-1">R$ {despesas.toFixed(0)}</span>
                    <div 
                      className="w-full bg-rose-400 rounded-t-xl transition-all duration-500" 
                      style={{ height: `${(despesas / maxComparativo) * 100}%`, minHeight: '8px' }}
                    ></div>
                    <span className="text-[11px] font-bold text-slate-500 mt-2">Despesas</span>
                  </div>
                </div>
              </div>

            </div>

            {/* LINHA 2: Percentual por Categoria & Top 5 Despesas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Percentual por Categoria */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Distribuição por Tipo de Gastos</h3>
                {Object.keys(categoriasDespesa).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Nenhuma despesa no período.</p>
                ) : (
                  <div className="space-y-3.5">
                    {Object.entries(categoriasDespesa).map(([cat, val]) => {
                      const pct = despesas > 0 ? (val / despesas) * 100 : 0
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700">{cat}</span>
                            <span className="text-slate-900">R$ {val.toFixed(2)} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Top Maiores Despesas */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Top Maiores Gastos do Mês</h3>
                {topDespesas.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Sem lançamentos de saída.</p>
                ) : (
                  <div className="space-y-3">
                    {topDespesas.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.descricao}</p>
                            <span className="text-[10px] text-slate-400">{item.categoria}</span>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-rose-600">R$ {Number(item.valor).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* LINHA 3: Extrato / Lançamentos Detalhados */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-4">Extrato Detalhado do Mês</h3>
              {lancamentosFiltrados.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum lançamento registrado neste mês.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lancamentosFiltrados.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-slate-800">{item.descricao}</p>
                        <span className="text-[10px] text-slate-400">
                          {item.pago_por} • <strong className="text-emerald-700">{item.categoria}</strong> • {item.e_recorrente ? 'Fixo' : item.e_parcelado ? 'Parcelado' : 'À vista'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-black ${item.tipo === 'receita' ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {item.tipo === 'receita' ? '+' : '-'} R$ {Number(item.valor).toFixed(2)}
                        </span>
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
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {aba === 'novo' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold mb-4 text-slate-800">Novo Lançamento Rápido</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  className={`flex-1 py-2 font-bold text-xs rounded-lg transition ${tipo === 'despesa' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'}`}
                  onClick={() => setTipo('despesa')}
                >
                  Despesa (Saída)
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 font-bold text-xs rounded-lg transition ${tipo === 'receita' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500'}`}
                  onClick={() => setTipo('receita')}
                >
                  Receita (Entrada)
                </button>
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
                  placeholder="Ex: Supermercado, Salário, Luz, Combustível..."
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

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
                    <option value="Esposa">Esposa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Modalidade</label>
                <select
                  value={modalidade}
                  onChange={(e) => setModalidade(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                >
                  <option value="avista">Pontual / À vista</option>
                  <option value="fixo">Fixo Mensal (Recorrente)</option>
                  <option value="parcelado">Parcelado (Cartão / Carnê)</option>
                </select>
              </div>

              {modalidade === 'parcelado' && (
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
