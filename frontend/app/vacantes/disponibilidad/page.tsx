// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';

export default function DisponibilidadVacantesPage() {
  const [dataApi, setDataApi] = useState<any>({ vacantes: [], total: 0 });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/vacantes/disponibilidad')
      .then((res) => res.json())
      .then((data) => {
        setDataApi(data);
        setCargando(false);
      })
      .catch((err) => {
        console.error(err);
        setCargando(false);
      });
  }, []);

  if (cargando) return <div style={{ padding: '20px' }}>Cargando...</div>;

  const vacantes = dataApi.vacantes || [];
  const total = dataApi.total || 0;
  const disponibles = vacantes.filter((v: any) => 
    String(v.estado || '').toLowerCase().includes('disponible')
  ).length;
  const noDisponibles = vacantes.length - disponibles;

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f9f8f6', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Disponibilidad de vacantes</h1>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px' }}>
          <h3>{total}</h3>
          <p>Registradas</p>
        </div>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px' }}>
          <h3 style={{ color: 'green' }}>{disponibles}</h3>
          <p>Disponibles</p>
        </div>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px' }}>
          <h3 style={{ color: 'red' }}>{noDisponibles}</h3>
          <p>No disponibles</p>
        </div>
      </div>

      <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse', borderRadius: '8px' }}>
        <thead>
          <tr style={{ background: '#eee', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Título</th>
            <th style={{ padding: '10px' }}>Empresa</th>
            <th style={{ padding: '10px' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {vacantes.map((v: any, index: number) => (
            <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>{v.titulo}</td>
              <td style={{ padding: '10px' }}>{v.empresa}</td>
              <td style={{ padding: '10px' }}>{v.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}