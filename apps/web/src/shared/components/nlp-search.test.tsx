import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NlpSearch } from './nlp-search';

describe('NlpSearch', () => {
  const baseProps = {
    onSearchCompleted: jest.fn(),
    isSearching: false,
    setIsSearching: jest.fn(),
  };

  it('muestra el total de titulados recibido por props', () => {
    render(<NlpSearch {...baseProps} totalCandidates={8} />);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('TITULADOS')).toBeInTheDocument();
  });

  it('muestra 0 cuando no hay candidatos cargados', () => {
    render(<NlpSearch {...baseProps} totalCandidates={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('no busca cuando la vista no provee una búsqueda', () => {
    const setIsSearching = jest.fn();
    const onSearchCompleted = jest.fn();
    render(
      <NlpSearch
        onSearchCompleted={onSearchCompleted}
        isSearching={false}
        setIsSearching={setIsSearching}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(setIsSearching).not.toHaveBeenCalled();
    expect(onSearchCompleted).not.toHaveBeenCalled();
  });

  it('delega la búsqueda en la función provista por la vista', async () => {
    const setIsSearching = jest.fn();
    const onSearchCompleted = jest.fn();
    const searchCandidates = jest.fn(() => []);

    render(
      <NlpSearch
        onSearchCompleted={onSearchCompleted}
        isSearching={false}
        setIsSearching={setIsSearching}
        searchCandidates={searchCandidates}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(searchCandidates).toHaveBeenCalledWith(
      'Senior Full Stack, Cloud & Microservicios',
    );
    await waitFor(() =>
      expect(onSearchCompleted).toHaveBeenCalledWith(
        [],
        'Senior Full Stack, Cloud & Microservicios',
      ),
    );
  });
});