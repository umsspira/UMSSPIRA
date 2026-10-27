import React from 'react';
import type { AffinityKeywordContribution } from '@umsspira/shared-types';

// TODO: Mañana conectaremos esto a las props reales (AffinityAreaScore)
export const InfluentialKeywords = () => {
  // Datos simulados temporales para ver el diseño hoy
  const mockTopKeywords: AffinityKeywordContribution[] = [
    { keyword: 'react', weight: 5, frequency: 2, points: 10, percentage: 25 },
    { keyword: 'node.js', weight: 5, frequency: 1, points: 5, percentage: 12.5 },
    { keyword: 'typescript', weight: 4, frequency: 3, points: 12, percentage: 30 }
  ];

  // Si no hay palabras clave, mostramos el mensaje amigable según el requerimiento
  if (mockTopKeywords.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
        No se encontraron palabras clave para esta área. Sigue completando tu perfil.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mt-4">
      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
        Palabras clave más influyentes
      </h3>
      <ul className="flex flex-col gap-2">
        {mockTopKeywords.map((kw, index) => (
          <li key={index} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-md shadow-sm">
            <span className="font-medium text-gray-700 capitalize">{kw.keyword}</span>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Freq: {kw.frequency}</span>
              <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {kw.percentage.toFixed(0)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};