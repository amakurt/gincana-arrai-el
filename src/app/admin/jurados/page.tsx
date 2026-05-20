"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function JuradosPage() {
  const { data, mutate, error } = useSWR("/api/state", fetcher, { refreshInterval: 2000 });
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);

  const addJurado = async () => {
    if (!newName) return;
    setLoading(true);
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateState",
        jurados: [...(data?.jurados || []), { id: `j${Date.now()}`, name: newName, pin: newPin }]
      })
    });
    setNewName("");
    setNewPin("");
    mutate();
    setLoading(false);
  };

  const removeJurado = async (id) => {
    if (!data?.jurados) return;
    setLoading(true);
    const remaining = data.jurados.filter((j) => j.id !== id);
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateState", jurados: remaining })
    });
    mutate();
    setLoading(false);
  };

  if (error) return <div className="p-8 text-center text-red-500">Erro ao carregar jurados.</div>;
  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin h-8 w-8 text-orange-500" />
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-orange-600">Gerenciamento de Jurados</h1>
      {/* Formulário de criação */}
      <div className="mb-8 p-4 border border-orange-300 bg-orange-50 rounded">
        <h2 className="text-xl font-semibold mb-4 text-orange-700">Adicionar novo jurado</h2>
        <input
          placeholder="Nome do jurado"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full p-2 mb-2 border rounded"
        />
        <input
          placeholder="PIN (opcional)"
          value={newPin}
          maxLength={4}
          onChange={(e) => setNewPin(e.target.value)}
          className="w-full p-2 mb-2 border rounded"
        />
        <button
          disabled={loading || !newName}
          onClick={addJurado}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded"
        >
          {loading ? "Salvando..." : "Adicionar jurado"}
        </button>
      </div>

      {/* Lista de jurados */}
      <div className="grid gap-4">
        {data.jurados?.map((j) => (
          <div key={j.id} className="flex items-center justify-between p-4 border border-orange-200 bg-white rounded">
            <div>
              <p className="font-medium text-gray-800">{j.name}</p>
              {j.pin && <p className="text-sm text-gray-500">PIN: {j.pin}</p>}
            </div>
            <button
              onClick={() => removeJurado(j.id)}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              Remover
            </button>
          </div>
        ))}
        {(!data.jurados || data.jurados.length === 0) && (
          <p className="text-center text-gray-500">Nenhum jurado cadastrado.</p>
        )}
      </div>
    </div>
  );
}
