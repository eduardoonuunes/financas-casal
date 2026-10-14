'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [lancamentos, setLancamentos] = useState([])
  const [aba, setAba] = useState('dashboard')

  // Filtro de mês atual (formato YYYY-MM)
  const mesAtualStr = new Date().toISOString().slice(0, 7)
  const [mesFiltro, setMesFiltro] = useState(mesAtualStr)

  // Estados do Formulário
  const [tipo, setTipo] = useState('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState('Alimentação')
  const [modalidade, setModalidade] = useState('avista') // 'avista', 'fixo', 'parcelado'
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

    const dataHoje = new Date().toISOString().split('T')[0]
    const numValor = parseFloat(valor)

    if (modalidade === 'parcelado') {
      const qtd = parseInt(parcelasTotal) || 2
      const valorParcela = numValor / qtd

      // Cria as parcelas distribuídas nos meses seguintes
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
      const novo = {
        descricao,
        valor: numValor,
        tipo,
        categoria,
        e_recorrente: modalidade === 'fixo',
        e_parcelado: false,
        pago_por: pagoPor,
        data: dataHoje
      }
      await supabase.from('financas').insert([novo])
    }

    setDescricao('')
    setValor('')
    carregarLancamentos()
    setAba('dashboard')
  }

  async function editarValor(id, valorAtual) {
    const novoValor = prompt('Digite o novo valor:', valorAtual)
    if (novoValor && !isNaN(novoValor)) {
      const { error } = await supabase
        .from('financas')
        .update({ valor: parseFloat(novoValor) })
        .eq('id', id)

      if (!error) carregarLancamentos()
    }
  }

  async function apagarItem(id) {
    if (confirm('Deseja realmente apagar este lançamento?')) {
      const { error } = await supabase.from('financas').delete().eq('id', id)
      if (!error) carregarLancamentos()
    }
  }

  // Filtrar lançamentos pelo mês selecionado (baseado na data YYYY-MM)
  const lancamentosFiltrados = lancamentos.filter(l => {
    if (!l.data) return true
    return l.data.startsWith(mesFiltro)
  })

  const receitas = lancamentosFiltrados.filter(l => l.tipo === 'receita').reduce((acc, curr) => acc + Number(curr.valor), 0)
  const despesas = lancamentosFiltrados.filter(l => l.tipo === 'despesa').reduce((acc, curr) => acc + Number(curr.valor), 0)
  const saldo = receitas - despesas

  // Agrupar despesas por categoria para os gráficos visuais
  const categoriasDespesa = {}
  lancamentosFiltrados
    .filter(l => l.tipo === 'despesa')
    .forEach(l => {
      const cat = l.categoria || 'Geral'
      categoriasDespesa[cat] = (categoriasDespesa[cat] || 0) + Number(l.valor)
    })

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 pb-16">
      <header className="bg-indigo-600 text-white p-4 shadow-md mb-4">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <h1 className="text-xl font-bold">Finanças do Casal</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setAba('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${aba === 'dashboard' ? 'bg-white text-indigo-600 shadow' : 'bg-indigo-700 text-white'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setAba('novo')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${aba === 'novo' ? 'bg-white text-indigo-600 shadow' : 'bg-indigo-700 text-white'}`}
            >
              + Lançar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4">
        {/* Filtro de Mês Global */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase">Mês de Referência:</span>
          <input
            type="month"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="p-1.5 bg-gray-100 rounded-lg text-sm font-semibold outline-none cursor-pointer"
          />
        </div>

        {aba === 'dashboard' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Entradas</span>
                <p className="text-sm sm:text-base font-extrabold text-emerald-700 mt-1">R$ {receitas.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-red-600 uppercase">Saídas</span>
                <p className="text-sm sm:text-base font-extrabold text-red-700 mt-1">R$ {despesas.toFixed(2)}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Saldo</span>
                <p className={`text-sm sm:text-base font-extrabold mt-1 ${saldo >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                  R$ {saldo.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Gráfico de Gastos por Categoria */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-700 mb-3 text-sm">Gastos por Categoria ({mesFiltro})</h2>
              {Object.keys(categoriasDespesa).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Sem despesas registradas neste mês.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoriasDespesa).map(([cat, val]) => {
                    const porcentagem = despesas > 0 ? (val / despesas) * 100 : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-gray-600">{cat}</span>
                          <span className="text-gray-800">R$ {val.toFixed(2)} ({porcentagem.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${porcentagem}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Lista de Lançamentos do Mês */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-700 mb-3 text-sm">Lançamentos do Mês</h2>
              {lancamentosFiltrados.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum lançamento neste mês.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {lancamentosFiltrados.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{item.descricao}</p>
                        <span className="text-[11px] text-gray-400">
                          {item.pago_por} • <strong className="text-indigo-500">{item.categoria}</strong> • {item.e_recorrente ? 'Fixo' : item.e_parcelado ? 'Parcelado' : 'Pontual'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${item.tipo === 'receita' ? 'text-emerald-600' : 'text-gray-700'}`}>
                          {item.tipo === 'receita' ? '+' : '-'} R$ {Number(item.valor).toFixed(2)}
                        </span>
                        <button
                          onClick={() => editarValor(item.id, item.valor)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded"
                          title="Ajustar valor"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => apagarItem(item.id)}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-2 py-1 rounded"
                          title="Apagar"
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
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-800">Novo Lançamento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  className={`flex-1 py-2 font-semibold text-sm rounded-lg transition ${tipo === 'despesa' ? 'bg-red-500 text-white shadow' : 'text-gray-500'}`}
                  onClick={() => setTipo('despesa')}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 font-semibold text-sm rounded-lg transition ${tipo === 'receita' ? 'bg-emerald-500 text-white shadow' : 'text-gray-500'}`}
                  onClick={() => setTipo('receita')}
                >
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">VALOR TOTAL (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full text-2xl font-bold p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">DESCRIÇÃO</label>
                <input
                  type="text"
                  placeholder="Ex: Salário, Supermercado, TV Nova..."
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">CATEGORIA</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="Alimentação">Alimentação</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Salário">Salário</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">RESPONSÁVEL</label>
                  <select
                    value={pagoPor}
                    onChange={(e) => setPagoPor(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="Eduardo">Eduardo</option>
                    <option value="Esposa">Esposa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">MODALIDADE / PAGAMENTO</label>
                <select
                  value={modalidade}
                  onChange={(e) => setModalidade(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                >
                  <option value="avista">Pontual / À vista</option>
                  <option value="fixo">Fixo Mensal (Recorrente)</option>
                  <option value="parcelado">Parcelado (Cartão/Carnê)</option>
                </select>
              </div>

              {modalidade === 'parcelado' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">NÚMERO DE PARCELAS</label>
                  <input
                    type="number"
                    min="2"
                    max="48"
                    value={parcelasTotal}
                    onChange={(e) => setParcelasTotal(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">O valor total será divido e lançado automaticamente nos próximos meses.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md mt-2"
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
