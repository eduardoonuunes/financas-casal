'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [lancamentos, setLancamentos] = useState([])
  const [aba, setAba] = useState('dashboard')

  const [tipo, setTipo] = useState('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState('Geral')
  const [modalidade, setModalidade] = useState('avista')
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

    const novo = {
      descricao,
      valor: parseFloat(valor),
      tipo,
      categoria,
      e_recorrente: modalidade === 'fixo',
      e_parcelado: modalidade === 'parcelado',
      pago_por: pagoPor,
      data: new Date().toISOString().split('T')[0]
    }

    const { error } = await supabase.from('financas').insert([novo])

    if (!error) {
      setDescricao('')
      setValor('')
      carregarLancamentos()
      setAba('dashboard')
    } else {
      alert('Erro ao salvar: ' + error.message)
    }
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

  const receitas = lancamentos.filter(l => l.tipo === 'receita').reduce((acc, curr) => acc + Number(curr.valor), 0)
  const despesas = lancamentos.filter(l => l.tipo === 'despesa').reduce((acc, curr) => acc + Number(curr.valor), 0)
  const saldo = receitas - despesas

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 pb-12">
      <header className="bg-indigo-600 text-white p-4 shadow-md mb-6">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Finanças do Casal</h1>
          <div className="space-x-2">
            <button
              onClick={() => setAba('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${aba === 'dashboard' ? 'bg-white text-indigo-600' : 'bg-indigo-700 text-white'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setAba('novo')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${aba === 'novo' ? 'bg-white text-indigo-600' : 'bg-indigo-700 text-white'}`}
            >
              + Lançar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4">
        {aba === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center">
                <span className="text-xs font-bold text-emerald-600 uppercase">Entradas</span>
                <p className="text-lg font-extrabold text-emerald-700 mt-1">R$ {receitas.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded-2xl text-center">
                <span className="text-xs font-bold text-red-600 uppercase">Saídas</span>
                <p className="text-lg font-extrabold text-red-700 mt-1">R$ {despesas.toFixed(2)}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl text-center">
                <span className="text-xs font-bold text-indigo-600 uppercase">Saldo</span>
                <p className={`text-lg font-extrabold mt-1 ${saldo >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                  R$ {saldo.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-700 mb-3">Lançamentos Recentes</h2>
              {lancamentos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum lançamento cadastrado.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {lancamentos.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{item.descricao}</p>
                        <span className="text-xs text-gray-400">
                          {item.pago_por} • {item.e_recorrente ? 'Recorrente / Fixo' : 'Pontual'}
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
            <h2 className="text-lg font-bold mb-4 text-gray-800">Novo Lançamento Rápido</h2>
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
                <label className="block text-xs font-bold text-gray-500 mb-1">VALOR (R$)</label>
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
                  placeholder="Ex: Salário, Mercado, Combustível..."
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">TIPO</label>
                  <select
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="avista">Pontual / À vista</option>
                    <option value="fixo">Recorrente (Salário/Fixo)</option>
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
